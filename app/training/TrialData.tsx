"use client";

import { useTransition } from "react";
import { deleteTrial } from "./actions";
import type { Trial } from "../../lib/types";

type Group = { front: number; stop: number; draw: number; n: number; mean: number; sd: number; min: number; max: number };

function summarize(trials: Trial[]): Group[] {
  const groups = new Map<string, number[]>();
  for (const t of trials) {
    const key = `${t.front_pin}|${t.stop_pin}|${t.draw_angle}`;
    const list = groups.get(key) ?? [];
    list.push(Number(t.distance_in));
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([key, xs]) => {
      const [front, stop, draw] = key.split("|").map(Number);
      const n = xs.length;
      const mean = xs.reduce((a, b) => a + b, 0) / n;
      const sd = n > 1 ? Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1)) : NaN;
      return { front, stop, draw, n, mean, sd, min: Math.min(...xs), max: Math.max(...xs) };
    })
    .sort((a, b) => a.front - b.front || a.stop - b.stop || a.draw - b.draw);
}

function downloadCsv(trials: Trial[]) {
  const cols: (keyof Trial)[] = ["id", "created_at", "session", "shooter", "draw_angle", "front_pin", "stop_pin", "distance_in", "surface", "notes"];
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(","), ...trials.map((t) => cols.map((c) => esc(t[c])).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `catapult-trials-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TrialData({ trials }: { trials: Trial[] }) {
  const [pending, startTransition] = useTransition();
  const groups = summarize(trials);

  function onDelete(t: Trial) {
    if (!confirm(`Delete shot #${t.id} (${t.distance_in}″)?`)) return;
    startTransition(async () => {
      const res = await deleteTrial(t.id);
      if (res.error) alert(res.error);
    });
  }

  return (
    <>
      <section className="card">
        <div className="row between">
          <h2>Summary by setting</h2>
          <button type="button" className="secondary" onClick={() => downloadCsv(trials)} disabled={!trials.length}>
            Export CSV
          </button>
        </div>
        <p className="muted small">
          Mean and shot-to-shot standard deviation for each configuration. The SD estimates the machine&apos;s
          inherent variability.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Front</th>
                <th>Stop</th>
                <th>Draw °</th>
                <th>n</th>
                <th>Mean ″</th>
                <th>SD ″</th>
                <th>Min ″</th>
                <th>Max ″</th>
              </tr>
            </thead>
            <tbody>
              {groups.length ? (
                groups.map((g) => (
                  <tr key={`${g.front}-${g.stop}-${g.draw}`}>
                    <td>{g.front}</td>
                    <td>{g.stop}</td>
                    <td>{g.draw}</td>
                    <td>{g.n}</td>
                    <td>{g.mean.toFixed(2)}</td>
                    <td>{Number.isNaN(g.sd) ? "—" : g.sd.toFixed(2)}</td>
                    <td>{g.min.toFixed(2)}</td>
                    <td>{g.max.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="muted">No trials logged yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>All shots ({trials.length})</h2>
        <div className="table-wrap tall">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>When</th>
                <th>Session</th>
                <th>Shooter</th>
                <th>Draw °</th>
                <th>Front</th>
                <th>Stop</th>
                <th>Distance ″</th>
                <th>Surface</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trials.map((t) => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td className="nowrap" suppressHydrationWarning>
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td>{t.session ?? ""}</td>
                  <td>{t.shooter ?? ""}</td>
                  <td>{t.draw_angle}</td>
                  <td>{t.front_pin}</td>
                  <td>{t.stop_pin}</td>
                  <td>{Number(t.distance_in).toFixed(3)}</td>
                  <td>{t.surface}</td>
                  <td>{t.notes ?? ""}</td>
                  <td>
                    <button type="button" className="link danger" onClick={() => onDelete(t)} disabled={pending}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
