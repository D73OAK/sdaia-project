// Popup 4b «وش خلصت من الشابترات؟» (HANDOFF.md §7 rule 17).
// Each course still to study for (exam after today), in its colour, with its files as checkboxes.
// Files already finished are ticked. «رتّب الباقي» saves the ticks and builds a new plan from tomorrow;
// then the parent shows popup 3b if something is left over. ✕ or Esc close with no change.
import { useState } from 'react';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import { fmtNumber } from '../../lib/format.js';
import { localToday } from '../../lib/options.js';
import { RESCHEDULE as T, fileLabel } from '../../lib/strings.js';
import { useApp } from '../../state.jsx';
import { activeCourses, applyChecks, isFinished, minutesLeft } from './progress.js';
import { buildPlan, studyOrder } from './schedule.js';
import { needsShortPopup } from './view.js';

// onDone({ short }) runs after the new plan is saved: short = show popup 3b.
export default function RescheduleModal({ onClose, onDone }) {
  const { state, dispatch } = useApp();
  const today = localToday();
  const courses = activeCourses(state.courses, today).sort((a, b) => a.order - b.order);
  const [checked, setChecked] = useState(() =>
    courses.flatMap((c) => studyOrder(c)).filter((ch) => isFinished(ch, state.progress)).map((ch) => ch.id),
  );
  const toggle = (id) => setChecked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  function submit(e) {
    e.preventDefault();
    const progress = applyChecks(state.courses, state.progress, checked, today);
    const plan = buildPlan(state.courses, state.preferences, today, (ch) => minutesLeft(ch, progress));
    dispatch({ type: 'replan', progress, plan });
    onDone({ short: needsShortPopup(plan) });
  }

  return (
    <Modal open title={T.title} onClose={onClose}>
      <form className="reschedule" noValidate onSubmit={submit}>
        <p className="reschedule__hint">{T.hint}</p>
        {courses.map((course) => (
          <fieldset key={course.id} className="reschedule__course" style={{ '--course': `var(--c${course.order})` }}>
            <legend className="reschedule__name">
              <span className="reschedule__dot" aria-hidden="true" />
              <bdi>{course.name}</bdi>
            </legend>
            <div className="reschedule__files">
              {studyOrder(course).map((ch) => (
                <label key={ch.id} className="check">
                  <input type="checkbox" checked={checked.includes(ch.id)} onChange={() => toggle(ch.id)} />
                  <span>{fileLabel(ch.kind, fmtNumber(ch.index))}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <div className="modal__actions">
          <Button type="submit">{T.submit}</Button>
        </div>
      </form>
    </Modal>
  );
}
