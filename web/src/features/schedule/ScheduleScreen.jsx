// Screen 4: the schedule (HANDOFF.md §2). SEE FIRST: the highlighted day («اليوم» or «بكرة»).
// Top: the warning (with «غيّر ساعاتي») or the success banner. Then the week navigation, the tools,
// the week grid, the reason tooltip and the «ما لحقنا لها وقت» list.
// Ended days count as studied; today is the first column while it still has sessions (§7 rule 16).
// Tools: «→ موادي», «بدّل بين جلستين» (§7 rule 13), «رتّب جدولي من جديد» (popup 4b, §7 rule 17),
// «حمّل جدولك PDF» (§7 rule 15) and «ابدأ من جديد».
// States: every exam passed, every file finished, no study day left (empty).
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../components/Button.jsx';
import { Badge, Card, SuccessBanner, WarningBanner } from '../../components/Cards.jsx';
import Modal from '../../components/Modal.jsx';
import Tooltip from '../../components/Tooltip.jsx';
import { fmtDayMonth, fmtHours, fmtNumber, fmtRange } from '../../lib/format.js';
import { localToday } from '../../lib/options.js';
import {
  ADJUST,
  AI_TEXT,
  ALL_PASSED,
  APP_NAME,
  BADGE,
  BANNER,
  PRINT,
  RESCHEDULE,
  RESTART,
  SCHEDULE as T,
  SESSION,
  SWAP,
  TOOLTIP,
  fileLabel,
} from '../../lib/strings.js';
import { go, ROUTES } from '../../routes.js';
import { useApp } from '../../state.jsx';
import PlanFlow from './PlanFlow.jsx';
import RescheduleModal from './RescheduleModal.jsx';
import PrintSchedule from './PrintSchedule.jsx';
import { fitWeeksForPrint } from './printFit.js';
import './print.css';
import { activeCourses, allExamsPassed, allFinished } from './progress.js';
import { colorIndexOf } from '../courses/courses.js';
import { fileIndex, hasAnySession, visiblePlan, weekCount, weekDays } from './view.js';
import { canSwap } from './swap.js';
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
  const [swapping, setSwapping] = useState(false); // «بدّل بين جلستين» mode (§7 rule 13)
  const [picked, setPicked] = useState(null); // { id, date, slot } of the first session picked
  const index = useMemo(() => fileIndex(courses), [courses]);
  // A tap focuses the session (which opens its tooltip) and then clicks it. To know whether the tap
  // should open or close, remember at touch-down whether this session's tooltip was already open.
  const openAtPress = useRef(false);
  const today = localToday();

  // No plan yet (or the courses changed since): back to the list to make one, or Home when there are
  // no courses at all (for example right after «ابدأ من جديد»).
  useEffect(() => {
    if (!plan) go(courses.length ? ROUTES.courses : ROUTES.home);
  }, [plan, courses.length]);
  // A new plan starts at its first week. A swap changes the plan too, but keeps the week on screen: the
  // week resets only when the plan's days or hours change (a rebuild), not when two sessions trade places.
  const planShape = plan ? `${plan.days[0]?.date}|${plan.days.length}|${plan.needHours}|${plan.haveHours}` : '';
  useEffect(() => setWeek(0), [planShape]);
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

  // Today is the first, highlighted column while it still has sessions; else the schedule starts tomorrow.
  const view = visiblePlan(plan, today);
  const highlightLabel = view.label === 'today' ? SESSION.today : SESSION.tomorrow;
  const passed = allExamsPassed(courses, today); // every exam is over (§8)
  const done = !passed && allFinished(courses, state.progress, today); // every file finished
  const empty = passed || done || !hasAnySession(view.plan);
  const canReschedule = Boolean(preferences) && activeCourses(courses, today).length > 0;
  const weeks = weekCount(view.plan);
  const days = weekDays(view.plan, week);
  const weekText = days.length ? T.weekLabel(fmtDayMonth(days[0].date), fmtDayMonth(days.at(-1).date)) : '';

  // Hover (laptop), tap (tablet) and keyboard focus all open the same tooltip.
  const show = (id, parts, el) => setTip({ id, parts, el, rect: el.getBoundingClientRect() });
  const onSession = (id, parts, date, slot) => (swapping ? swapProps(id, date, slot) : tooltipProps(id, parts));

  // Swap mode: pick one session, then a second one it can trade places with. The same one again cancels.
  // Sessions that cannot swap with the picked one are faded and not clickable (Session blocked).
  const swapProps = (id, date, slot) => {
    const here = { date, slot };
    const isPicked = picked?.id === id;
    const blocked = Boolean(picked) && !isPicked && !canSwap(plan, courses, picked, here);
    return {
      picked: isPicked,
      blocked,
      onClick: () => {
        if (!picked) setPicked({ id, date, slot });
        else if (isPicked) setPicked(null);
        else {
          dispatch({ type: 'swap', a: picked, b: here });
          setPicked(null);
        }
      },
    };
  };
  function toggleSwapping() {
    setTip(null);
    setPicked(null);
    setSwapping((on) => !on);
  }

  const tooltipProps = (id, parts) => ({
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
        {!empty && (
          <Button variant="secondary" aria-pressed={swapping} onClick={toggleSwapping}>
            {swapping ? SWAP.done : SWAP.button}
          </Button>
        )}
        <Button variant="link" onClick={() => setConfirmRestart(true)}>
          {T.restart}
        </Button>
      </div>

      {swapping && !empty && (
        <p className="schedule__hint" role="status">
          {SWAP.hint}
        </p>
      )}

      {passed ? (
        <Card className="schedule__empty">
          <h2>{ALL_PASSED}</h2>
          <Button variant="secondary" onClick={() => setConfirmRestart(true)}>
            {T.restart}
          </Button>
        </Card>
      ) : done ? (
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
          blocks={view.plan.blocks}
          index={index}
          courses={courses}
          highlight={view.highlight}
          highlightLabel={highlightLabel}
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
                <li key={l.chapterId} className="left-row" style={{ '--course': `var(--c${colorIndexOf(found.course)})` }}>
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
              {p.chapter.adjusted && <p>{ADJUST.tooltipLine}</p>}
              {!p.chapter.adjusted && p.chapter.estimate.source === 'ai' && p.chapter.estimate.aiReason && (
                <p>{AI_TEXT.tooltipLine(p.chapter.estimate.aiReason)}</p>
              )}
            </div>
          ))}
        </Tooltip>
      )}

      {!empty && (
        <PrintSchedule
          plan={view.plan}
          courses={courses}
          index={index}
          today={today}
          highlight={view.highlight}
          highlightLabel={highlightLabel}
        />
      )}

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
