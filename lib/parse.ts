// Parses shot distances like "97", "97.375", "97 3/8", "97-3/8".
// Separated by newlines, commas or semicolons.
const MIXED = /^(\d+(?:\.\d+)?)(?:[\s-]+(\d+)\/(\d+))?$/;

export function parseDistance(token: string): number | null {
  const m = token.trim().match(MIXED);
  if (!m) return null;
  let value = Number(m[1]);
  if (m[2] && m[3]) {
    const den = Number(m[3]);
    if (den === 0) return null;
    value += Number(m[2]) / den;
  }
  return Number.isFinite(value) ? value : null;
}

export function parseDistances(text: string): { values: number[]; bad: string[] } {
  const values: number[] = [];
  const bad: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const token = raw.trim();
    if (!token) continue;
    const v = parseDistance(token);
    if (v === null) bad.push(token);
    else values.push(v);
  }
  return { values, bad };
}

export function formatInches(v: number): string {
  return `${v.toFixed(2)}″`;
}
