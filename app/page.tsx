"use client";

import { useState } from "react";
import { predictSettings, TARGET_MAX, TARGET_MIN, type Prediction } from "../lib/model";

export default function PredictPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Prediction | null>(null);

  const target = Number(input);
  const valid = input.trim() !== "" && Number.isFinite(target) && target > 0;
  const outOfRange = valid && (target < TARGET_MIN || target > TARGET_MAX);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (valid) setResult(predictSettings(target));
  }

  return (
    <>
      <h1>Predict settings</h1>
      <p className="muted">
        Enter the target distance from the recorder. You&apos;ll get the draw angle, front pin and stop pin
        settings to use. Competition targets are whole inches between {TARGET_MIN}″ and {TARGET_MAX}″.
      </p>

      <form className="card target-form" onSubmit={onSubmit}>
        <label htmlFor="target">Target distance (inches)</label>
        <div className="row">
          <input
            id="target"
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            placeholder="e.g. 104"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
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

      {result && <Result result={result} />}
    </>
  );
}

function Result({ result }: { result: Prediction }) {
  const options = result.status === "ok" ? result.options : null;
  const best = options?.[0];
  return (
    <section className="card">
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
