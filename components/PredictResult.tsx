import type { FitSummary, Prediction, Recommendation } from "../lib/model";

export default function Result({ result }: { result: Prediction }) {
  if (result.status !== "ok") {
    return (
      <section className="card reveal">
        <h2>Settings for {result.target}″</h2>
        <div className="banner">
          <strong>{result.status === "untrained" ? "Model not ready." : "Out of reach."}</strong> {result.reason}
        </div>
        {result.status === "no_solution" && <FitLine fit={result.fit} />}
      </section>
    );
  }

  const [best, ...rest] = result.options;
  return (
    <section className="card reveal">
      <div className="row between">
        <h2>Settings for {result.target}″</h2>
        <span className="pill">
          Expect {best.predicted.toFixed(1)}″ ± {best.sigma.toFixed(2)}
        </span>
      </div>
      {best.extrapolated && (
        <div className="banner">
          Extrapolated: this draw angle is outside the range tested with pins {best.frontPin}/{best.stopPin} (
          {best.tested[0]}–{best.tested[1]}°). Treat it with caution.
        </div>
      )}

      <div className="settings-grid">
        <Setting label="Draw angle" value={`${best.drawAngle.toFixed(1)}°`} />
        <Setting label="Front pin" value={String(best.frontPin)} />
        <Setting label="Stop pin" value={String(best.stopPin)} />
      </div>

      {rest.length > 0 && (
        <>
          <h3>Backup options</h3>
          <OptionsTable options={rest.slice(0, 4)} />
          {rest.length > 4 && (
            <details>
              <summary>{rest.length - 4} more</summary>
              <OptionsTable options={rest.slice(4)} />
            </details>
          )}
        </>
      )}
      <FitLine fit={result.fit} />
    </section>
  );
}

function FitLine({ fit }: { fit: FitSummary }) {
  return (
    <p className="muted small">
      Refit just now on {fit.n} shots · R² {fit.r2.toFixed(4)} · residual σ {fit.sigma.toFixed(2)}″. Options are ranked
      by expected error, which combines that setting&apos;s shot-to-shot scatter with the model&apos;s uncertainty.
    </p>
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

function OptionsTable({ options }: { options: Recommendation[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Front</th>
            <th>Stop</th>
            <th>Draw</th>
            <th>Expected error</th>
            <th>Tested draw</th>
            <th>Shots</th>
          </tr>
        </thead>
        <tbody>
          {options.map((o) => (
            <tr key={`${o.frontPin}-${o.stopPin}`}>
              <td>{o.frontPin}</td>
              <td>{o.stopPin}</td>
              <td>
                {o.drawAngle.toFixed(1)}°{o.extrapolated && <span className="warn"> (extrapolated)</span>}
              </td>
              <td>±{o.sigma.toFixed(2)}″</td>
              <td>
                {o.tested[0]}–{o.tested[1]}°
              </td>
              <td>{o.shots}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
