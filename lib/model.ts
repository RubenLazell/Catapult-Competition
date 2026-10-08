// Prediction model for the catapult.
//
// NOT YET FITTED. Once training data is collected, the regression coefficients go here
// and predictSettings() back-solves for the draw angle for each pin combination.
// See the Training page for the planned model form.

export const TARGET_MIN = 80;
export const TARGET_MAX = 130;

export type Recommendation = {
  frontPin: number;
  stopPin: number;
  drawAngle: number;
  predicted: number;
  sigma: number; // shot-to-shot std dev at these settings (inches)
};

export type Prediction =
  | { status: "untrained"; target: number }
  | { status: "ok"; target: number; options: Recommendation[] };

export function predictSettings(target: number): Prediction {
  return { status: "untrained", target };
}
