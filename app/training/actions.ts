"use server";

import { revalidatePath } from "next/cache";
import { getDb, NOT_CONFIGURED } from "../../lib/db";
import { parseDistances } from "../../lib/parse";

export type ActionResult = { ok?: string; error?: string };

function optionalText(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function addTrials(fd: FormData): Promise<ActionResult> {
  const draw = Number(fd.get("draw_angle"));
  const front = Number(fd.get("front_pin"));
  const stop = Number(fd.get("stop_pin"));
  if (!Number.isFinite(draw) || draw <= 0) return { error: "Enter a valid draw angle." };
  if (!Number.isInteger(front) || front < 1) return { error: "Enter a valid front pin position." };
  if (!Number.isInteger(stop) || stop < 1) return { error: "Enter a valid stop pin position." };

  const { values, bad } = parseDistances(String(fd.get("distances") ?? ""));
  if (bad.length) return { error: `Couldn't read: ${bad.join(", ")}` };
  if (!values.length) return { error: "Enter at least one measured distance." };

  const session = optionalText(fd, "session");
  const shooter = optionalText(fd, "shooter");
  const surface = optionalText(fd, "surface") ?? "hard";
  const notes = optionalText(fd, "notes");

  try {
    const db = await getDb();
    if (!db) return { error: NOT_CONFIGURED };
    // One row per shot, all sharing the same settings.
    await db`
      insert into trials (session, shooter, draw_angle, front_pin, stop_pin, distance_in, surface, notes)
      select ${session}, ${shooter}, ${draw}, ${front}, ${stop}, d, ${surface}, ${notes}
      from unnest(${values}::numeric[]) as d`;
  } catch (e) {
    return { error: message(e) };
  }

  revalidatePath("/training");
  return { ok: `Saved ${values.length} shot${values.length === 1 ? "" : "s"}.` };
}

export async function deleteTrial(id: number): Promise<ActionResult> {
  try {
    const db = await getDb();
    if (!db) return { error: NOT_CONFIGURED };
    await db`delete from trials where id = ${id}`;
  } catch (e) {
    return { error: message(e) };
  }
  revalidatePath("/training");
  return { ok: "Deleted." };
}
