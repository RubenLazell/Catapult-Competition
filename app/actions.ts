"use server";

import { getDb, listTrials, NOT_CONFIGURED } from "../lib/db";
import { fitModel, predictSettings, type Prediction } from "../lib/model";

// Refit from the latest trials on every request, then back-solve for the target.
export async function predict(target: number): Promise<Prediction> {
  if (!Number.isFinite(target) || target <= 0) return { status: "untrained", target, reason: "Enter a valid distance." };
  try {
    const db = await getDb();
    if (!db) return { status: "untrained", target, reason: NOT_CONFIGURED };
    const result = fitModel(await listTrials(db));
    if (!result.ok) return { status: "untrained", target, reason: result.reason };
    return predictSettings(result.model, target);
  } catch (e) {
    return { status: "untrained", target, reason: e instanceof Error ? e.message : String(e) };
  }
}
