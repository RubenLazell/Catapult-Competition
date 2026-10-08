// The experimental region the next-shot recommender plans over. Shared by the team (stored in the DB).

export type DesignSpace = {
  frontPins: number[];
  stopPins: number[];
  drawMin: number;
  drawMax: number;
  drawStep: number;
  screenReps: number; // shots at each end of the draw range when screening a pin combination
  targetReps: number; // shots wanted at every useful setting
};

export const DEFAULT_DESIGN: DesignSpace = {
  frontPins: [1, 2, 3, 4],
  stopPins: [1, 2, 3, 4],
  drawMin: 140,
  drawMax: 180,
  drawStep: 10,
  screenReps: 2,
  targetReps: 5,
};

function pinList(v: unknown, fallback: number[]): number[] {
  const list = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[\s,]+/) : null;
  if (!list) return fallback;
  const pins = [...new Set(list.map(Number).filter((n) => Number.isInteger(n) && n >= 1))].sort((a, b) => a - b);
  return pins.length ? pins : fallback;
}

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return v !== "" && v !== null && v !== undefined && Number.isFinite(n) ? n : fallback;
}

// Fill missing/invalid fields from the defaults.
export function normalizeDesign(raw: unknown): DesignSpace {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    frontPins: pinList(r.frontPins, DEFAULT_DESIGN.frontPins),
    stopPins: pinList(r.stopPins, DEFAULT_DESIGN.stopPins),
    drawMin: num(r.drawMin, DEFAULT_DESIGN.drawMin),
    drawMax: num(r.drawMax, DEFAULT_DESIGN.drawMax),
    drawStep: num(r.drawStep, DEFAULT_DESIGN.drawStep),
    screenReps: Math.round(num(r.screenReps, DEFAULT_DESIGN.screenReps)),
    targetReps: Math.round(num(r.targetReps, DEFAULT_DESIGN.targetReps)),
  };
}

export function validateDesign(d: DesignSpace): string | null {
  if (d.drawMin <= 0 || d.drawMax <= d.drawMin) return "Draw max must be greater than draw min.";
  if (d.drawStep <= 0 || d.drawStep > d.drawMax - d.drawMin) return "Draw step must be positive and no larger than the draw range.";
  if ((d.drawMax - d.drawMin) / d.drawStep > 40) return "Too many draw levels; use a larger step.";
  if (d.screenReps < 1 || d.screenReps > 10) return "Screening shots must be between 1 and 10.";
  if (d.targetReps < 2 || d.targetReps > 20) return "Target shots per setting must be between 2 and 20.";
  return null;
}
