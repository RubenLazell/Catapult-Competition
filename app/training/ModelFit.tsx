import { fitModel } from "../../lib/model";
import type { Trial } from "../../lib/types";

export default function ModelFit({ trials }: { trials: Trial[] }) {
  const result = fitModel(trials);

  return (
    <section className="card prose">
      <div className="row between">
        <h2>The model</h2>
        <span className="pill">{result.ok ? "Live fit" : "Waiting for data"}</span>
      </div>
      <p>
        A regression of <strong>distance</strong> on <strong>draw angle</strong> and the <strong>front</strong> and{" "}
        <strong>stop pin</strong> positions (dummy variables), refit from every hard-floor shot whenever Predict is
        used:
      </p>
      <pre className="formula">Distance = β₀ + β₁·D + β₂·D² + pin effects + D × pin effects + ε</pre>

      {!result.ok ? (
        <div className="banner">{result.reason}</div>
      ) : (
        <FitDetails model={result.model} />
      )}
    </section>
  );
}

function FitDetails({ model }: { model: Extract<ReturnType<typeof fitModel>, { ok: true }>["model"] }) {
  const { fit, summary, combos, center } = model;
  const lackOfFit = summary.pureError !== null && summary.sigma > 1.5 * summary.pureError;
  return (
    <>
      <div className="settings-grid four">
        <Stat label="Shots" value={String(summary.n)} />
        <Stat label="R²" value={summary.r2.toFixed(4)} />
        <Stat label={<>Residual <span className="nocase">σ</span></>} value={`${summary.sigma.toFixed(2)}″`} />
        <Stat label={<>Replicate <span className="nocase">σ</span></>} value={summary.pureError === null ? "—" : `${summary.pureError.toFixed(2)}″`} />
      </div>
      <p className="muted small">
        Residual σ is how far shots land from the model. Replicate σ is the scatter between shots at identical settings,
        which is the machine&apos;s own noise and the best accuracy you can hope for.
      </p>
      {lackOfFit && (
        <p className="warn">
          Residual σ is well above replicate σ, so the model may be missing something (e.g. pin combinations that
          interact). Check the residuals before trusting it.
        </p>
      )}

      <details>
        <summary>Coefficients</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Term</th>
                <th>Estimate</th>
              </tr>
            </thead>
            <tbody>
              {fit.kept.map((j) => (
                <tr key={fit.names[j]}>
                  <td>{fit.names[j]}</td>
                  <td>{fit.beta[j].toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          D = draw angle − {center.toFixed(1)}°. Base case: front pin {model.baseFront}, stop pin {model.baseStop}.
          {fit.dropped.length > 0 && <> Not estimable yet (left out): {fit.dropped.join(", ")}.</>}
        </p>
      </details>

      <details>
        <summary>Pin combinations in the data</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Front</th>
                <th>Stop</th>
                <th>Shots</th>
                <th>Tested draw</th>
                <th>Shot σ</th>
              </tr>
            </thead>
            <tbody>
              {combos.map((c) => (
                <tr key={`${c.front}-${c.stop}`}>
                  <td>{c.front}</td>
                  <td>{c.stop}</td>
                  <td>{c.shots}</td>
                  <td>
                    {c.drawLo === c.drawHi ? `${c.drawLo}°` : `${c.drawLo}–${c.drawHi}°`}
                  </td>
                  <td>
                    {c.sigma.toFixed(2)}″{" "}
                    <span className="muted small">{c.fromReplicates ? "replicates" : "model"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Predict only uses combinations with 3+ shots across two or more draw angles, and stays inside each one&apos;s
          tested draw range.
        </p>
      </details>
    </>
  );
}

function Stat({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="setting">
      <div className="setting-label">{label}</div>
      <div className="setting-value">{value}</div>
    </div>
  );
}
