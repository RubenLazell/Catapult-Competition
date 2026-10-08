// Regression model of the catapult, refit from the logged trials on demand.
//
//   Distance = β₀ + β₁·D + β₂·D² + Σ γ·Front_f + Σ δ·Stop_s + Σ λ·(D × Front_f) + Σ μ·(D × Stop_s) + ε
//
// D is the draw angle centred on its mean. Pins are dummy-coded against the lowest pin seen in the data.
// predictSettings() back-solves for D on every pin combination that has been tested, staying inside the
// draw range actually shot with that combination, and ranks the options by expected error.

import { fitOLS, leverage, predictOLS, type OLSFit } from "./regression";
import type { Trial } from "./types";

export const TARGET_MIN = 80;
export const TARGET_MAX = 130;

const MIN_SHOTS = 8;
const MIN_COMBO_SHOTS = 3;
const EXTRAPOLATE_DEG = 5; // how far past a combination's tested draw range we'll go if nothing else works

export type Recommendation = {
  frontPin: number;
  stopPin: number;
  drawAngle: number;
  predicted: number;
  sigma: number; // expected error of a single shot: shot scatter plus model uncertainty (inches)
  extrapolated: boolean;
  shots: number; // shots logged with this pin combination
  tested: [number, number]; // draw range tested with this combination
};

export type FitSummary = {
  n: number;
  p: number;
  r2: number;
  adjR2: number;
  sigma: number;
  pureError: number | null;
};

export type Prediction =
  | { status: "untrained"; target: number; reason: string }
  | { status: "no_solution"; target: number; reason: string; fit: FitSummary }
  | { status: "ok"; target: number; options: Recommendation[]; fit: FitSummary };

export type ComboFit = {
  front: number;
  stop: number;
  shots: number;
  drawLo: number;
  drawHi: number;
  sigma: number; // shot-to-shot σ from replicates, or residual σ when there are none
  fromReplicates: boolean;
};

export type FittedModel = {
  fit: OLSFit;
  center: number;
  baseFront: number;
  baseStop: number;
  row: (front: number, stop: number, draw: number) => number[];
  combos: ComboFit[];
  pureError: number | null;
  summary: FitSummary;
};

export type ModelResult = { ok: true; model: FittedModel } | { ok: false; reason: string; n: number };

// Pooled within-group SD over groups of identical settings.
function pooledSd(groups: number[][]): { sd: number; df: number } | null {
  let ss = 0;
  let df = 0;
  for (const xs of groups) {
    if (xs.length < 2) continue;
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    ss += xs.reduce((a, x) => a + (x - m) ** 2, 0);
    df += xs.length - 1;
  }
  return df > 0 ? { sd: Math.sqrt(ss / df), df } : null;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const t of items) {
    const k = key(t);
    const list = m.get(k) ?? [];
    list.push(t);
    m.set(k, list);
  }
  return m;
}

export function fitModel(trials: Trial[]): ModelResult {
  const data = trials
    .filter((t) => t.surface === "hard")
    .map((t) => ({ front: t.front_pin, stop: t.stop_pin, draw: Number(t.draw_angle), y: Number(t.distance_in) }));
  if (data.length < MIN_SHOTS) {
    return { ok: false, n: data.length, reason: `Need at least ${MIN_SHOTS} hard-floor shots to fit the model (have ${data.length}).` };
  }
  if (new Set(data.map((d) => d.draw)).size < 2) {
    return { ok: false, n: data.length, reason: "Need shots at two or more different draw angles to fit the model." };
  }

  const fronts = [...new Set(data.map((d) => d.front))].sort((a, b) => a - b);
  const stops = [...new Set(data.map((d) => d.stop))].sort((a, b) => a - b);
  const [baseFront, ...otherFronts] = fronts;
  const [baseStop, ...otherStops] = stops;
  const center = data.reduce((a, d) => a + d.draw, 0) / data.length;

  const names = [
    "Intercept",
    "Draw",
    "Draw²",
    ...otherFronts.map((f) => `Front ${f}`),
    ...otherStops.map((s) => `Stop ${s}`),
    ...otherFronts.map((f) => `Draw × Front ${f}`),
    ...otherStops.map((s) => `Draw × Stop ${s}`),
  ];
  const row = (front: number, stop: number, draw: number) => {
    const d = draw - center;
    return [
      1,
      d,
      d * d,
      ...otherFronts.map((f) => (front === f ? 1 : 0)),
      ...otherStops.map((s) => (stop === s ? 1 : 0)),
      ...otherFronts.map((f) => (front === f ? d : 0)),
      ...otherStops.map((s) => (stop === s ? d : 0)),
    ];
  };

  const fit = fitOLS(
    data.map((d) => row(d.front, d.stop, d.draw)),
    data.map((d) => d.y),
    names,
  );
  if (!fit || fit.dfResid < 3) {
    return { ok: false, n: data.length, reason: `Not enough shots to estimate the model yet (have ${data.length}). Keep logging.` };
  }

  const settingGroups = groupBy(data, (d) => `${d.front}|${d.stop}|${d.draw}`);
  const pure = pooledSd([...settingGroups.values()].map((g) => g.map((d) => d.y)));

  const combos: ComboFit[] = [...groupBy(data, (d) => `${d.front}|${d.stop}`).values()].map((g) => {
    const draws = g.map((d) => d.draw);
    const reps = pooledSd([...groupBy(g, (d) => String(d.draw)).values()].map((s) => s.map((d) => d.y)));
    return {
      front: g[0].front,
      stop: g[0].stop,
      shots: g.length,
      drawLo: Math.min(...draws),
      drawHi: Math.max(...draws),
      // Require a few degrees of freedom before trusting a combination's own scatter.
      sigma: reps && reps.df >= 3 ? reps.sd : fit.sigma,
      fromReplicates: !!reps && reps.df >= 3,
    };
  });
  combos.sort((a, b) => a.front - b.front || a.stop - b.stop);

  return {
    ok: true,
    model: {
      fit,
      center,
      baseFront,
      baseStop,
      row,
      combos,
      pureError: pure ? pure.sd : null,
      summary: { n: fit.n, p: fit.p, r2: fit.r2, adjR2: fit.adjR2, sigma: fit.sigma, pureError: pure ? pure.sd : null },
    },
  };
}

