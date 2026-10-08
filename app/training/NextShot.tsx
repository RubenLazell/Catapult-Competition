"use client";

import { useState, useTransition } from "react";
import { updateDesign, type ActionResult } from "./actions";
import type { DesignSpace } from "../../lib/design";
import { planNextShot, WINDOW_MAX, WINDOW_MIN, type ComboStatus, type Phase, type Suggestion } from "../../lib/recommend";
import type { Trial } from "../../lib/types";

const ROLE_LABEL: Record<ComboStatus["role"], React.ReactNode> = {
  unscreened: <span className="muted">Not screened</span>,
  selected: <span className="success">Selected</span>,
  spare: <span className="muted">Spare (not needed)</span>,
  out: <span className="muted">Misses {WINDOW_MIN}–{WINDOW_MAX}″</span>,
};

const PHASE_LABEL: Record<Phase, string> = {
  screen: "1 · Screening",
  characterize: "2 · Characterizing",
  replicate: "3 · Replicating",
  done: "Complete",
};

export default function NextShot({
  trials,
  design,
  onUse,
}: {
  trials: Trial[];
  design: DesignSpace;
  onUse: (s: Suggestion) => void;
}) {
  // Seed on the shot count: the suggestion changes after each save, and every teammate sees the same one.
  const plan = planNextShot(trials, design, trials.length + 1);
  const [skip, setSkip] = useState(0);
  const count = plan.suggestions.length;
  const s = count ? plan.suggestions[skip % count] : null;

  return (
    <section className="card next-shot">
      <div className="row between">
        <h2>Next trial shot</h2>
        <span className="pill">{PHASE_LABEL[plan.phase]}</span>
      </div>

      {s ? (
        <>
          <div className="settings-grid four">
            <Setting label="Draw angle" value={`${s.draw}°`} />
            <Setting label="Front pin" value={String(s.front)} />
            <Setting label="Stop pin" value={String(s.stop)} />
            <Setting label="Shots" value={`× ${s.shots}`} />
          </div>
          <p>{s.reason}</p>
          <div className="row">
            <button type="button" onClick={() => onUse(s)}>
              Use these settings
            </button>
            {count > 1 && (
              <button type="button" className="secondary" onClick={() => setSkip(skip + 1)}>
                Suggest another ({(skip % count) + 1}/{count})
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="banner">{plan.message}</div>
      )}

      <p className="muted small">
        {plan.pointsTotal > 0
          ? `${plan.pointsDone}/${plan.pointsTotal} useful settings have ${design.targetReps}+ shots.`
          : `${plan.combos.filter((c) => c.screened).length}/${plan.combos.length} pin combinations screened.`}{" "}
        Only hard-floor shots count.
      </p>
      {plan.uncovered && (
        <p className="warn">
          No pin combination reaches {plan.uncovered[0]}–{plan.uncovered[1]}″. Consider widening the draw range or
          adding pin positions.
        </p>
      )}

      <details>
        <summary>Pin combinations</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Front</th>
                <th>Stop</th>
                <th>Shots</th>
                <th>Distance range</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {plan.combos.map((c) => (
                <tr key={`${c.front}-${c.stop}`}>
                  <td>{c.front}</td>
                  <td>{c.stop}</td>
                  <td>{c.shots}</td>
                  <td>
                    {c.range
                      ? `${Math.min(...c.range).toFixed(0)}–${Math.max(...c.range).toFixed(0)}″`
                      : "—"}
                  </td>
                  <td>{ROLE_LABEL[c.role]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <DesignEditor design={design} />

      <details>
        <summary>How suggestions work</summary>
        <ol className="small">
          <li>
            <strong>Screen:</strong> shoot each pin combination at the lowest and highest draw angle to find which
            combinations reach {WINDOW_MIN}–{WINDOW_MAX}″.
          </li>
          <li>
            <strong>Characterize:</strong> pick a few combinations that cover every distance in {WINDOW_MIN}–
            {WINDOW_MAX}″ twice over, so there&apos;s always a backup. Prefer the widest coverage and least scatter.
            Then fill in the draw angles that land near that range.
          </li>
          <li>
            <strong>Replicate:</strong> bring each of those settings up to {design.targetReps} shots so σ can be
            estimated, then add shots where variation looks unusually high.
          </li>
        </ol>
        <p className="muted small">The order within each phase is randomized, which is good experimental practice.</p>
      </details>
    </section>
  );
}

function DesignEditor({ design }: { design: DesignSpace }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => setResult(await updateDesign(fd)));
  }

  return (
    <details>
      <summary>Design space (shared with the team)</summary>
      <form onSubmit={onSubmit} className="design-form">
        <div className="form-grid">
          <label className="field">
            <span>Front pin holes</span>
            <input name="frontPins" defaultValue={design.frontPins.join(", ")} />
          </label>
          <label className="field">
            <span>Stop pin holes</span>
            <input name="stopPins" defaultValue={design.stopPins.join(", ")} />
          </label>
          <label className="field">
            <span>Draw min (°)</span>
            <input name="drawMin" type="number" step="any" defaultValue={design.drawMin} />
          </label>
          <label className="field">
            <span>Draw max (°)</span>
            <input name="drawMax" type="number" step="any" defaultValue={design.drawMax} />
          </label>
          <label className="field">
            <span>Draw step (°)</span>
            <input name="drawStep" type="number" step="any" defaultValue={design.drawStep} />
          </label>
          <label className="field">
            <span>Screening shots per end</span>
            <input name="screenReps" type="number" min={1} max={10} defaultValue={design.screenReps} />
          </label>
          <label className="field">
            <span>Target shots per setting</span>
            <input name="targetReps" type="number" min={2} max={20} defaultValue={design.targetReps} />
          </label>
        </div>
        <div className="row">
          <button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save design space"}
          </button>
          {result?.ok && <span className="success">{result.ok}</span>}
          {result?.error && <span className="error">{result.error}</span>}
        </div>
      </form>
    </details>
  );
}

function Setting({ label, value }: { label: string; value: string }) {
  return (
    <div className="setting">
      <div className="setting-label">{label}</div>
      <div className="setting-value">{value}</div>
    </div>
  );
}
