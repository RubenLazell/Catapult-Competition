"use server";

import { revalidatePath } from "next/cache";
import { getSupabase } from "../../lib/supabase";
import { parseDistances } from "../../lib/parse";

export type ActionResult = { ok?: string; error?: string };

function optionalText(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

export async function addTrials(fd: FormData): Promise<ActionResult> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase is not configured (set SUPABASE_URL and SUPABASE_SECRET_KEY)." };

  const draw = Number(fd.get("draw_angle"));
  const front = Number(fd.get("front_pin"));
  const stop = Number(fd.get("stop_pin"));
  if (!Number.isFinite(draw) || draw <= 0) return { error: "Enter a valid draw angle." };
  if (!Number.isInteger(front) || front < 1) return { error: "Enter a valid front pin position." };
  if (!Number.isInteger(stop) || stop < 1) return { error: "Enter a valid stop pin position." };

  const { values, bad } = parseDistances(String(fd.get("distances") ?? ""));
  if (bad.length) return { error: `Couldn't read: ${bad.join(", ")}` };
  if (!values.length) return { error: "Enter at least one measured distance." };

  const shared = {
    draw_angle: draw,
    front_pin: front,
    stop_pin: stop,
    session: optionalText(fd, "session"),
    shooter: optionalText(fd, "shooter"),
    surface: optionalText(fd, "surface") ?? "hard",
    notes: optionalText(fd, "notes"),
  };
  const { error } = await sb.from("trials").insert(values.map((d) => ({ ...shared, distance_in: d })));
  if (error) return { error: error.message };

  revalidatePath("/training");
  return { ok: `Saved ${values.length} shot${values.length === 1 ? "" : "s"}.` };
}

export async function deleteTrial(id: number): Promise<ActionResult> {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase is not configured." };
  const { error } = await sb.from("trials").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/training");
  return { ok: "Deleted." };
}