export function predictDistance(model: FittedModel, front: number, stop: number, draw: number): number {
  return predictOLS(model.fit, model.row(front, stop, draw));
}

// All draw angles in [lo, hi] where the fitted curve hits the target.
function solveDraw(f: (draw: number) => number, lo: number, hi: number): number[] {
  const steps = 400;
  const roots: number[] = [];
  let x0 = lo;
  let f0 = f(lo);
  if (f0 === 0) roots.push(lo);
  for (let i = 1; i <= steps; i++) {
    const x1 = lo + ((hi - lo) * i) / steps;
    const f1 = f(x1);
    if (f1 === 0) roots.push(x1);
    else if (f0 * f1 < 0) {
      let a = x0;
      let b = x1;
      let fa = f0;
      for (let k = 0; k < 50; k++) {
        const m = (a + b) / 2;
        const fm = f(m);
        if (fa * fm <= 0) b = m;
        else {
          a = m;
          fa = fm;
        }
      }
      roots.push((a + b) / 2);
    }
    x0 = x1;
    f0 = f1;
  }
  return roots;
}

export function predictSettings(model: FittedModel, target: number): Prediction {
  const options: Recommendation[] = [];
  let reachLo = Infinity;
  let reachHi = -Infinity;

  for (const c of model.combos) {
    if (c.shots < MIN_COMBO_SHOTS || c.drawHi <= c.drawLo) continue;
    const g = (draw: number) => predictDistance(model, c.front, c.stop, draw) - target;
    for (const x of [c.drawLo, c.drawHi]) {
      const y = g(x) + target;
      reachLo = Math.min(reachLo, y);
      reachHi = Math.max(reachHi, y);
    }

    let roots = solveDraw(g, c.drawLo, c.drawHi);
    let extrapolated = false;
    if (!roots.length) {
      roots = solveDraw(g, c.drawLo - EXTRAPOLATE_DEG, c.drawHi + EXTRAPOLATE_DEG);
      extrapolated = roots.length > 0;
    }

    const candidates = roots.map((draw) => {
      const x = model.row(c.front, c.stop, draw);
      const modelVar = model.fit.sigma ** 2 * leverage(model.fit, x);
      return {
        frontPin: c.front,
        stopPin: c.stop,
        drawAngle: draw,
        predicted: predictOLS(model.fit, x),
        sigma: Math.sqrt(c.sigma ** 2 + modelVar),
        extrapolated,
        shots: c.shots,
        tested: [c.drawLo, c.drawHi] as [number, number],
      };
    });
    candidates.sort((a, b) => a.sigma - b.sigma);
    if (candidates[0]) options.push(candidates[0]);
  }

  options.sort((a, b) => Number(a.extrapolated) - Number(b.extrapolated) || a.sigma - b.sigma);

  if (!options.length) {
    const reason = Number.isFinite(reachLo)
      ? `No tested pin combination reaches ${target}″. Tested settings cover about ${reachLo.toFixed(0)}–${reachHi.toFixed(0)}″.`
      : `No pin combination has ${MIN_COMBO_SHOTS}+ shots across two or more draw angles yet.`;
    return { status: "no_solution", target, reason, fit: model.summary };
  }
  return { status: "ok", target, options, fit: model.summary };
}
