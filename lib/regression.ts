// Ordinary least squares via modified Gram–Schmidt QR.
// Columns that are (numerically) linear combinations of earlier ones are dropped rather than failing,
// so the fit degrades gracefully when the data can't support every term yet.

export type OLSFit = {
  names: string[];
  beta: number[]; // one per candidate column; 0 for dropped columns
  kept: number[]; // indices of estimable columns
  dropped: string[];
  rCols: number[][]; // columns of the upper-triangular R (kept × kept)
  n: number;
  p: number;
  dfResid: number;
  sse: number;
  sigma: number; // residual standard error
  r2: number;
  adjR2: number;
  residuals: number[];
};

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const norm = (a: number[]) => Math.sqrt(dot(a, a));

export function fitOLS(X: number[][], y: number[], names: string[]): OLSFit | null {
  const n = X.length;
  const Q: number[][] = [];
  const rCols: number[][] = [];
  const kept: number[] = [];
  const dropped: string[] = [];

  for (let j = 0; j < names.length; j++) {
    let v = X.map((row) => row[j]);
    const norm0 = norm(v);
    const r = new Array<number>(Q.length).fill(0);
    // Two passes of orthogonalization for numerical stability.
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < Q.length; k++) {
        const c = dot(Q[k], v);
        r[k] += c;
        v = v.map((x, i) => x - c * Q[k][i]);
      }
    }
    const nv = norm(v);
    if (norm0 === 0 || nv < 1e-9 * norm0) {
      dropped.push(names[j]);
      continue;
    }
    Q.push(v.map((x) => x / nv));
    rCols.push([...r, nv]);
    kept.push(j);
  }

  const p = kept.length;
  if (n <= p) return null;

  const qty = Q.map((q) => dot(q, y));
  const b = new Array<number>(p);
  for (let i = p - 1; i >= 0; i--) {
    let s = qty[i];
    for (let c = i + 1; c < p; c++) s -= rCols[c][i] * b[c];
    b[i] = s / rCols[i][i];
  }
  const beta = new Array<number>(names.length).fill(0);
  kept.forEach((j, i) => (beta[j] = b[i]));

  const residuals = X.map((row, i) => y[i] - dot(row, beta));
  const sse = dot(residuals, residuals);
  const mean = y.reduce((a, v) => a + v, 0) / n;
  const sst = y.reduce((a, v) => a + (v - mean) ** 2, 0);
  const dfResid = n - p;
  const r2 = sst > 0 ? 1 - sse / sst : 1;
  return {
    names,
    beta,
    kept,
    dropped,
    rCols,
    n,
    p,
    dfResid,
    sse,
    sigma: Math.sqrt(sse / dfResid),
    r2,
    adjR2: 1 - ((1 - r2) * (n - 1)) / dfResid,
    residuals,
  };
}

export function predictOLS(fit: OLSFit, x: number[]): number {
  return dot(x, fit.beta);
}

// x0ᵀ (XᵀX)⁻¹ x0 = ‖R⁻ᵀ x0‖². Multiply by σ² for the variance of the fitted mean at x0.
export function leverage(fit: OLSFit, x: number[]): number {
  const xk = fit.kept.map((j) => x[j]);
  const z = new Array<number>(xk.length);
  for (let i = 0; i < xk.length; i++) {
    let s = xk[i];
    for (let k = 0; k < i; k++) s -= fit.rCols[i][k] * z[k];
    z[i] = s / fit.rCols[i][i];
  }
  return dot(z, z);
}
