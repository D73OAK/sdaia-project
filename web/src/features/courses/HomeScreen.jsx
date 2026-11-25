// Screen 1: Home (HANDOFF.md §2). The title, one sentence, 3 steps, «رتب جدولك الان» and the demo link.
// If the student already has saved courses, «رتب جدولك الان» opens the course list instead of a new course.
import { useState } from 'react';
import Button from '../../components/Button.jsx';
import Modal from '../../components/Modal.jsx';
import { fmtNumber } from '../../lib/format.js';
import { localToday } from '../../lib/options.js';
import { APP_NAME, HOME, RESTART } from '../../lib/strings.js';
import { useApp } from '../../state.jsx';
import { demoCourses } from './demo.js';
import { go } from '../../routes.js';
import './home.css';

export default function HomeScreen() {
  const { state, dispatch } = useApp();
  const hasSaved = state.courses.length > 0;
  const [confirmDemo, setConfirmDemo] = useState(false);

  function loadDemo() {
    dispatch({ type: 'loadDemo', courses: demoCourses(localToday()) });
    go('/courses');
  }

  return (
    <section className="screen home" aria-labelledby="home-title">
      <div className="topbar">
        <span />
        <span className="topbar__app">{APP_NAME}</span>
      </div>

      <div className="home__hero">
        <h1 id="home-title">{HOME.title}</h1>
        <p className="home__lead">{HOME.lead}</p>

        <ol className="home__steps" aria-label={HOME.stepsLabel}>
          {HOME.steps.map((step, i) => (
            <li key={step} className="home__step-item">
              {/* The arrow points forward, which in RTL is to the left. Decorative only. */}
              {i > 0 && (
                <span className="home__arrow" aria-hidden="true">
                  ←
                </span>
              )}
              <span className="home__step">
                <span className="home__step-num" aria-hidden="true">
                  {fmtNumber(i + 1)}
                </span>
                {step}
              </span>
            </li>
          ))}
        </ol>

        <Button onClick={() => go(hasSaved ? '/courses' : '/course/new')}>{HOME.start}</Button>
        <div className="home__demo">
          {/* Loading the demo replaces the saved courses, so ask first when there are some. */}
          <Button variant="link" onClick={() => (hasSaved ? setConfirmDemo(true) : loadDemo())}>
            {HOME.demo}
          </Button>
        </div>
      </div>

      <Modal
        open={confirmDemo}
        title={RESTART.title}
        onClose={() => setConfirmDemo(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmDemo(false)}>
              {RESTART.no}
            </Button>
            <Button onClick={loadDemo}>{RESTART.yes}</Button>
          </>
        }
      >
        <p>{RESTART.text}</p>
      </Modal>
    </section>
  );
}
