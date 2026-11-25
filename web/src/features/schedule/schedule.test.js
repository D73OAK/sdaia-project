import { describe, expect, it } from 'vitest';
// The sample data (its plan was made with buildPlan; this test keeps the two in step).
import mock from '../../data/mock.json';
import {
  DEFAULT_PREFERENCES,
  addDays,
  buildPlan,
  makeBlocks,
  studyOrder,
  toHHMM,
  toMinutes,
  validatePreferences,
} from './schedule.js';

const { _note, ...mockPlan } = mock.plan;
const plan = buildPlan(mock.courses, mock.preferences, mock.today);
const courseOf = (chapterId) => mock.courses.find((c) => c.chapters.some((ch) => ch.id === chapterId));
// Every part of every session, in time order, with its date.
const partsOf = (p) => p.days.flatMap((d) => d.sessions.flatMap((s) => s.parts.map((x) => ({ date: d.date, ...x }))));

// A small course for hand-made cases. hours = hiHours of each file.
const course = (id, examDate, order, files) => ({
  id,
  examDate,
  order,
  chapters: files.map(([kind, index, hours], i) => ({
    id: `${id}-${i}`,
    kind,
    index,
    estimate: { loHours: hours, hiHours: hours, reason: '' },
  })),
});
const prefs = (hoursPerDay, breaks = 0, breakMinutes = 30) => ({
  hoursPerDay,
  breaks,
  breakMinutes,
  startTime: '16:00',
  endTime: '23:30',
});

describe('buildPlan with mock.json', () => {
  it('matches the plan stored in mock.json', () => {
    expect(plan).toEqual(mockPlan);
  });

  it('runs from tomorrow to the last exam', () => {
    expect(plan.days[0].date).toBe('2026-11-25');
    expect(plan.days.at(-1).date).toBe('2026-12-08');
    expect(plan.days).toHaveLength(14);
  });

  it('starts tomorrow with the course whose exam is nearest', () => {
    expect(plan.days[0].sessions[0]).toEqual({ slot: 0, parts: [{ chapterId: 'c1-ch1', hours: 1.33 }] });
  });

  it('never puts a session on or after its own course exam day', () => {
    for (const part of partsOf(plan)) expect(part.date < courseOf(part.chapterId).examDate).toBe(true);
  });

  it('keeps sessions of other courses on an exam day (the exam-day fix)', () => {
    const examDay = plan.days.find((d) => d.date === '2026-11-30');
    expect(examDay.exams).toEqual(['c1']);
    expect(examDay.sessions.length).toBeGreaterThan(0);
    expect(examDay.sessions.flatMap((s) => s.parts).every((x) => courseOf(x.chapterId).id === 'c2')).toBe(true);
  });

  it('studies all chapters of a course before its exercise file', () => {
    const order = partsOf(plan).map((x) => x.chapterId).filter((id) => id.startsWith('c1-'));
    expect(order.indexOf('c1-ch4')).toBeGreaterThan(order.lastIndexOf('c1-ch3'));
  });

  it('never makes a part shorter than 15 minutes', () => {
    expect(Math.min(...partsOf(plan).map((x) => x.hours))).toBeGreaterThanOrEqual(0.25);
  });

  it('uses the rest of a session for the next file, even of the next course', () => {
    const dec1 = plan.days.find((d) => d.date === '2026-12-01');
    expect(dec1.sessions[2].parts.map((x) => x.chapterId)).toEqual(['c2-ch2', 'c3-ch1']);
  });

  it('puts what does not fit in leftover, and the hours add up', () => {
    expect(plan.leftover).toEqual([{ chapterId: 'c1-ch4', missingHours: 4 }]);
    expect(plan.needHours).toBe(47.5); // the sum of every hiHours
    expect(plan.haveHours).toBe(43.5);
    // Each part's hours are rounded to 2 decimals (1.33), so their sum may drift by up to 0.01 per part.
    const parts = partsOf(plan);
    const scheduled = parts.reduce((s, x) => s + x.hours, 0);
    expect(Math.abs(scheduled - plan.haveHours)).toBeLessThanOrEqual(0.01 * parts.length);
    expect(plan.haveHours + plan.leftover[0].missingHours).toBeCloseTo(plan.needHours, 1);
  });
});

describe('buildPlan with hand-made courses', () => {
  it('orders chapters by number, then exercise files, whatever order they were stored in', () => {
    const c = course('a', '2026-11-30', 1, [
      ['exercises', 1, 1],
      ['lecture', 2, 1],
      ['lecture', 1, 1],
    ]);
    const p = buildPlan([c], prefs(1), '2026-11-24');
    expect(p.days.slice(0, 3).map((d) => d.sessions[0].parts[0].chapterId)).toEqual(['a-2', 'a-1', 'a-0']);
  });

  it('gives an exam day to the next course and lists every exam on it', () => {
    const a = course('a', '2026-11-26', 1, [['lecture', 1, 5]]);
    const b = course('b', '2026-11-26', 2, [['lecture', 1, 1]]);
    const c = course('c', '2026-11-28', 3, [['lecture', 1, 2]]);
    const p = buildPlan([a, b, c], prefs(2), '2026-11-24');
    expect(p.days.map((d) => d.date)).toEqual(['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28']);
    expect(p.days[1].exams).toEqual(['a', 'b']);
    expect(p.days[1].sessions).toEqual([{ slot: 0, parts: [{ chapterId: 'c-0', hours: 2 }] }]);
  });

  it('makes an empty plan when every exam is tomorrow', () => {
    const a = course('a', '2026-11-25', 1, [['lecture', 1, 3]]);
    const p = buildPlan([a], DEFAULT_PREFERENCES, '2026-11-24');
    expect(p.days).toEqual([{ date: '2026-11-25', exams: ['a'], sessions: [] }]);
    expect(p).toMatchObject({ needHours: 3, haveHours: 0, leftover: [{ chapterId: 'a-0', missingHours: 3 }] });
  });

  it('skips files with an error and handles no courses at all', () => {
    const a = course('a', '2026-11-27', 1, [['lecture', 1, 1]]);
    a.chapters.push({ id: 'bad', kind: 'lecture', index: 2, error: 'not_pdf' });
    expect(studyOrder(a).map((ch) => ch.id)).toEqual(['a-0']);
    expect(buildPlan([], DEFAULT_PREFERENCES, '2026-11-24')).toMatchObject({ days: [], leftover: [], needHours: 0 });
  });

  it('crosses a month and a year end', () => {
    const a = course('a', '2027-01-02', 1, [['lecture', 1, 1]]);
    expect(buildPlan([a], prefs(1), '2026-12-30').days.map((d) => d.date)).toEqual([
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ]);
  });
});

