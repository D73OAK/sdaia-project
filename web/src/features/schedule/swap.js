// swap.js: «بدّل بين جلستين» (HANDOFF.md §7 rule 13). Pure functions, no UI.
// A session is found by its day and time slot: { date, slot }. Two sessions swap whole, with all their
// parts. A swap is allowed only if every part still lands before its course's exam day.

const sessionAt = (plan, { date, slot }) =>
  plan.days.find((d) => d.date === date)?.sessions.find((s) => s.slot === slot);

// True when the parts of `from` may move to the day of `to` (every part's exam is after that day).
function fitsOn(session, date, examOf) {
  return session.parts.every((p) => (examOf.get(p.chapterId) ?? '') > date);
}

// chapterId -> exam date of its course
export function examIndex(courses) {
  const map = new Map();
  for (const c of courses) for (const ch of c.chapters) map.set(ch.id, c.examDate);
  return map;
}

export function canSwap(plan, courses, a, b) {
  if (a.date === b.date && a.slot === b.slot) return false;
  const sa = sessionAt(plan, a);
  const sb = sessionAt(plan, b);
  if (!sa || !sb) return false;
  const examOf = examIndex(courses);
  return fitsOn(sa, b.date, examOf) && fitsOn(sb, a.date, examOf);
}

// The plan with the two sessions' parts exchanged. Hours, leftover and the day shape do not change.
export function swapSessions(plan, a, b) {
  const pa = sessionAt(plan, a).parts;
  const pb = sessionAt(plan, b).parts;
  const at = (date, slot) => (date === a.date && slot === a.slot ? pb : date === b.date && slot === b.slot ? pa : null);
  return {
    ...plan,
    days: plan.days.map((d) =>
      d.date !== a.date && d.date !== b.date
        ? d
        : { ...d, sessions: d.sessions.map((s) => ({ ...s, parts: at(d.date, s.slot) ?? s.parts })) },
    ),
  };
}
