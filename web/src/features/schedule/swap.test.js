import { describe, expect, it } from 'vitest';
import mock from '../../data/mock.json';
import { canSwap, swapSessions } from './swap.js';

const { courses } = mock;
const { _note, ...plan } = mock.plan;
const partsAt = (p, date, slot) => p.days.find((d) => d.date === date).sessions.find((s) => s.slot === slot).parts;

describe('swap sessions (HANDOFF.md §7 rule 13)', () => {
  // 25 Nov slot 0: الرياضيات ١ (exam 30 Nov). 1 Dec slot 0: الإحصاء (exam 3 Dec).
  const math = { date: '2026-11-25', slot: 0 };
  const stats = { date: '2026-12-01', slot: 0 };
  const sameDay = { date: '2026-11-25', slot: 2 };

  it('allows a swap when every part stays before its exam', () => {
    expect(canSwap(plan, courses, math, sameDay)).toBe(true);
    // الإحصاء (exam 3 Dec) to 2 Dec and Data Structures (exam 6 Dec) to 1 Dec
    expect(canSwap(plan, courses, stats, { date: '2026-12-02', slot: 0 })).toBe(true);
  });

  it('refuses a swap that moves a part to or after its exam day', () => {
    // الرياضيات ١ to 1 Dec: after its exam on 30 Nov
    expect(canSwap(plan, courses, math, stats)).toBe(false);
    expect(canSwap(plan, courses, stats, math)).toBe(false);
  });

  it('checks every part of a session with two files', () => {
    // 1 Dec slot 2: الإحصاء + Data Structures; to 3 Dec (the الإحصاء exam day) is not allowed
    expect(canSwap(plan, courses, { date: '2026-12-01', slot: 2 }, { date: '2026-12-03', slot: 0 })).toBe(false);
  });

  it('picking the same session is not a swap', () => {
    expect(canSwap(plan, courses, math, math)).toBe(false);
  });

  it('swaps the whole sessions with all their parts', () => {
    const a = { date: '2026-11-26', slot: 0 }; // two parts: ch1 1 h + ch2 0.33 h
    const b = { date: '2026-11-27', slot: 1 }; // one part
    const before = [partsAt(plan, a.date, a.slot), partsAt(plan, b.date, b.slot)];
    const swapped = swapSessions(plan, a, b);
    expect(partsAt(swapped, a.date, a.slot)).toEqual(before[1]);
    expect(partsAt(swapped, b.date, b.slot)).toEqual(before[0]);
    expect(swapped.leftover).toEqual(plan.leftover);
    expect(partsAt(plan, a.date, a.slot)).toEqual(before[0]); // the old plan is not changed
  });
});
