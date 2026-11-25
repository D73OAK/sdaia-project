// One week of the schedule: a time column + 7 days, the highlighted day first on the right (RTL).
// Rows: the day titles, an exam row (only in weeks with an exam), then the day blocks: session, break, …
// An exam day keeps the sessions of other courses (their exams are later) under its exam card.
// The highlighted day («اليوم» when today still has sessions, else «بكرة», §7 rule 16) is the bold thing on
// this screen: white sessions, a 20px title, and a white glow 350ms after the schedule shows (DESIGN.md §7;
// it simply appears with prefers-reduced-motion). `highlightLabel` is its title text.
// onSession(id, parts, date, slot) gives each session its extra props (tooltip or swap handlers).
import { BreakCell, ExamCell, Session } from '../../components/Session.jsx';
import { fmtClock, fmtDayMonth, fmtWeekday } from '../../lib/format.js';
import { SCHEDULE } from '../../lib/strings.js';
import { sessionAt, sessionParts } from './view.js';

export default function WeekGrid({ days, blocks, index, courses, highlight, highlightLabel, weekText, tipFor, onSession }) {
  const examRow = days.some((d) => d.day?.exams.length);
  const courseName = (id) => courses.find((c) => c.id === id)?.name ?? '';
  const dayText = (date) => (date === highlight ? highlightLabel : `${fmtWeekday(date)} ${fmtDayMonth(date)}`);

  let slot = -1;
  return (
    <div className="week-wrap">
      <div className="week" role="region" aria-label={SCHEDULE.gridLabel(weekText)}>

        {/* day titles */}
        <div className="week__corner" />
        {days.map(({ date, day }) => {
          const isTomorrow = date === highlight;
          return (
            <div
              key={date}
              className={`week__head ${isTomorrow ? 'is-tomorrow' : ''} ${day?.exams.length ? 'is-exam' : ''}`}
            >
              {/* The glow is a layer inside the highlighted title that reaches down the column; it takes no grid slot. */}
              {isTomorrow && <span className="week__glow" aria-hidden="true" />}
              <span className="week__day">{isTomorrow ? highlightLabel : fmtWeekday(date)}</span>
              <span className="week__date">
                {isTomorrow ? `${fmtWeekday(date)} ${fmtDayMonth(date)}` : fmtDayMonth(date)}
              </span>
            </div>
          );
        })}

        {/* exams */}
        {examRow && (
          <>
            <div className="week__time" />
            {days.map(({ date, day }) => (
              <div key={date} className="week__cell">
                {day?.exams.length > 0 && <ExamCell courseNames={day.exams.map(courseName)} />}
              </div>
            ))}
          </>
        )}

        {/* the day blocks */}
        {blocks.map((block, b) => {
          if (block.type === 'session') slot += 1;
          const s = slot;
          return [
            <div key={`t${b}`} className="week__time">
              {fmtClock(block.start)}
            </div>,
            ...days.map(({ date, day }) => {
              const key = `${date}-${b}`;
              if (!day) return <div key={key} className="week__cell" />;
              if (block.type === 'break') {
                // A break shows only between two sessions that both happen.
                const between = sessionAt(day, s) && sessionAt(day, s + 1);
                return (
                  <div key={key} className="week__cell">
                    {between && <BreakCell minutes={block.minutes} />}
                  </div>
                );
              }
              const session = sessionAt(day, s);
              const parts = session ? sessionParts(session, index) : [];
              if (!parts.length) return <div key={key} className="week__cell" />;
              const id = `${date}_${s}`;
              const tip = tipFor(id);
              return (
                <div key={key} className="week__cell">
                  <Session
                    parts={parts}
                    tomorrow={date === highlight}
                    context={SCHEDULE.sessionContext(dayText(date), fmtClock(block.start))}
                    aria-describedby={tip}
                    {...onSession(id, parts, date, s)}
                  />
                </div>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}
