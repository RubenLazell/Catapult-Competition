// Recommends the next trial shot for efficient data collection.
//
// Phases, in order:
//   1. screen       – shoot every pin combination at both ends of the draw range to learn what distances it covers.
//   2. characterize – pick a small set of combinations that covers 80–130″ twice over (widest coverage, least scatter),
//                     then fill in their draw levels predicted to land near the window (first pass, space-filling).
//   3. replicate    – bring those settings up to the target shot count; add shots where σ looks unusually high.
// Ties are broken by a seeded shuffle, so run order is randomized but every teammate sees the same suggestion.

import type { DesignSpace } from "./design";
import type { Trial } from "./types";

export const WINDOW_MIN = 80;
export const WINDOW_MAX = 130;
const MARGIN = 10; // plan for a little beyond the competition window

export type Phase = "screen" | "characterize" | "replicate" | "done";

export type Suggestion = {
  front: number;
  stop: number;
  draw: number;
  shots: number;
  n: number; // shots already logged at this setting
  predicted: number | null;
  reason: string;
};

export type ComboStatus = {
  front: number;
  stop: number;
  screened: boolean;
  shots: number;
  range: [number, number] | null; // fitted distance at draw min / max
  role: "unscreened" | "selected" | "spare" | "out";
};

export type Plan = {
  phase: Phase;
  suggestions: Suggestion[];
  combos: ComboStatus[];
  pointsDone: number;
  pointsTotal: number;
  uncovered: [number, number] | null; // part of the window no screened combination reaches
  message?: string;
};

type Point = { draw: number; xs: number[]; predicted: number | null };
type Fit = { slope: number; intercept: number };

export function drawLevels(d: DesignSpace): number[] {
  const levels: number[] = [];
  for (let x = d.drawMin; x <= d.drawMax + 1e-9; x += d.drawStep) levels.push(Math.round(x * 1000) / 1000);
  return levels;
}

function fitLine(pairs: [number, number][]): Fit | null {
  if (new Set(pairs.map((p) => p[0])).size < 2) return null;
  const n = pairs.length;
  const mx = pairs.reduce((a, p) => a + p[0], 0) / n;
  const my = pairs.reduce((a, p) => a + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
  }
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx };
}

