"use client";

import { useRef, useState, useTransition } from "react";
import { predict } from "./actions";
import { TARGET_MAX, TARGET_MIN, type Prediction } from "../lib/model";
import Result from "../components/PredictResult";

export default function PredictPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<Prediction | null>(null);
  const [runs, setRuns] = useState(0);
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);

  const target = Number(input);
  const valid = input.trim() !== "" && Number.isFinite(target) && target > 0;
  const outOfRange = valid && (target < TARGET_MIN || target > TARGET_MAX);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || pending) return;
    const run = ++latest.current;
    startTransition(async () => {
      const res = await predict(target);
      if (run !== latest.current) return; // a newer request superseded this one
      setResult(res);
      setRuns(run); // remount the result so it animates in again
    });
  }

  return (
    <>
      <div className="eyebrow">Competition mode</div>
      <h1>Call the distance.</h1>
      <p className="lede">
        Enter the target from the recorder. You&apos;ll get the draw angle, front pin and stop pin to use. Targets are
        whole inches between {TARGET_MIN}″ and {TARGET_MAX}″.
      </p>

      <form className="card target-form" onSubmit={onSubmit}>
        <Trajectory />
        <label htmlFor="target">Target distance</label>
        <div className="row">
          <div className="target-input">
            <input
              id="target"
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              placeholder="104"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
            <span className="unit">in</span>
          </div>
          <button type="submit" disabled={!valid || pending}>
            {pending ? "Fitting…" : "Get settings"}
          </button>
        </div>
        {outOfRange && (
          <p className="warn">Outside the competition range ({TARGET_MIN}–{TARGET_MAX}″).</p>
        )}
      </form>

      {result && <Result key={runs} result={result} />}
    </>
  );
}

function Trajectory() {
  return (
    <svg className="trajectory" viewBox="0 0 600 70" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="traj-g" x1="0" x2="1">
          <stop offset="0" stopColor="#c6f432" stopOpacity="0.15" />
          <stop offset="1" stopColor="#3ee0cf" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d="M8 66 Q 300 -40 588 60" fill="none" stroke="url(#traj-g)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="588" cy="60" r="5" fill="#3ee0cf" />
      <line x1="0" y1="68" x2="600" y2="68" stroke="rgba(255,255,255,0.08)" />
    </svg>
  );
}
