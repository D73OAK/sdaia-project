// estimate.js: turns the numbers counted from one chapter PDF into a study-hours range and a reason.
// Pure functions only (no React, no PDF reading), so they can be tested and moved to a server unchanged.
//
// Formula (HANDOFF.md §7 rule 5):
//   base = pages×0.05 + {low:0, mid:0.4, high:0.8}[density] + equations×0.03 + exercises×0.12
//   lo   = max(0.5, round½(base × level))
//   hi   = round½(lo × 1.4)
// The weights are placeholders, to calibrate later against real study time. Change them ONLY here.
import { fmtNumber } from '../../lib/format.js';
import { reasonText } from '../../lib/strings.js';

export const ESTIMATE_CONFIG = {
  hoursPerPage: 0.05,
  densityHours: { low: 0, mid: 0.4, high: 0.8 },
  hoursPerEquation: 0.03,
  hoursPerExercise: 0.12,
  levelMultiplier: { strong: 0.75, mid: 1, weak: 1.4 },
  minHours: 0.5, // no chapter is estimated below half an hour
  rangeFactor: 1.4, // hi = lo × 1.4
  // Words per page: below `lowBelow` is low, above `highAbove` is high, anything between is mid.
  density: { lowBelow: 120, highAbove: 300 },
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
export function estimateChapter(metrics, level) {
  const multiplier = C.levelMultiplier[level];
  if (multiplier === undefined) throw new Error(`Unknown level: ${level}`);

  const base =
    metrics.pages * C.hoursPerPage +
    C.densityHours[metrics.density] +
    metrics.equations * C.hoursPerEquation +
    metrics.exercises * C.hoursPerExercise;

  const loHours = Math.max(C.minHours, roundHalf(base * multiplier));
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
