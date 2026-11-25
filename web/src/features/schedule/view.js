// view.js: small pure helpers that turn a saved plan into what the screens show. No UI here.
import { addDays } from './schedule.js';
import { colorIndexOf } from '../courses/courses.js';

export const DAYS_PER_WEEK = 7;

// True when the plan has at least one study session (an empty plan = every exam is tomorrow).
export const hasAnySession = (plan) => plan.days.some((d) => d.sessions.length > 0);

// The «الوقت ما يكفي» popup shows only when something is left over AND there is a schedule to show.
export const needsShortPopup = (plan) => plan.leftover.length > 0 && hasAnySession(plan);

export const weekCount = (plan) => Math.max(1, Math.ceil(plan.days.length / DAYS_PER_WEEK));

// The 7 dates of week `week` (0 = the week that starts with the plan's first day, tomorrow),
// each with its plan day, or null after the last exam.
export function weekDays(plan, week) {
  const first = plan.days[0]?.date;
  if (!first) return [];
  const byDate = new Map(plan.days.map((d) => [d.date, d]));
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) => {
    const date = addDays(first, week * DAYS_PER_WEEK + i);
    return { date, day: byDate.get(date) ?? null };
  });
}

// chapterId -> { course, chapter }, to show names, colours and reasons.
export function fileIndex(courses) {
  const index = new Map();
  for (const course of courses) for (const chapter of course.chapters) index.set(chapter.id, { course, chapter });
  return index;
}

// The parts of one session, ready for the Session component.
export function sessionParts(session, index) {
  return session.parts
    .map((p) => {
      const found = index.get(p.chapterId);
      if (!found) return null; // the course was removed since the plan was made
      return {
        chapterId: p.chapterId,
        hours: p.hours,
        courseName: found.course.name,
        colorIndex: colorIndexOf(found.course),
        kind: found.chapter.kind,
        index: found.chapter.index,
        course: found.course,
        chapter: found.chapter,
      };
    })
    .filter(Boolean);
}

// The session in time slot `slot` of a plan day, or undefined.
export const sessionAt = (day, slot) => day?.sessions.find((s) => s.slot === slot);

// What the schedule shows (HANDOFF.md §7 rule 16): today is the first, highlighted column («اليوم») when the
// saved plan has sessions today; otherwise the schedule starts tomorrow («بكرة»).
// Returns { plan (only the days shown), highlight (its date), label ('today' | 'tomorrow') }.
export function visiblePlan(plan, today) {
  const todayDay = plan.days.find((d) => d.date === today);
  if (todayDay && todayDay.sessions.length > 0) return { plan, highlight: today, label: 'today' };
  const tomorrow = addDays(today, 1);
  return { plan: { ...plan, days: plan.days.filter((d) => d.date >= tomorrow) }, highlight: tomorrow, label: 'tomorrow' };
}
