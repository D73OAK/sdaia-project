// schedule.js: turns courses (with their estimates) and the daily preferences into a study plan.
// Pure functions only (no React, no browser APIs), so they can be tested and moved to a server unchanged.
// Ported from build() in prototype.html, with three changes:
//   1. Within a course, all chapter files come first (upload order), then all exercise files.
//   2. An exam day is kept as a normal day: it lists the exams on it AND can hold sessions of other
//      courses whose exams are later. (The prototype scheduled them but hid them behind the exam card.)
//   3. A session is a list of parts: when a file ends early, the rest of the session goes to the next
//      file if at least 15 minutes are left. (The prototype put one file per session and wasted the rest.)
//
// Dates are 'YYYY-MM-DD' strings, times are 'HH:MM' strings. `today` is passed in by the caller (the
// device clock), so the same inputs always give the same plan. Inside, time is counted in minutes so
// rounding never piles up; hours are rounded to 2 decimals only in the result.

// The values the preferences popup opens with (from prototype.html).
export const DEFAULT_PREFERENCES = {
  hoursPerDay: 4,
  breaks: 2,
  breakMinutes: 30,
  startTime: '16:00',
  endTime: '22:00',
};

// Allowed ranges (HANDOFF.md §5 Preferences).
export const PREFERENCE_LIMITS = {
  hoursPerDay: { min: 1, max: 14 },
  breaks: { min: 0, max: 6 },
  breakMinutes: { min: 5, max: 90 },
};

const EPSILON = 1e-6; // minutes; anything smaller counts as nothing left

// No part of a session is ever shorter than this (HANDOFF.md §7 rule 9).
export const MIN_PART_MINUTES = 15;

