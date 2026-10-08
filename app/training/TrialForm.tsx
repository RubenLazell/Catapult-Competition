"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addTrials, type ActionResult } from "./actions";
import { parseDistances } from "../../lib/parse";

export type Prefill = { draw: number; front: number; stop: number; shots: number; nonce: number };

export default function TrialForm({ prefill }: { prefill: Prefill | null }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState({
    session: "",
    shooter: "",
    draw_angle: "",
    front_pin: "",
    stop_pin: "",
    surface: "hard",
    notes: "",
  });
  const [distances, setDistances] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  // Apply a suggestion from the Next trial shot panel.
  useEffect(() => {
    if (!prefill) return;
    setFields((f) => ({
      ...f,
      draw_angle: String(prefill.draw),
      front_pin: String(prefill.front),
      stop_pin: String(prefill.stop),
      surface: "hard",
    }));
    setResult(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [prefill]);

  const parsed = parseDistances(distances);
  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields({ ...fields, [k]: e.target.value });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addTrials(fd);
      setResult(res);
      // Keep the settings so the next batch at the same configuration is quick to enter.
      if (res.ok) setDistances("");
    });
  }

  return (
    <form className="card" onSubmit={onSubmit} ref={formRef}>
      <h2>Log trial shots</h2>
      <p className="muted small">
        Enter the settings once, then every measured distance shot at those settings.
      </p>
      {prefill && !result && (
        <div className="banner">
          Settings filled from the suggestion. Shoot {prefill.shots} shot{prefill.shots === 1 ? "" : "s"}, then enter
          the distances below.
        </div>
      )}

      <div className="form-grid">
        <Field label="Draw angle (°)">
          <input name="draw_angle" type="number" step="any" required value={fields.draw_angle} onChange={set("draw_angle")} />
        </Field>
        <Field label="Front pin" hint="hole #">
          <input name="front_pin" type="number" min={1} step={1} required value={fields.front_pin} onChange={set("front_pin")} />
        </Field>
        <Field label="Stop pin" hint="hole #">
          <input name="stop_pin" type="number" min={1} step={1} required value={fields.stop_pin} onChange={set("stop_pin")} />
        </Field>
        <Field label="Surface">
          <select name="surface" value={fields.surface} onChange={set("surface")}>
            <option value="hard">Hard floor</option>
            <option value="carpet">Carpet</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Session" hint="optional">
          <input name="session" placeholder="e.g. Oct 12 DOE" value={fields.session} onChange={set("session")} />
        </Field>
        <Field label="Shooter" hint="optional">
          <input name="shooter" value={fields.shooter} onChange={set("shooter")} />
        </Field>
      </div>

      <Field label="Measured distances (inches)" hint="one per line or comma-separated; fractions OK, e.g. 97 3/8">
        <textarea
          name="distances"
          rows={5}
          value={distances}
          onChange={(e) => setDistances(e.target.value)}
          placeholder={"97 3/8\n98.25\n96 7/8"}
        />
      </Field>
      <Field label="Notes" hint="optional">
        <input name="notes" value={fields.notes} onChange={set("notes")} />
      </Field>

      <div className="row between">
        <span className="muted small">
          {parsed.values.length} shot{parsed.values.length === 1 ? "" : "s"} ready
          {parsed.bad.length > 0 && <span className="error"> · can&apos;t read: {parsed.bad.join(", ")}</span>}
        </span>
        <button type="submit" disabled={pending || parsed.values.length === 0 || parsed.bad.length > 0}>
          {pending ? "Saving…" : "Save shots"}
        </button>
      </div>
      {result?.ok && <p className="success">{result.ok}</p>}
      {result?.error && <p className="error">{result.error}</p>}
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>
        {label} {hint && <span className="muted small">({hint})</span>}
      </span>
      {children}
    </label>
  );
}