describe('parts: using the rest of a session', () => {
  // 4 h a day with 2 breaks = three 80-minute sessions.
  const eighty = { ...prefs(4, 2), breakMinutes: 10 };

  it('a 1 h file in an 80 min session leaves 20 min for the next file', () => {
    const a = course('a', '2026-11-27', 1, [['lecture', 1, 1], ['lecture', 2, 1]]);
    const day = buildPlan([a], eighty, '2026-11-24').days[0];
    expect(day.sessions[0].parts).toEqual([
      { chapterId: 'a-0', hours: 1 },
      { chapterId: 'a-1', hours: 0.33 },
    ]);
    expect(day.sessions[1].parts).toEqual([{ chapterId: 'a-1', hours: 0.67 }]);
  });

  it('holds up to three files in one session', () => {
    const a = course('a', '2026-11-27', 1, [['lecture', 1, 0.5], ['lecture', 2, 0.5], ['lecture', 3, 0.5]]);
    const day = buildPlan([a], eighty, '2026-11-24').days[0];
    expect(day.sessions[0].parts.map((x) => x.chapterId)).toEqual(['a-0', 'a-1', 'a-2']);
  });

  it('never creates a part under 15 min: less than 15 min left in the session stays free', () => {
    // 3.5 h with 2 breaks = three 70-minute sessions: a 1 h file leaves only 10 min.
    const a = course('a', '2026-11-27', 1, [['lecture', 1, 1], ['lecture', 2, 1]]);
    const day = buildPlan([a], { ...prefs(3.5, 2), breakMinutes: 10 }, '2026-11-24').days[0];
    expect(day.sessions[0].parts).toEqual([{ chapterId: 'a-0', hours: 1 }]);
    expect(day.sessions[1].parts).toEqual([{ chapterId: 'a-1', hours: 1 }]);
  });

  it('never creates a part under 15 min: no file is cut so that less than 15 min of it is left', () => {
    // 20 min are free after the 1 h file, but taking 20 of the 30-min file would leave 10 min of it.
    // So the session takes 15 min, and the last 15 min get their own part.
    const a = course('a', '2026-11-27', 1, [['lecture', 1, 1], ['lecture', 2, 0.5]]);
    const day = buildPlan([a], eighty, '2026-11-24').days[0];
    expect(day.sessions[0].parts).toEqual([
      { chapterId: 'a-0', hours: 1 },
      { chapterId: 'a-1', hours: 0.25 },
    ]);
    expect(day.sessions[1].parts).toEqual([{ chapterId: 'a-1', hours: 0.25 }]);
  });
});

describe('makeBlocks', () => {
  it('splits the day into breaks + 1 equal sessions with breaks between', () => {
    expect(makeBlocks(mock.preferences)).toEqual(mock.plan.blocks);
    expect(makeBlocks({ hoursPerDay: 3, breaks: 0, breakMinutes: 15, startTime: '08:30' })).toEqual([
      { type: 'session', start: '08:30', lengthHours: 3 },
    ]);
  });
});

describe('validatePreferences', () => {
  it('accepts the defaults', () => {
    expect(validatePreferences(DEFAULT_PREFERENCES)).toBeNull();
  });
  it('rejects empty or out-of-range numbers', () => {
    for (const bad of [
      { hoursPerDay: 0 },
      { hoursPerDay: 15 },
      { hoursPerDay: NaN },
      { breaks: 7 },
      { breaks: 1.5 },
      { breakMinutes: 4 },
      { breakMinutes: 91 },
      { startTime: '' },
    ]) {
      expect(validatePreferences({ ...DEFAULT_PREFERENCES, ...bad })).toEqual({ error: 'out_of_range' });
    }
  });
  it('needs the end after the start', () => {
    expect(validatePreferences({ ...DEFAULT_PREFERENCES, startTime: '22:00', endTime: '16:00' })).toEqual({
      error: 'end_before_start',
    });
  });
  it('needs study and breaks to fit between start and end', () => {
    const p = { hoursPerDay: 6, breaks: 3, breakMinutes: 30, startTime: '18:00', endTime: '22:00' };
    expect(validatePreferences(p)).toEqual({ error: 'span_too_short', needHours: 7.5, spanHours: 4 });
  });
});

describe('time and date helpers', () => {
  it('converts times', () => {
    expect(toMinutes('17:20')).toBe(1040);
    expect(toHHMM(1040)).toBe('17:20');
    expect(toHHMM(1049.6)).toBe('17:30');
  });
  it('adds days across a month end and a year end', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
  });
});
