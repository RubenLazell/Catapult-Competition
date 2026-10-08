import { getDb, listTrials, NOT_CONFIGURED } from "../../lib/db";
import type { Trial } from "../../lib/types";
import TrialForm from "./TrialForm";
import TrialData from "./TrialData";

export const dynamic = "force-dynamic";

async function loadTrials(): Promise<{ trials: Trial[]; error: string | null }> {
  try {
    const db = await getDb();
    if (!db) return { trials: [], error: NOT_CONFIGURED };
    return { trials: await listTrials(db), error: null };
  } catch (e) {
    return { trials: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function TrainingPage() {
  const { trials, error } = await loadTrials();
  return (
    <>
      <h1>Training</h1>
      <p className="muted">
        Log trial shots to characterize the catapult. This data will be used to fit the regression model behind the
        Predict page.
      </p>

      <ModelDescription />

      {error && <div className="banner error-banner">{error}</div>}
      <TrialForm />
      <TrialData trials={trials} />
    </>
  );
}

function ModelDescription() {
  return (
    <section className="card prose">
      <h2>The model (planned, not yet fitted)</h2>

      <h3>Variables</h3>
      <ul>
        <li>
          <strong>Y: distance</strong>, in inches, from the front of the catapult base to the centre of the
          landing mark. Measured to the nearest ⅛″ on a hard floor.
        </li>
        <li>
          <strong>A: draw angle</strong>, how far back the arm is pulled. Continuous, read from the side scale.
        </li>
        <li>
          <strong>F: front pin position</strong>. Categorical, coded as dummy variables against a base position.
        </li>
        <li>
          <strong>S: stop pin position</strong>. Categorical, coded as dummy variables against a base position.
        </li>
        <li>
          Fixed and not adjusted: rubber-band screw-eye position and cup position.
        </li>
      </ul>

      <h3>Regression form</h3>
      <pre className="formula">
        Distance = β₀ + β₁·A + β₂·A² + Σ γᵢ·Fᵢ + Σ δⱼ·Sⱼ + Σ λᵢ·(A × Fᵢ) + ε
      </pre>
      <p>
        The A² term allows for curvature in the draw/distance relationship. The A × F interaction lets each pin
        setting have its own slope. Terms that aren&apos;t significant will be dropped. To keep the model simple
        we will probably restrict to a few pin combinations that together cover 80–130″, rather than code
        every hole.
      </p>

      <h3>Back-solving for competition</h3>
      <p>
        Given a target distance, for each allowed (front pin, stop pin) combination we solve the fitted equation
        for A, then reject any solution outside the draw range we actually tested. The remaining options are
        ranked by expected accuracy, preferring the combination with the smallest shot-to-shot σ and the target
        nearest the middle of its tested range. The Predict page shows the best option first.
      </p>

      <h3>Data collection protocol</h3>
      <ol>
        <li>Shoot on a hard floor, matching the competition floor in the Commons.</li>
        <li>Choose pin combinations and 3–5 draw angles per combination spanning roughly 70–140″.</li>
        <li>Randomize run order and take several replicate shots (5–10) at each setting.</li>
        <li>Dust the ball, measure straight out from the base to the centre of the mark, to ⅛″.</li>
        <li>Log every shot here, including bad ones; add a note rather than deleting outliers.</li>
        <li>
          Check stability with an I-MR control chart before trusting the fit. The report must show the process is
          in control.
        </li>
      </ol>
    </section>
  );
}
