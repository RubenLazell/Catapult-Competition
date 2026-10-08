"use client";

import { useState } from "react";
import { predictSettings, TARGET_MAX, TARGET_MIN, type Prediction } from "../lib/model";

export default function PredictPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Prediction | null>(null);
  const [runs, setRuns] = useState(0);

  const target = Number(input);
  const valid = input.trim() !== "" && Number.isFinite(target) && target > 0;
  const outOfRange = valid && (target < TARGET_MIN || target > TARGET_MAX);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setResult(predictSettings(target));
    setRuns(runs + 1); // remount the result so it animates in again
  }

  return (
    <>
      <div className="eyebrow">Competition mode</div>
      <h1>Call the distance.</h1>
      <p className="lede">
        Enter the target from the recorder. You&apos;ll get the draw angle, front pin and stop pin to use. Targets are
        whole inches between {TARGET_MIN}″ and {TARGET_MAX}″.
      </p>

      <form className="card target-form" onSubmit={onSubmit}>
        <Trajectory />
        <label htmlFor="target">Target distance</label>
        <div className="row">
          <div className="target-input">
            <input
              id="target"
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              placeholder="104"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <span className="unit">in</span>
          </div>
          <button type="submit" disabled={!valid}>
            Get settings
          </button>
        </div>
        {outOfRange && (
          <p className="warn">
            Outside the competition range ({TARGET_MIN}–{TARGET_MAX}″). The prediction will be extrapolated.
          </p>
        )}
      </form>

      {result && <Result key={runs} result={result} />}
    </>
  );
}

function Result({ result }: { result: Prediction }) {
  const options = result.status === "ok" ? result.options : null;
  const best = options?.[0];
  return (
    <section className="card reveal">
      <h2>Settings for {result.target}″</h2>
      {result.status === "untrained" && (
        <div className="banner">
          <strong>Model not trained yet.</strong> These are placeholders. Log trials on the Training page.
          Settings will appear here once the regression model is fitted.
        </div>
      )}

      <div className="settings-grid">
        <Setting label="Draw angle" value={best ? `${best.drawAngle.toFixed(1)}°` : "—"} />
        <Setting label="Front pin" value={best ? String(best.frontPin) : "—"} />
        <Setting label="Stop pin" value={best ? String(best.stopPin) : "—"} />
      </div>

      <h3>All valid options</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Front pin</th>
              <th>Stop pin</th>
              <th>Draw angle</th>
              <th>Predicted</th>
              <th>Shot σ</th>
            </tr>
          </thead>
          <tbody>
            {options ? (
              options.map((o, i) => (
                <tr key={i}>
                  <td>{o.frontPin}</td>
                  <td>{o.stopPin}</td>
                  <td>{o.drawAngle.toFixed(1)}°</td>
                  <td>{o.predicted.toFixed(2)}″</td>
                  <td>±{o.sigma.toFixed(2)}″</td>
                </tr>
              ))
            ) : (
              <tr>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Options will be ranked by expected accuracy. The best pin combination is the one where the target sits
        well inside the tested draw range and shot-to-shot variation is lowest.
      </p>
    </section>
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

function Trajectory() {
  return (
    <svg className="trajectory" viewBox="0 0 600 70" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="traj-g" x1="0" x2="1">
          <stop offset="0" stopColor="#c6f432" stopOpacity="0.15" />
          <stop offset="1" stopColor="#3ee0cf" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d="M8 66 Q 300 -40 588 60" fill="none" stroke="url(#traj-g)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="588" cy="60" r="5" fill="#3ee0cf" />
      <line x1="0" y1="68" x2="600" y2="68" stroke="rgba(255,255,255,0.08)" />
    </svg>
  );
}
