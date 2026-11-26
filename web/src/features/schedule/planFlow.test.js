import { describe, expect, it } from 'vitest';
import { startFlow, step } from './planFlow.js';

const prefs = { hoursPerDay: 2, breaks: 1, breakMinutes: 15, startTime: '16:00', endTime: '22:00' };
const fits = { leftover: [], days: [{ sessions: [{}] }] };
const short = { leftover: [{ chapterId: 'c1-ch3' }], days: [{ sessions: [{}] }] };

// Runs events from a start. Returns the flow it stopped on and what would be saved (null: nothing yet).
// A save ends the flow (the schedule opens), so nothing may follow it.
function run(flow, events) {
  for (const e of events) {
    const r = step(flow, e);
    if (r.save) return { flow, saved: r.save };
    flow = r.flow;
  }
  return { flow, saved: null };
}

describe('popups 3a and 3b (HANDOFF.md §4): the plan is a draft until the student accepts it', () => {
  it('a plan that fits is saved, and the schedule opens', () => {
    expect(run(startFlow(), [{ type: 'submit', preferences: prefs, plan: fits }]).saved).toEqual({ preferences: prefs, plan: fits });
  });

  it('a plan with leftover goes to 3b and saves nothing yet, so ✕ or Esc there loses nothing', () => {
    const { flow, saved } = run(startFlow(), [{ type: 'submit', preferences: prefs, plan: short }]);
    expect(saved).toBeNull();
    expect(flow).toEqual({ stage: 'short', draft: { preferences: prefs, plan: short } });
  });

  it('3b «لا، اطلع الجدول كذا» saves the draft and opens the schedule', () => {
    const { saved } = run(startFlow(), [{ type: 'submit', preferences: prefs, plan: short }, { type: 'keep' }]);
    expect(saved).toEqual({ preferences: prefs, plan: short });
  });

  it('3b «ايه، أزيد ساعاتي» goes back to 3a and saves nothing', () => {
    const { flow, saved } = run(startFlow(), [{ type: 'submit', preferences: prefs, plan: short }, { type: 'more' }]);
    expect(saved).toBeNull();
    expect(flow).toEqual({ stage: 'prefs', draft: null });
  });

  it('a second try after «ايه، أزيد ساعاتي» that fits is saved', () => {
    const more = { ...prefs, hoursPerDay: 5 };
    const { saved } = run(startFlow(), [
      { type: 'submit', preferences: prefs, plan: short },
      { type: 'more' },
      { type: 'submit', preferences: more, plan: fits },
    ]);
    expect(saved).toEqual({ preferences: more, plan: fits });
  });

  it('opened on 3b by «رتّب الباقي»: the saved plan is the draft, and «لا» keeps it', () => {
    const saved = { preferences: prefs, plan: short };
    const flow = startFlow('short', saved);
    expect(flow).toEqual({ stage: 'short', draft: saved });
    expect(run(flow, [{ type: 'keep' }]).saved).toBe(saved);
  });

  it('a normal start has no draft', () => expect(startFlow('prefs', { preferences: prefs, plan: fits }).draft).toBeNull());
});
