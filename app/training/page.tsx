import { getDb, getDesign, listTrials, NOT_CONFIGURED } from "../../lib/db";
import { DEFAULT_DESIGN, type DesignSpace } from "../../lib/design";
import type { Trial } from "../../lib/types";
import TrainingWorkspace from "./TrainingWorkspace";
import TrialData from "./TrialData";

export const dynamic = "force-dynamic";

async function load(): Promise<{ trials: Trial[]; design: DesignSpace; error: string | null }> {
  try {
    const db = await getDb();
    if (!db) return { trials: [], design: DEFAULT_DESIGN, error: NOT_CONFIGURED };
    const [trials, design] = await Promise.all([listTrials(db), getDesign(db)]);
    return { trials, design, error: null };
  } catch (e) {
    return { trials: [], design: DEFAULT_DESIGN, error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function TrainingPage() {
  const { trials, design, error } = await load();
  return (
    <>
      <h1>Training</h1>
      <p className="muted">
        Log trial shots to characterize the catapult. This data will be used to fit the regression model behind the
        Predict page.
      </p>

      <ModelDescription />

      {error && <div className="banner error-banner">{error}</div>}
      <TrainingWorkspace trials={trials} design={design} />
      <TrialData trials={trials} />
    </>
  );
}

function ModelDescription() {
  return (
    <section className="card prose">
      <h2>The model (not yet fitted)</h2>
      <p>
        A regression of <strong>distance</strong> on <strong>draw angle</strong> (continuous) and the{" "}
        <strong>front</strong> and <strong>stop pin</strong> positions (dummy variables):
      </p>
      <pre className="formula">Distance = β₀ + β₁·Draw + β₂·Draw² + pin effects + ε</pre>
      <p>
        On competition day it&apos;s solved backwards: given a target distance, find the draw angle for each pin
        combination, and pick the one with the least shot-to-shot variation. Shots should be on a hard floor, measured to
        ⅛″.
      </p>
    </section>
  );
}
