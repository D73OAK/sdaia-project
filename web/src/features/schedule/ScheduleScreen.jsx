// Screen 4: the schedule (HANDOFF.md §2). SEE FIRST: tomorrow's sessions.
// Top: the warning (with «غيّر ساعاتي») or the success banner. Then the week navigation, the tools,
// the week grid, the reason tooltip and the «ما لحقنا لها وقت» list. Empty state when no study day is left,
// and an «all finished» state when every file is done.
// The schedule always starts tomorrow: days before it count as studied (§7 rule 16). «رتّب جدولي من جديد»
// opens popup 4b to tick finished files and plan the rest (§7 rule 17). «حمّل جدولك PDF» prints every week
// still to come (PrintSchedule + print.css, §7 rule 15). Swap sessions comes later.
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../components/Button.jsx';
import { Badge, Card, SuccessBanner, WarningBanner } from '../../components/Cards.jsx';
import Modal from '../../components/Modal.jsx';
import Tooltip from '../../components/Tooltip.jsx';
import { fmtDayMonth, fmtHours, fmtNumber, fmtRange } from '../../lib/format.js';
import { localToday } from '../../lib/options.js';
import { APP_NAME, BADGE, BANNER, PRINT, RESCHEDULE, RESTART, SCHEDULE as T, TOOLTIP, fileLabel } from '../../lib/strings.js';
import { go, ROUTES } from '../../routes.js';
import { useApp } from '../../state.jsx';
import PlanFlow from './PlanFlow.jsx';
import RescheduleModal from './RescheduleModal.jsx';
import PrintSchedule from './PrintSchedule.jsx';
import { fitWeeksForPrint } from './printFit.js';
import './print.css';
import { activeCourses, allFinished } from './progress.js';
import { addDays } from './schedule.js';
import { fileIndex, hasAnySession, weekCount, weekDays } from './view.js';
import WeekGrid from './WeekGrid.jsx';
import './schedule.css';

const canHover = () => window.matchMedia('(hover: hover)').matches;

