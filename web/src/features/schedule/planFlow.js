// planFlow.js: what popups 3a (preferences) and 3b (not enough time) do, as a pure state machine, so
// "✕ or Esc changes nothing" (HANDOFF.md §4) can be tested. PlanFlow.jsx only shows it.
//
// The plan is a DRAFT until the student accepts it; only accepting saves:
//   3a «اطلع جدولي»:  no leftover -> save and open the schedule;  leftover -> 3b with the draft
//   3b «لا، اطلع الجدول كذا» -> save the draft and open the schedule
//   3b «ايه، أزيد ساعاتي»    -> back to 3a (the form keeps the draft numbers), nothing saved
//   ✕ or Esc at any point    -> PlanFlow closes; nothing was saved, because nothing is saved before accepting
// startAt 'short' opens 3b for a plan already saved («رتّب الباقي», §7 rule 17): that plan is the draft.
//
// step(flow, event) -> { flow } to show next, or { save: { preferences, plan } } to save and open the schedule
//   flow { stage: 'prefs' | 'short', draft: { preferences, plan } | null }
import { needsShortPopup } from './view.js';

export const startFlow = (startAt = 'prefs', saved = null) => ({
  stage: startAt,
  draft: startAt === 'short' ? saved : null,
});

export function step(flow, event) {
  switch (event.type) {
    case 'submit': {
      // event: { preferences, plan }, already checked and built from the form
      const draft = { preferences: event.preferences, plan: event.plan };
      return needsShortPopup(event.plan) ? { flow: { stage: 'short', draft } } : { save: draft };
    }
    case 'keep': // 3b «لا، اطلع الجدول كذا»
      return { save: flow.draft };
    case 'more': // 3b «ايه، أزيد ساعاتي»
      return { flow: { stage: 'prefs', draft: null } };
    default:
      throw new Error(`Unknown event: ${event.type}`);
  }
}
