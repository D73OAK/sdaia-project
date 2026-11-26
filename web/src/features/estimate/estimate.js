// estimate.js: turns the numbers counted from one chapter PDF into a study-hours range and a reason.
// Pure functions only (no React, no PDF reading), so they can be tested and moved to a server unchanged.
//
// Formula (HANDOFF.md §7 rule 5):
//   base = pages×0.0375 + {low:0, mid:0.4, high:0.8}[density] + equations×0.03 + exercises×0.12
//   lo   = max(0.5, round½(base × level))
//   hi   = round½(lo × 1.4)
// With the AI (Version 4.7): lo = max(0.5, round½(base × level × difficulty)), see estimateWithDifficulty.
// The weights are placeholders, to calibrate later against real study time. Change them ONLY here.
import { fmtNumber } from '../../lib/format.js';
import { reasonText } from '../../lib/strings.js';

export const ESTIMATE_CONFIG = {
  hoursPerPage: 0.0375, // calibrated 2026-11-24 from real study time on 3 chapters (was 0.05)
  densityHours: { low: 0, mid: 0.4, high: 0.8 },
  hoursPerEquation: 0.03,
  hoursPerExercise: 0.12,
  levelMultiplier: { strong: 0.75, mid: 1, weak: 1.4 },
  minHours: 0.5, // no chapter is estimated below half an hour
  rangeFactor: 1.4, // hi = lo × 1.4
  // Words per page: below `lowBelow` is low, above `highAbove` is high, anything between is mid.
  density: { lowBelow: 120, highAbove: 300 },
  // Version 4.6: the AI judges how hard the content is (1–5); the formula's range is scaled by this.
  // 3 is the formula itself. Placeholders, to calibrate against real study times like the weights above.
  difficultyMultiplier: { 1: 0.7, 2: 0.85, 3: 1, 4: 1.2, 5: 1.4 },
};

const C = ESTIMATE_CONFIG;

// Rounds to the nearest half hour: 3.93 -> 4, 5.6 -> 5.5.
export const roundHalf = (x) => Math.round(x * 2) / 2;

export function densityOf(wordsPerPage) {
  if (wordsPerPage < C.density.lowBelow) return 'low';
  if (wordsPerPage > C.density.highAbove) return 'high';
  return 'mid';
}

// metrics: { pages, density, equations, exercises }, level: 'strong' | 'mid' | 'weak'
// returns { loHours, hiHours, reason }
export const estimateChapter = (metrics, level) => estimateRange(metrics, level, 1);

// The AI's judgment applied to the formula (HANDOFF.md §7 rule 5, Version 4.7): the AI says how hard the
// content is, the formula measures its size and applies the level. The difficulty multiplier joins the
// level before any rounding, so it counts on short files too (1 h × 1.2 is not rounded back to 1 h):
//   lo = max(0.5, round½(base × level × difficulty)),  hi = round½(lo × 1.4)
// Difficulty 3 (×1) gives exactly the formula. Returns { loHours, hiHours, reason }, like estimateChapter.
export function estimateWithDifficulty(metrics, level, difficulty) {
  const multiplier = C.difficultyMultiplier[difficulty];
  if (multiplier === undefined) throw new Error(`Unknown difficulty: ${difficulty}`);
  return estimateRange(metrics, level, multiplier);
}

function estimateRange(metrics, level, difficultyFactor) {
  const multiplier = C.levelMultiplier[level];
  if (multiplier === undefined) throw new Error(`Unknown level: ${level}`);

  const base =
    metrics.pages * C.hoursPerPage +
    C.densityHours[metrics.density] +
    metrics.equations * C.hoursPerEquation +
    metrics.exercises * C.hoursPerExercise;

  const loHours = Math.max(C.minHours, roundHalf(base * multiplier * difficultyFactor));
  const hiHours = roundHalf(loHours * C.rangeFactor);

  const reason = reasonText({
    pages: fmtNumber(metrics.pages),
    density: metrics.density,
    equations: fmtNumber(metrics.equations),
    exercises: fmtNumber(metrics.exercises),
    level,
  });

  return { loHours, hiHours, reason };
}

// The course total is the sum of its readable chapters (chapters with an error are skipped).
export function courseTotal(chapters) {
  return chapters.reduce(
    (sum, ch) =>
      ch.estimate
        ? { loHours: sum.loHours + ch.estimate.loHours, hiHours: sum.hiHours + ch.estimate.hiHours }
        : sum,
    { loHours: 0, hiHours: 0 },
  );
}

// − / + on a file (HANDOFF.md §7 rule 19): both ends move by half an hour; the low end never goes under
// half an hour. Returns the new { loHours, hiHours }, or null when the step is not allowed.
export const STEP_HOURS = 0.5;
export function shiftRange({ loHours, hiHours }, step) {
  const lo = loHours + step;
  const hi = hiHours + step;
  if (lo < C.minHours) return null;
  return { loHours: lo, hiHours: hi };
}
