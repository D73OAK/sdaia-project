import { describe, expect, it } from 'vitest';
import mock from '../../data/mock.json';
import { buildPlan } from './schedule.js';
import { allFinished, applyChecks, emptyProgress, isFinished, minutesLeft, planTotals, settlePlan } from './progress.js';

const { courses, preferences } = mock;
const { _note, ...plan } = mock.plan; // built on 2026-11-24: days 25 Nov – 8 Dec
const ch = (id) => courses.flatMap((c) => c.chapters).find((x) => x.id === id);
const partsOn = (p, date) => p.days.find((d) => d.date === date)?.sessions.flatMap((s) => s.parts) ?? [];

describe('minutesLeft / isFinished', () => {
  it('a new file needs its full hiHours', () => {
    expect(minutesLeft(ch('c1-ch1'), emptyProgress())).toBe(300); // 5 h
  });
  it('studied hours come off; a ticked file needs nothing', () => {
    expect(minutesLeft(ch('c1-ch1'), { studied: { 'c1-ch1': 2 }, finished: [] })).toBe(180);
    expect(minutesLeft(ch('c1-ch1'), { studied: {}, finished: ['c1-ch1'] })).toBe(0);
  });
  it('less than 15 minutes left counts as finished', () => {
    expect(isFinished(ch('c1-ch1'), { studied: { 'c1-ch1': 4.99 }, finished: [] })).toBe(true);
    expect(isFinished(ch('c1-ch1'), { studied: { 'c1-ch1': 4.5 }, finished: [] })).toBe(false);
  });
});

describe('settlePlan: the schedule always starts tomorrow (§7 rule 16)', () => {
  it('changes nothing on the day the plan was made', () => {
    expect(settlePlan(plan, courses, emptyProgress(), '2026-11-24').changed).toBe(false);
  });

  // Two days later: 25 and 26 Nov have passed (26 is "today", also before tomorrow).
  const r = settlePlan(plan, courses, emptyProgress(), '2026-11-26');

  it('hides every day before tomorrow, so the plan starts on the real tomorrow', () => {
    expect(r.changed).toBe(true);
    expect(r.plan.days[0].date).toBe('2026-11-27');
    expect(r.plan.days).toHaveLength(12);
  });

  it('counts the sessions of those days as studied', () => {
    // 25 Nov: 3 × 1.33 of ch1; 26 Nov: 1 h of ch1, then 0.33 + 1.33 + 1.33 of ch2
    expect(r.progress.studied).toEqual({ 'c1-ch1': 4.99, 'c1-ch2': 2.99 });
    expect(isFinished(ch('c1-ch1'), r.progress)).toBe(true); // all its sessions passed
    expect(minutesLeft(ch('c1-ch2'), r.progress) / 60).toBeCloseTo(3.51, 2); // partly studied
  });

  it('counts hours and leftover from the days still to come only', () => {
    expect(r.plan.leftover).toEqual([{ chapterId: 'c1-ch4', missingHours: 4.01 }]);
    expect(r.plan.needHours).toBeCloseTo(47.5 - 4.99 - 2.99, 1);
    expect(r.plan.haveHours + 4.01).toBeCloseTo(r.plan.needHours, 1);
  });

  it('a plan whose days have all passed is empty', () => {
    const late = settlePlan(plan, courses, emptyProgress(), '2026-12-09');
    expect(late.plan.days).toEqual([]);
    expect(late.plan.leftover).toEqual([]); // every exam has passed
  });
});

describe('new plans start from what is left', () => {
  it('a partly studied file keeps only its remaining hours; a finished file is skipped', () => {
    const progress = { studied: { 'c1-ch1': 5, 'c1-ch2': 3 }, finished: [] };
    const p = buildPlan(courses, preferences, '2026-11-26', (c) => minutesLeft(c, progress));
    const ids = p.days.flatMap((d) => d.sessions.flatMap((s) => s.parts.map((x) => x.chapterId)));
    expect(ids).not.toContain('c1-ch1');
    expect(p.days[0].date).toBe('2026-11-27');
    expect(p.days[0].sessions[0].parts[0].chapterId).toBe('c1-ch2');
    // c1-ch2 needs 6.5 − 3 = 3.5 h
    const ch2 = p.days.flatMap((d) => d.sessions.flatMap((s) => s.parts)).filter((x) => x.chapterId === 'c1-ch2');
    expect(ch2.reduce((s, x) => s + x.hours, 0)).toBeCloseTo(3.5, 1);
    expect(p.needHours).toBeCloseTo(47.5 - 5 - 3, 2);
  });

  it('leaves out courses whose exam has passed', () => {
    const p = buildPlan(courses, preferences, '2026-11-30', (c) => minutesLeft(c, emptyProgress()));
    const ids = p.days.flatMap((d) => d.sessions.flatMap((s) => s.parts.map((x) => x.chapterId)));
    expect(ids.some((id) => id.startsWith('c1-'))).toBe(false); // الرياضيات ١: exam on 30 Nov
    expect(p.leftover.some((l) => l.chapterId.startsWith('c1-'))).toBe(false);
  });

  it('planTotals of a fresh plan match buildPlan (within the 0.01 h rounding of part hours)', () => {
    const t = planTotals(plan, courses, emptyProgress(), '2026-11-24');
    expect(t.needHours).toBe(plan.needHours);
    expect(t.haveHours).toBeCloseTo(plan.haveHours, 1); // 43.49 vs 43.5: both show «٤٣٫٥»
    expect(t.leftover.map((l) => l.chapterId)).toEqual(plan.leftover.map((l) => l.chapterId));
    expect(t.leftover[0].missingHours).toBeCloseTo(plan.leftover[0].missingHours, 1);
  });
});

describe('applyChecks: «رتّب الباقي» (§7 rule 17)', () => {
  const after26 = { studied: { 'c1-ch1': 4.99, 'c1-ch2': 2.99 }, finished: [] }; // ch1 finished by itself

  it('ticked files become finished and need 0 hours', () => {
    const p = applyChecks(courses, after26, ['c1-ch1', 'c2-ch1'], '2026-11-26');
    expect(isFinished(ch('c2-ch1'), p)).toBe(true);
    expect(minutesLeft(ch('c2-ch1'), p)).toBe(0);
  });

  it('unticking a file that was finished makes it need its full hiHours again', () => {
    const p = applyChecks(courses, after26, [], '2026-11-26');
    expect(minutesLeft(ch('c1-ch1'), p)).toBe(300);
  });

  it('a partly studied file that stays unticked keeps its remaining hours', () => {
    const p = applyChecks(courses, after26, ['c1-ch1'], '2026-11-26');
    expect(minutesLeft(ch('c1-ch2'), p) / 60).toBeCloseTo(3.51, 2);
  });

  it('files of courses whose exam has passed are left alone', () => {
    const before = { studied: {}, finished: ['c1-ch3'] };
    expect(applyChecks(courses, before, [], '2026-12-01').finished).toEqual(['c1-ch3']);
  });

  it('when every file is finished there is nothing to plan', () => {
    const all = courses.flatMap((c) => c.chapters.map((x) => x.id));
    const p = applyChecks(courses, emptyProgress(), all, '2026-11-24');
    expect(allFinished(courses, p, '2026-11-24')).toBe(true);
    const plan2 = buildPlan(courses, preferences, '2026-11-24', (c) => minutesLeft(c, p));
    expect(plan2.days.every((d) => d.sessions.length === 0)).toBe(true);
    expect(plan2.leftover).toEqual([]);
    expect(allFinished(courses, emptyProgress(), '2026-11-24')).toBe(false);
  });
});
