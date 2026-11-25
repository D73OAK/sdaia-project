// progress.js: what the student has already studied (HANDOFF.md §7 rules 16–17). Pure functions, no UI.
//
// progress = {
//   studied:  { [chapterId]: hours }   hours of sessions whose day has passed (counted automatically)
//   finished: [chapterId]              files the student ticked in «وش خلصت من الشابترات؟»
// }
// A file is finished when it is ticked, or when its studied hours reach its hiHours. Otherwise it still
// needs hiHours − studied. What is left under 15 minutes counts as finished: no session part is ever
// shorter than 15 minutes (§7 rule 9), so such a tail could never be scheduled.
import { emptyProgress } from '../../lib/storage.js';
import { MIN_PART_MINUTES, studyOrder } from './schedule.js';

export { emptyProgress };

const round2 = (x) => Math.round(x * 100) / 100;

// The minutes a file still needs (0 = finished).
export function minutesLeft(chapter, progress) {
  if (!chapter.estimate || chapter.error) return 0;
  if (progress.finished.includes(chapter.id)) return 0;
  const left = (chapter.estimate.hiHours - (progress.studied[chapter.id] ?? 0)) * 60;
  return left < MIN_PART_MINUTES ? 0 : left;
}

export const isFinished = (chapter, progress) => minutesLeft(chapter, progress) === 0;

// The courses still to study for: their exam is after today.
export const activeCourses = (courses, today) => courses.filter((c) => c.examDate > today);

// True when every file of every course still to study for is finished (and there is at least one).
export function allFinished(courses, progress, today) {
  const files = activeCourses(courses, today).flatMap((c) => studyOrder(c));
  return files.length > 0 && files.every((ch) => isFinished(ch, progress));
}

// The hours and the leftover list of a plan, counted from its remaining days only (§7 rule 16).
export function planTotals(plan, courses, progress, today) {
  const scheduled = new Map();
  for (const day of plan.days)
    for (const s of day.sessions)
      for (const p of s.parts) scheduled.set(p.chapterId, (scheduled.get(p.chapterId) ?? 0) + p.hours * 60);

  let need = 0;
  let missingTotal = 0;
  const leftover = [];
  // Same order as buildPlan: nearest exam first.
  const ordered = [...activeCourses(courses, today)].sort((a, b) =>
    a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : a.order - b.order,
  );
  for (const course of ordered) {
    for (const ch of studyOrder(course)) {
      const left = minutesLeft(ch, progress);
      need += left;
      const missing = left - (scheduled.get(ch.id) ?? 0);
      // Part hours are stored rounded (1.33), so sums can be off by a minute or two. A real leftover is
      // never under 15 minutes (buildPlan never leaves a shorter tail), so anything smaller is noise.
      if (missing >= MIN_PART_MINUTES) {
        missingTotal += missing;
        leftover.push({ chapterId: ch.id, missingHours: round2(missing / 60) });
      }
    }
  }
  return { needHours: round2(need / 60), haveHours: round2((need - missingTotal) / 60), leftover };
}

// Counts every day that has ended (before today) as studied and drops it from the plan (§7 rule 16).
// Today is not counted while it is still today. Returns { plan, progress, changed }.
export function settlePlan(plan, courses, progress, today) {
  const past = plan.days.filter((d) => d.date < today);
  if (!past.length) return { plan, progress, changed: false };

  const studied = { ...progress.studied };
  for (const day of past)
    for (const s of day.sessions)
      for (const p of s.parts) studied[p.chapterId] = round2((studied[p.chapterId] ?? 0) + p.hours);

  const nextProgress = { ...progress, studied };
  const days = plan.days.filter((d) => d.date >= today);
  const nextPlan = { ...plan, days, ...planTotals({ ...plan, days }, courses, nextProgress, today) };
  return { plan: nextPlan, progress: nextProgress, changed: true };
}

// «رتّب الباقي»: the ticks from the popup become the new progress (§7 rule 17).
// `checked` = the ids ticked. Only files of courses still to study for are touched.
//   ticked                      -> finished
//   not ticked, was finished    -> needs its full hiHours again (studied back to 0)
//   not ticked, partly studied  -> keeps its remaining hours
export function applyChecks(courses, progress, checked, today) {
  const finished = new Set(progress.finished);
  const studied = { ...progress.studied };
  for (const ch of activeCourses(courses, today).flatMap((c) => studyOrder(c))) {
    if (checked.includes(ch.id)) {
      finished.add(ch.id);
    } else {
      if (isFinished(ch, progress)) delete studied[ch.id];
      finished.delete(ch.id);
    }
  }
  return { studied, finished: [...finished] };
}

// After a course is edited or deleted: keep the records of files that still exist, drop the others
// (HANDOFF.md §7 rule 18).
export function pruneProgress(progress, courses) {
  const ids = new Set(courses.flatMap((c) => c.chapters.map((ch) => ch.id)));
  const studied = Object.fromEntries(Object.entries(progress.studied).filter(([id]) => ids.has(id)));
  return { studied, finished: progress.finished.filter((id) => ids.has(id)) };
}

// Every course's exam has passed: nothing can be planned any more.
export const allExamsPassed = (courses, today) => courses.length > 0 && courses.every((c) => c.examDate <= today);