function sd(xs: number[]): number {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inWindow = (y: number | null) => y === null || (y >= WINDOW_MIN - MARGIN && y <= WINDOW_MAX + MARGIN);
const fmt = (y: number) => `${y.toFixed(1)}″`;

export function planNextShot(trials: Trial[], design: DesignSpace, seed: number): Plan {
  const levels = drawLevels(design);
  const half = design.drawStep / 2 + 1e-9;
  const firstPass = Math.min(3, design.targetReps);
  const random = rng(seed);

  const combos = design.frontPins.flatMap((front) =>
    design.stopPins.map((stop) => {
      const ts = trials.filter((t) => t.surface === "hard" && t.front_pin === front && t.stop_pin === stop);
      const fit = fitLine(ts.map((t) => [Number(t.draw_angle), Number(t.distance_in)]));
      const at = (x: number) => (fit ? fit.intercept + fit.slope * x : null);
      const points: Point[] = levels.map((draw) => ({
        draw,
        xs: ts.filter((t) => Math.abs(Number(t.draw_angle) - draw) <= half).map((t) => Number(t.distance_in)),
        predicted: at(draw),
      }));
      const ends = [points[0], points[points.length - 1]];
      const screened = ends.every((p) => p.xs.length >= design.screenReps);
      const range: [number, number] | null = fit ? [at(design.drawMin)!, at(design.drawMax)!] : null;
      const lo = range ? Math.min(...range) : 0;
      const hi = range ? Math.max(...range) : 0;
      const relevant = screened && range ? hi >= WINDOW_MIN - MARGIN && lo <= WINDOW_MAX + MARGIN : false;
      const endSds = ends.filter((p) => p.xs.length >= 2).map((p) => sd(p.xs));
      const scatter = endSds.length ? Math.max(...endSds) : 0;
      return { front, stop, points, ends, screened, range, lo, hi, relevant, scatter, selected: false, shots: ts.length };
    }),
  );

  // Greedy cover: each whole inch of the window should be reachable by two selected combinations,
  // so there is a backup on competition day. Prefer the most new coverage, then the least scatter.
  const need = new Map<number, number>();
  for (let x = WINDOW_MIN; x <= WINDOW_MAX; x++) need.set(x, 2);
  const covers = (c: { lo: number; hi: number }, x: number) => x >= c.lo && x <= c.hi;
  for (;;) {
    let best: (typeof combos)[number] | null = null;
    let bestGain = 0;
    for (const c of combos) {
      if (!c.relevant || c.selected) continue;
      let gain = 0;
      for (const [x, k] of need) if (k > 0 && covers(c, x)) gain++;
      // Stick with combinations we've already invested beyond screening in, so small shifts in the fit don't
      // make the plan jump around.
      if (gain > 0 && c.shots > 2 * design.screenReps) gain += 10;
      if (gain > bestGain || (gain === bestGain && gain > 0 && best && c.scatter < best.scatter)) {
        best = c;
        bestGain = gain;
      }
    }
    if (!best) break;
    best.selected = true;
    for (const [x, k] of need) if (k > 0 && covers(best, x)) need.set(x, k - 1);
  }
  const reachable = [...need.keys()].filter((x) => combos.some((c) => c.relevant && covers(c, x)));
  const missing = [...need.keys()].filter((x) => !reachable.includes(x));
  const allScreened = combos.every((c) => c.screened);
  const uncovered: [number, number] | null =
    allScreened && missing.length ? [Math.min(...missing), Math.max(...missing)] : null;

  const status: ComboStatus[] = combos.map(({ front, stop, screened, range, relevant, selected, shots }) => ({
    front,
    stop,
    screened,
    range,
    role: !screened ? "unscreened" : selected ? "selected" : relevant ? "spare" : "out",
    shots,
  }));

  // Ordering: fewest shots first, then by the given priority, then random.
  const order = (items: (Suggestion & { priority: number })[]): Suggestion[] =>
    items
      .map((s) => ({ s, r: random() }))
      .sort((a, b) => a.s.n - b.s.n || b.s.priority - a.s.priority || a.r - b.r)
      .map(({ s: { priority: _p, ...rest } }) => rest);

  const useful = combos.filter((c) => c.selected).flatMap((c) => c.points.filter((p) => inWindow(p.predicted)).map((p) => ({ c, p })));
  const pointsDone = useful.filter(({ p }) => p.xs.length >= design.targetReps).length;
  const base = { combos: status, pointsDone, pointsTotal: useful.length, uncovered };

  // 1. Screening
  const screen = combos.flatMap((c) =>
    c.ends
      .filter((p) => p.xs.length < design.screenReps)
      .map((p) => ({
        front: c.front,
        stop: c.stop,
        draw: p.draw,
        shots: design.screenReps - p.xs.length,
        n: p.xs.length,
        predicted: p.predicted,
        priority: 0,
        reason: `Screening pins ${c.front}/${c.stop}: shoot at the ${p.draw === design.drawMin ? "lowest" : "highest"} draw angle to find the range of distances this combination covers.`,
      })),
  );
  if (screen.length) return { ...base, phase: "screen", suggestions: order(screen) };

  if (!combos.some((c) => c.relevant)) {
    return {
      ...base,
      phase: "done",
      suggestions: [],
      message: `No pin combination reaches ${WINDOW_MIN}–${WINDOW_MAX}″ on a hard floor. Widen the draw range or add pin positions in the design space.`,
    };
  }

  // 2. Characterize: first pass over useful draw levels, spreading out across the curve.
  const characterize = useful
    .filter(({ p }) => p.xs.length < firstPass)
    .map(({ c, p }) => {
      const tested = c.points.filter((q) => q.xs.length > 0).map((q) => Math.abs(q.draw - p.draw));
      const gap = tested.length ? Math.min(...tested) : Infinity;
      return {
        front: c.front,
        stop: c.stop,
        draw: p.draw,
        shots: firstPass - p.xs.length,
        n: p.xs.length,
        predicted: p.predicted,
        priority: gap,
        reason: `Fill in the draw-distance curve for pins ${c.front}/${c.stop}${p.predicted !== null ? `. Current data predicts ≈ ${fmt(p.predicted)}` : ""}.`,
      };
    });
  if (characterize.length) return { ...base, phase: "characterize", suggestions: order(characterize) };

  // 3. Replicate up to the target, then extra shots where variation looks high.
  const replicate = useful
    .filter(({ p }) => p.xs.length < design.targetReps)
    .map(({ c, p }) => ({
      front: c.front,
      stop: c.stop,
      draw: p.draw,
      shots: design.targetReps - p.xs.length,
      n: p.xs.length,
      predicted: p.predicted,
      priority: 0,
      reason: `Add replicates so shot-to-shot σ at this setting is estimated reliably (${p.xs.length}/${design.targetReps} shots so far).`,
    }));
  if (replicate.length) return { ...base, phase: "replicate", suggestions: order(replicate) };

  const sds = useful.filter(({ p }) => p.xs.length >= 2).map(({ p }) => sd(p.xs));
  const pooled = Math.sqrt(sds.reduce((a, s) => a + s * s, 0) / (sds.length || 1));
  const noisy = useful
    .filter(({ p }) => p.xs.length < design.targetReps * 2 && sd(p.xs) > 1.5 * pooled)
    .map(({ c, p }) => ({
      front: c.front,
      stop: c.stop,
      draw: p.draw,
      shots: Math.min(3, design.targetReps * 2 - p.xs.length),
      n: p.xs.length,
      predicted: p.predicted,
      priority: sd(p.xs),
      reason: `This setting is noisier than average (σ ${fmt(sd(p.xs))} vs pooled ${fmt(pooled)}). More shots will show whether that's real or a fluke.`,
    }));
  if (noisy.length) return { ...base, phase: "replicate", suggestions: order(noisy) };

  return {
    ...base,
    phase: "done",
    suggestions: [],
    message: "Data collection plan complete. Ready to fit the regression model. Keep shooting random settings to check the model.",
  };
}
