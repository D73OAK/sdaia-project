// Popups 3a (preferences) and 3b (not enough time), used by the course list («خلصت، رتّب جدولي») and the
// schedule («غيّر ساعاتي»). Render it only while it is open: it starts from the saved preferences each time.
//   «اطلع جدولي»: check the numbers (§7 rule 11), build the plan as a draft, then (planFlow.js)
//     - something left over and there is a schedule -> popup 3b, nothing saved yet
//     - otherwise -> save the preferences and the plan, open the schedule
//   3b «ايه، أزيد ساعاتي» -> back to 3a with the draft numbers, nothing saved;
//      «لا، اطلع الجدول كذا» -> save the draft, open the schedule.
//   ✕ or Esc at any point closes without saving anything (HANDOFF.md §4).
// startAt="short" opens on popup 3b for a plan already saved (used by «رتّب الباقي»).
// Every plan starts from what is left to study (progress.js, §7 rules 16–17).
import { useState } from 'react';
import Button from '../../components/Button.jsx';
import { ErrorMessage, Input, Select } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import { fmtClock, fmtHours, fmtNumber, parseNumber, toArabicDigits } from '../../lib/format.js';
import { localToday, timeOptions } from '../../lib/options.js';
import { PREFS as T, PREFS_ERROR, SHORT } from '../../lib/strings.js';
import { go, ROUTES } from '../../routes.js';
import { useApp } from '../../state.jsx';
import { DEFAULT_PREFERENCES, buildPlan, validatePreferences } from './schedule.js';
import { minutesLeft } from './progress.js';
import { startFlow, step } from './planFlow.js';
import './plan-flow.css';

const TIMES = timeOptions();

// Saved preferences -> the strings shown in the form (numbers in Arabic digits).
const toForm = (p) => ({
  hoursPerDay: toArabicDigits(p.hoursPerDay),
  breaks: toArabicDigits(p.breaks),
  breakMinutes: toArabicDigits(p.breakMinutes),
  startTime: p.startTime,
  endTime: p.endTime,
});
const fromForm = (f) => ({
  hoursPerDay: parseNumber(f.hoursPerDay),
  breaks: parseNumber(f.breaks),
  breakMinutes: parseNumber(f.breakMinutes),
  startTime: f.startTime,
  endTime: f.endTime,
});

// The §8 text for a validatePreferences() problem.
function errorText(problem, prefs) {
  if (problem.error === 'out_of_range') return PREFS_ERROR.out_of_range;
  if (problem.error === 'end_before_start') return PREFS_ERROR.end_before_start;
  return PREFS_ERROR.span_too_short(
    fmtNumber(prefs.hoursPerDay),
    fmtNumber(prefs.breaks),
    fmtHours(problem.needHours),
    fmtClock(prefs.startTime),
    fmtClock(prefs.endTime),
    fmtHours(problem.spanHours),
  );
}

export default function PlanFlow({ onClose, startAt = 'prefs' }) {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState(() => toForm(state.preferences ?? DEFAULT_PREFERENCES));
  const [error, setError] = useState('');
  // { stage, draft }. Opened on 3b by «رتّب الباقي», the plan already saved is the draft.
  const [flow, setFlow] = useState(() =>
    startFlow(startAt, state.plan && state.preferences ? { preferences: state.preferences, plan: state.plan } : null),
  );
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  function submit(e) {
    e.preventDefault();
    const prefs = fromForm(form);
    const problem = validatePreferences(prefs);
    if (problem) {
      setError(errorText(problem, prefs));
      return;
    }
    setError('');
    const plan = buildPlan(state.courses, prefs, localToday(), (ch) => minutesLeft(ch, state.progress));
    send({ type: 'submit', preferences: prefs, plan });
  }

  // Runs one planFlow.js step: an accepted plan is saved and the schedule opens; otherwise the next popup.
  // ✕ or Esc calls onClose directly: nothing is saved before the student accepts.
  function send(event) {
    const r = step(flow, event);
    if (!r.save) return setFlow(r.flow);
    dispatch({ type: 'setPlan', ...r.save });
    onClose();
    go(ROUTES.schedule);
  }

  const { draft } = flow; // what 3b shows
  return (
    <>
      <Modal open={flow.stage === 'prefs'} title={T.title} onClose={onClose}>
        <form className="prefs" noValidate onSubmit={submit}>
          <Input id="pref-hours" label={T.hours} numeric value={form.hoursPerDay} onChange={set('hoursPerDay')} fieldClassName="prefs__field" />
          <Input id="pref-breaks" label={T.breaks} numeric value={form.breaks} onChange={set('breaks')} fieldClassName="prefs__field" />
          <Input id="pref-break-minutes" label={T.breakMinutes} numeric value={form.breakMinutes} onChange={set('breakMinutes')} fieldClassName="prefs__field" />
          <Select id="pref-start" label={T.start} options={TIMES} value={form.startTime} onChange={set('startTime')} fieldClassName="prefs__field prefs__field--time" />
          <Select id="pref-end" label={T.end} options={TIMES} value={form.endTime} onChange={set('endTime')} fieldClassName="prefs__field prefs__field--time" />
          <ErrorMessage id="pref-error">{error}</ErrorMessage>
          <div className="modal__actions">
            <Button type="submit">{T.submit}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={flow.stage === 'short' && Boolean(draft)}
        title={SHORT.title}
        onClose={onClose}
        actions={
          <>
            <Button variant="secondary" onClick={() => send({ type: 'keep' })}>
              {SHORT.keep}
            </Button>
            <Button onClick={() => send({ type: 'more' })}>{SHORT.more}</Button>
          </>
        }
      >
        {draft && (
          <p>
            {SHORT.text(
              fmtHours(draft.plan.needHours),
              fmtNumber(draft.preferences.hoursPerDay),
              fmtHours(draft.plan.haveHours),
            )}
          </p>
        )}
      </Modal>
    </>
  );
}
