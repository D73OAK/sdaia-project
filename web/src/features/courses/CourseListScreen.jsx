// Screen 3: the course list (HANDOFF.md §2). One card per course in its colour, with its hours range.
// «+ إضافة مادة أخرى» adds another course; «خلصت، رتّب جدولي» opens the preferences popup (3a).
// States (HANDOFF.md §4): empty list, 6 courses, and the mint ✓ on the course just saved.
import { useEffect, useState } from 'react';
import Button from '../../components/Button.jsx';
import { CourseCard } from '../../components/Cards.jsx';
import { fmtRange } from '../../lib/format.js';
import { APP_NAME, BADGE, COURSE_EDIT, COURSE_LIMIT, COURSE_LIST as T } from '../../lib/strings.js';
import { go, ROUTES } from '../../routes.js';
import { useApp } from '../../state.jsx';
import { courseTotal } from '../estimate/estimate.js';
import PlanFlow from '../schedule/PlanFlow.jsx';
import { canAddCourse, colorIndexOf } from './courses.js';
import './course-list.css';

export default function CourseListScreen() {
  const { state, dispatch } = useApp();
  const { courses } = state;
  const [newId] = useState(state.lastAddedId); // the ✓ stays while this screen is open
  const [planning, setPlanning] = useState(false);
  const canAdd = canAddCourse(courses);

  // Shown once: next time the list opens, no course is "new".
  useEffect(() => {
    if (newId) dispatch({ type: 'seenNew' });
  }, [newId, dispatch]);

  return (
    <section className="screen course-list" aria-labelledby="list-title">
      <div className="topbar">
        <h1 id="list-title">{T.title}</h1>
        <span className="topbar__app">{APP_NAME}</span>
      </div>

      {courses.length === 0 ? (
        <p className="course-list__empty">{T.empty}</p>
      ) : (
        <ul className="course-list__cards">
          {courses.map((c) => {
            const total = courseTotal(c.chapters);
            return (
              <li key={c.id}>
                <CourseCard
                  name={c.name}
                  colorIndex={colorIndexOf(c)}
                  hoursText={BADGE.hours(fmtRange(total.loHours, total.hiHours), total.hiHours)}
                  isNew={c.id === newId}
                  onClick={() => go(ROUTES.courseEdit(c.id))}
                  label={`${COURSE_EDIT.openCourse(c.name)}، ${BADGE.hours(fmtRange(total.loHours, total.hiHours), total.hiHours)}`}
                />
              </li>
            );
          })}
        </ul>
      )}

      {!canAdd && (
        <p className="course-list__full" role="status">
          {COURSE_LIMIT}
        </p>
      )}

      <div className="course-list__actions">
        <Button disabled={!canAdd} onClick={() => go(ROUTES.courseNew)}>
          {courses.length ? T.add : T.addFirst}
        </Button>
        <Button variant="secondary" disabled={!courses.length} onClick={() => setPlanning(true)}>
          {T.finish}
        </Button>
      </div>

      {planning && <PlanFlow onClose={() => setPlanning(false)} />}
    </section>
  );
}
