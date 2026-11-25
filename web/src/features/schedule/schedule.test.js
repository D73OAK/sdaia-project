import { describe, expect, it } from 'vitest';
// The sample data at the repo root (its plan was made with buildPlan; this test keeps the two in step).
import mock from '../../../../mock.json';
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
    expect(plan.days[0].sessions[0]).toEqual({ slot: 0, chapterId: 'c1-ch1', hours: 1.33 });
  });

  it('never puts a session on or after its own course exam day', () => {
    for (const day of plan.days) {
      for (const s of day.sessions) expect(day.date < courseOf(s.chapterId).examDate).toBe(true);
    }
  });

  it('keeps sessions of other courses on an exam day (the exam-day fix)', () => {
    const examDay = plan.days.find((d) => d.date === '2026-11-30');
    expect(examDay.exams).toEqual(['c1']);
    expect(examDay.sessions.length).toBeGreaterThan(0);
    expect(examDay.sessions.every((s) => courseOf(s.chapterId).id === 'c2')).toBe(true);
  });

  it('studies all chapters of a course before its exercise file', () => {
    const order = plan.days.flatMap((d) => d.sessions.map((s) => s.chapterId)).filter((id) => id.startsWith('c1-'));
    expect(order.indexOf('c1-ch4')).toBeGreaterThan(order.lastIndexOf('c1-ch3'));
  });

  it('puts what does not fit in leftover, and the hours add up', () => {
    expect(plan.leftover).toEqual([{ chapterId: 'c1-ch4', missingHours: 4.83 }]);
    expect(plan.needHours).toBe(47.5); // the sum of every hiHours
    // Each session's hours are rounded to 2 decimals (1.33), so their sum may drift by up to 0.01 per session.
    const sessions = plan.days.flatMap((d) => d.sessions);
    const scheduled = sessions.reduce((s, x) => s + x.hours, 0);
    expect(Math.abs(scheduled - plan.haveHours)).toBeLessThanOrEqual(0.01 * sessions.length);
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
    expect(p.days.slice(0, 3).map((d) => d.sessions[0].chapterId)).toEqual(['a-2', 'a-1', 'a-0']);
  });

  it('gives an exam day to the next course and lists every exam on it', () => {
    const a = course('a', '2026-11-26', 1, [['lecture', 1, 5]]);
    const b = course('b', '2026-11-26', 2, [['lecture', 1, 1]]);
    const c = course('c', '2026-11-28', 3, [['lecture', 1, 2]]);
    const p = buildPlan([a, b, c], prefs(2), '2026-11-24');
    expect(p.days.map((d) => d.date)).toEqual(['2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28']);
    expect(p.days[1].exams).toEqual(['a', 'b']);
    expect(p.days[1].sessions).toEqual([{ slot: 0, chapterId: 'c-0', hours: 2 }]);
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
