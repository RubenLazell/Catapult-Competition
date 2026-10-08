"use client";

import { useState } from "react";
import NextShot from "./NextShot";
import TrialForm, { type Prefill } from "./TrialForm";
import type { DesignSpace } from "../../lib/design";
import type { Trial } from "../../lib/types";

export default function TrainingWorkspace({ trials, design }: { trials: Trial[]; design: DesignSpace }) {
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  return (
    <>
      <NextShot
        trials={trials}
        design={design}
        onUse={(s) => setPrefill({ draw: s.draw, front: s.front, stop: s.stop, shots: s.shots, nonce: Date.now() })}
      />
      <TrialForm prefill={prefill} />
    </>
  );
}
