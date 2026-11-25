import { describe, expect, it } from 'vitest';
import mock from '../../data/mock.json';
import { fileIndex, hasAnySession, needsShortPopup, sessionAt, sessionParts, weekCount, weekDays } from './view.js';

const plan = mock.plan; // 14 days from 2026-11-25, leftover: 4 h of c1-ch4

describe('plan views', () => {
  it('counts weeks and lists the 7 days of each week, null after the last exam', () => {
    expect(weekCount(plan)).toBe(2);
    const w0 = weekDays(plan, 0);
    expect(w0.map((d) => d.date)).toEqual([
      '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01',
    ]);
    const w1 = weekDays(plan, 1);
    expect(w1.at(-1)).toEqual({ date: '2026-12-08', day: plan.days[13] });
    expect(weekDays({ ...plan, days: plan.days.slice(0, 9) }, 1).at(-1).day).toBeNull();
  });

  it('shows the not-enough-time popup only with leftover and a schedule', () => {
    expect(needsShortPopup(plan)).toBe(true);
    expect(needsShortPopup({ ...plan, leftover: [] })).toBe(false);
    const empty = { ...plan, days: [{ date: '2026-11-25', exams: ['c1'], sessions: [] }] };
    expect(hasAnySession(empty)).toBe(false);
    expect(needsShortPopup(empty)).toBe(false);
  });

  it('turns a session into named, coloured parts', () => {
    const index = fileIndex(mock.courses);
    const nov26 = plan.days[1];
    const parts = sessionParts(sessionAt(nov26, 0), index);
    expect(parts.map((p) => [p.courseName, p.colorIndex, p.kind, p.index, p.hours])).toEqual([
      ['الرياضيات ١', 1, 'lecture', 1, 1],
      ['الرياضيات ١', 1, 'lecture', 2, 0.33],
    ]);
    expect(sessionAt(nov26, 5)).toBeUndefined();
  });
});