export default function ScheduleScreen() {
  const { state, dispatch } = useApp();
  const { plan, courses, preferences } = state;
  const [week, setWeek] = useState(0);
  const [tip, setTip] = useState(null); // { id, parts, el, rect }
  const [flow, setFlow] = useState(null); // popups 3a/3b: null | 'prefs' | 'short'
  const [rescheduling, setRescheduling] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const index = useMemo(() => fileIndex(courses), [courses]);
  // A tap focuses the session (which opens its tooltip) and then clicks it. To know whether the tap
  // should open or close, remember at touch-down whether this session's tooltip was already open.
  const openAtPress = useRef(false);
  const today = localToday();
  const tomorrow = addDays(today, 1);

  // No plan yet (or the courses changed since): back to the list to make one, or Home when there are
  // no courses at all (for example right after «ابدأ من جديد»).
  useEffect(() => {
    if (!plan) go(courses.length ? ROUTES.courses : ROUTES.home);
  }, [plan, courses.length]);
  useEffect(() => setWeek(0), [plan]); // a new plan starts at its first week
  // Ctrl+P (not the button) also gets one week per page.
  useEffect(() => {
    const fit = () => fitWeeksForPrint();
    window.addEventListener('beforeprint', fit);
    return () => window.removeEventListener('beforeprint', fit);
  }, []);
  // The app may stay open past midnight: count the days that passed whenever the schedule opens.
  useEffect(() => dispatch({ type: 'settle', today }), [dispatch, today]);

  // The tooltip closes with Esc. When the page or the grid scrolls it follows its session (a tap also
  // scrolls the session into view, so closing on scroll would close it right away on a tablet).
  const tipOpen = Boolean(tip);
  useEffect(() => {
    if (!tipOpen) return undefined;
    const follow = () => setTip((t) => (t ? { ...t, rect: t.el.getBoundingClientRect() } : t));
    const onKey = (e) => e.key === 'Escape' && setTip(null);
    window.addEventListener('scroll', follow, { passive: true, capture: true });
    window.addEventListener('resize', follow);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', follow, { capture: true });
      window.removeEventListener('resize', follow);
      document.removeEventListener('keydown', onKey);
    };
  }, [tipOpen]);

  if (!plan) return null;

  const done = allFinished(courses, state.progress, today); // every file finished: nothing left to plan
  const empty = done || !hasAnySession(plan);
  const canReschedule = Boolean(preferences) && activeCourses(courses, today).length > 0;
  const weeks = weekCount(plan);
  const days = weekDays(plan, week);
  const weekText = days.length ? T.weekLabel(fmtDayMonth(days[0].date), fmtDayMonth(days.at(-1).date)) : '';

  // Hover (laptop), tap (tablet) and keyboard focus all open the same tooltip.
  const show = (id, parts, el) => setTip({ id, parts, el, rect: el.getBoundingClientRect() });
  const onSession = (id, parts) => ({
    onMouseEnter: (e) => canHover() && show(id, parts, e.currentTarget),
    onMouseLeave: () => canHover() && setTip(null),
    onFocus: (e) => show(id, parts, e.currentTarget),
    onBlur: () => setTip(null),
    onPointerDown: () => (openAtPress.current = tip?.id === id),
    onClick: (e) => (!canHover() && openAtPress.current ? setTip(null) : show(id, parts, e.currentTarget)),
  });

  // The browser's own print turns the page into a PDF. Wait for the fonts, so the Arabic prints right,
  // then shrink any week taller than a page (printFit.js).
  async function printSchedule() {
    setTip(null);
    await document.fonts.ready;
    fitWeeksForPrint();
    window.print();
  }

  function restart() {
    setConfirmRestart(false);
    dispatch({ type: 'restart' });
    go(ROUTES.home);
  }

  return (
    <section className="screen schedule" aria-labelledby="schedule-title">
      <h1 id="schedule-title" className="visually-hidden">
        {T.title}
      </h1>
      <div className="topbar schedule__top">
        <div>
          {!empty &&
            (plan.leftover.length ? (
              <WarningBanner
                title={BANNER.warningTitle}
                body={BANNER.warningBody(fmtHours(plan.needHours), fmtHours(plan.haveHours), fmtNumber(preferences.hoursPerDay))}
                onChangeHours={() => setFlow('prefs')}
              />
            ) : (
              <SuccessBanner>{BANNER.success}</SuccessBanner>
            ))}
        </div>
        <span className="topbar__app">{APP_NAME}</span>
      </div>

      {!empty && (
        <nav className="schedule__nav" aria-label={T.weeksLabel}>
          <Button variant="secondary" disabled={week === 0} onClick={() => setWeek((w) => w - 1)}>
            {T.prevWeek}
          </Button>
          <h2 className="schedule__week" aria-live="polite">
            {weekText}
          </h2>
          <Button variant="secondary" disabled={week >= weeks - 1} onClick={() => setWeek((w) => w + 1)}>
            {T.nextWeek}
          </Button>
        </nav>
      )}

      <div className="schedule__tools">
        <Button variant="secondary" onClick={() => go(ROUTES.courses)}>
          {T.backToCourses}
        </Button>
        {canReschedule && (
          <Button variant="secondary" onClick={() => setRescheduling(true)}>
            {RESCHEDULE.button}
          </Button>
        )}
        {!empty && (
          <Button variant="secondary" onClick={printSchedule}>
            {PRINT.button}
          </Button>
        )}
        {/* Later: «بدّل بين جلستين» goes here. */}
        <Button variant="link" onClick={() => setConfirmRestart(true)}>
          {T.restart}
        </Button>
      </div>

      {done ? (
        <Card className="schedule__empty">
          <h2>{RESCHEDULE.allDone}</h2>
          <Button variant="secondary" onClick={() => go(ROUTES.courses)}>
            {T.backToCourses}
          </Button>
        </Card>
      ) : empty ? (
        <Card className="schedule__empty">
          <h2>{T.emptyTitle}</h2>
          <p>{T.emptyText}</p>
          <Button variant="secondary" onClick={() => go(ROUTES.courses)}>
            {T.emptyBack}
          </Button>
        </Card>
      ) : (
        <WeekGrid
          days={days}
          blocks={plan.blocks}
          index={index}
          courses={courses}
          tomorrow={tomorrow}
          weekText={weekText}
          tipFor={(id) => (tip?.id === id ? 'session-tip' : undefined)}
          onSession={onSession}
        />
      )}

      {!empty && plan.leftover.length > 0 && (
        <section className="schedule__left" aria-labelledby="left-title">
          <h2 id="left-title">{T.leftoverTitle}</h2>
          <ul>
            {plan.leftover.map((l) => {
              const found = index.get(l.chapterId);
              if (!found) return null;
              return (
                <li key={l.chapterId} className="left-row" style={{ '--course': `var(--c${found.course.order})` }}>
                  <span>
                    <bdi>{found.course.name}</bdi>، {fileLabel(found.chapter.kind, fmtNumber(found.chapter.index))}
                  </span>
                  <Badge tone="missing">{BADGE.missing(fmtHours(l.missingHours))}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tip && (
        <Tooltip id="session-tip" anchor={tip.rect}>
          {tip.parts.map((p) => (
            <div key={p.chapterId} className="tooltip__part">
              <p className="tooltip__head">
                {TOOLTIP.head(p.courseName, fileLabel(p.kind, fmtNumber(p.index)), fmtRange(p.chapter.estimate.loHours, p.chapter.estimate.hiHours))}
              </p>
              <p>{TOOLTIP.pages(fmtNumber(p.chapter.metrics.pages), p.chapter.metrics.density)}</p>
              <p>{TOOLTIP.counts(fmtNumber(p.chapter.metrics.equations), fmtNumber(p.chapter.metrics.exercises))}</p>
              <p>{TOOLTIP.level(p.course.level)}</p>
            </div>
          ))}
        </Tooltip>
      )}

      {!empty && <PrintSchedule plan={plan} courses={courses} index={index} today={today} tomorrow={tomorrow} />}

      {flow && <PlanFlow startAt={flow} onClose={() => setFlow(null)} />}
      {rescheduling && (
        <RescheduleModal
          onClose={() => setRescheduling(false)}
          onDone={({ short }) => {
            setRescheduling(false);
            if (short) setFlow('short');
          }}
        />
      )}

      <Modal
        open={confirmRestart}
        title={RESTART.title}
        onClose={() => setConfirmRestart(false)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmRestart(false)}>
              {RESTART.no}
            </Button>
            <Button onClick={restart}>{RESTART.yes}</Button>
          </>
        }
      >
        <p>{RESTART.text}</p>
      </Modal>
    </section>
  );
}