// ---------- small helpers ----------

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const toHHMM = (minutes) => {
  const t = Math.round(minutes);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

const round2 = (x) => Math.round(x * 100) / 100;

// Adds days to a 'YYYY-MM-DD' date. Uses UTC so a daylight-saving change can never skip or repeat a day.
export function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ---------- preferences ----------

const isTime = (v) => typeof v === 'string' && /^\d{2}:\d{2}$/.test(v);
const inRange = (v, { min, max }) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// HANDOFF.md §7 rule 11. Returns null when the preferences are fine, otherwise:
//   { error: 'out_of_range' }                              a field is empty or outside its range
//   { error: 'end_before_start' }                          the end time is not after the start time
//   { error: 'span_too_short', needHours, spanHours }      study + breaks do not fit between start and end
export function validatePreferences(p) {
  const L = PREFERENCE_LIMITS;
  if (
    !p ||
    !inRange(p.hoursPerDay, L.hoursPerDay) ||
    !inRange(p.breaks, L.breaks) ||
    !Number.isInteger(p.breaks) ||
    !inRange(p.breakMinutes, L.breakMinutes) ||
    !isTime(p.startTime) ||
    !isTime(p.endTime)
  ) {
    return { error: 'out_of_range' };
  }
  const span = toMinutes(p.endTime) - toMinutes(p.startTime);
  if (span <= 0) return { error: 'end_before_start' };
  const need = p.hoursPerDay * 60 + p.breaks * p.breakMinutes;
  if (need > span) return { error: 'span_too_short', needHours: round2(need / 60), spanHours: round2(span / 60) };
  return null;
}

// ---------- the day plan ----------

// The shape of every study day (HANDOFF.md §7 rule 8): session, break, session... with `breaks + 1`
// sessions of equal length, starting at startTime.
export function makeBlocks({ hoursPerDay, breaks, breakMinutes, startTime }) {
  const sessionMinutes = (hoursPerDay * 60) / (breaks + 1);
  const blocks = [];
  let t = toMinutes(startTime);
  for (let i = 0; i <= breaks; i++) {
    blocks.push({ type: 'session', start: toHHMM(t), lengthHours: round2(sessionMinutes / 60) });
    t += sessionMinutes;
    if (i < breaks) {
      blocks.push({ type: 'break', start: toHHMM(t), minutes: breakMinutes });
      t += breakMinutes;
    }
  }
  return blocks;
}

// The files of one course in the order they are studied (HANDOFF.md §7 rule 9): all chapters by their
// number, then all exercise files by their number. Files with an error (no estimate) are skipped.
export function studyOrder(course) {
  const usable = course.chapters.filter((ch) => ch.estimate && !ch.error);
  const byIndex = (a, b) => a.index - b.index;
  return [
    ...usable.filter((ch) => ch.kind !== 'exercises').sort(byIndex),
    ...usable.filter((ch) => ch.kind === 'exercises').sort(byIndex),
  ];
}

// How much of one file a part takes. Normally as much as fits: min(what the file needs, what the session
// has left). Two guards keep every part at least MIN_PART_MINUTES long:
//   - if taking that much would leave a tail shorter than the minimum, take less, so the tail is exactly
//     the minimum (it then gets its own part later);
//   - if the part itself would be shorter than the minimum, take nothing (returns 0).
// Files are never shorter than 30 min (hiHours is at least 0.5), so a whole file is always long enough.
function partMinutes(fileLeft, sessionLeft) {
  let used = Math.min(fileLeft, sessionLeft);
  const tail = fileLeft - used;
  if (tail > EPSILON && tail < MIN_PART_MINUTES) used = fileLeft - MIN_PART_MINUTES;
  return used >= MIN_PART_MINUTES - EPSILON ? used : 0;
}

// Builds the plan (HANDOFF.md §7 rules 7–12). Each session is filled with parts, in study order: the next
// unfinished file of the course whose exam is nearest and still after that day. When a file finishes before
// the session ends, the rest of the session goes to the next file (even of the next course), as long as at
// least 15 minutes are left. So a session can hold two or three files. No part is ever shorter than 15 min.
// Returns:
//   blocks    the day shape (makeBlocks)
//   days      [{ date, exams: [courseId], sessions: [{ slot, parts: [{ chapterId, hours }] }] }]
//             from tomorrow to the last exam; a session with nothing to study is left out
//   leftover  [{ chapterId, missingHours }] for files that did not fit (the «ما لحقنا لها وقت» list)
//   needHours the hours all files still need; haveHours the part that fits
// minutesLeft(chapter): how many minutes a file still needs (progress.js, HANDOFF.md §7 rules 16–17).
// By default a file needs its full hiHours. Files that need nothing and courses whose exam is today or
// earlier are left out.
export function buildPlan(courses, prefs, today, minutesLeft = (ch) => ch.estimate.hiHours * 60) {
  const blocks = makeBlocks(prefs);
  const sessionsPerDay = prefs.breaks + 1;
  const sessionMinutes = (prefs.hoursPerDay * 60) / sessionsPerDay;

  // Nearest exam first; two exams on the same day keep the order the courses were added in.
  const queue = [...courses]
    .filter((course) => course.examDate > today)
    .sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : a.order - b.order))
    .map((course) => ({
      course,
      files: studyOrder(course)
        .map((ch) => ({ id: ch.id, left: minutesLeft(ch) }))
        .filter((f) => f.left > EPSILON),
    }));
  const needMinutes = queue.reduce((sum, q) => sum + q.files.reduce((s, f) => s + f.left, 0), 0);

  const lastExam = courses.reduce((last, c) => (c.examDate > last ? c.examDate : last), today);
  const days = [];
  for (let date = addDays(today, 1); date <= lastExam; date = addDays(date, 1)) {
    const exams = courses.filter((c) => c.examDate === date).map((c) => c.id);
    const sessions = [];
    for (let slot = 0; slot < sessionsPerDay; slot++) {
      const parts = [];
      let sessionLeft = sessionMinutes;
      while (sessionLeft >= MIN_PART_MINUTES - EPSILON) {
        const live = queue.find((q) => q.course.examDate > date && q.files.some((f) => f.left > EPSILON));
        if (!live) break; // nothing left that can still be studied before its exam
        const file = live.files.find((f) => f.left > EPSILON);
        const used = partMinutes(file.left, sessionLeft);
        if (!used) break; // what would fit is shorter than 15 min: leave the rest of the session free
        file.left -= used;
        sessionLeft -= used;
        parts.push({ chapterId: file.id, hours: round2(used / 60) });
      }
      if (parts.length) sessions.push({ slot, parts });
    }
    days.push({ date, exams, sessions });
  }

  const leftover = queue.flatMap((q) =>
    q.files.filter((f) => f.left > EPSILON).map((f) => ({ chapterId: f.id, missingHours: round2(f.left / 60) })),
  );
  const leftMinutes = queue.reduce((sum, q) => sum + q.files.reduce((s, f) => s + Math.max(0, f.left), 0), 0);

  return {
    needHours: round2(needMinutes / 60),
    haveHours: round2((needMinutes - leftMinutes) / 60),
    blocks,
    days,
    leftover,
  };
}
