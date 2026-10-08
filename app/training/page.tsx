import { getDb, getDesign, listTrials, NOT_CONFIGURED } from "../../lib/db";
import { DEFAULT_DESIGN, type DesignSpace } from "../../lib/design";
import type { Trial } from "../../lib/types";
import TrainingWorkspace from "./TrainingWorkspace";
import TrialData from "./TrialData";
import ModelFit from "./ModelFit";

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
      <div className="eyebrow">Characterize the machine</div>
      <h1>Training</h1>
      <p className="lede">
        Log trial shots to characterize the catapult. Every hard-floor shot feeds the regression model behind the
        Predict page.
      </p>

      <ModelFit trials={trials} />

      {error && <div className="banner error-banner">{error}</div>}
      <TrainingWorkspace trials={trials} design={design} />
      <TrialData trials={trials} />
    </>
  );
}
