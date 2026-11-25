// What «حمّل جدولك PDF» prints (HANDOFF.md §7 rule 15). Hidden on screen; print.css shows only this when
// printing. Top of page 1: the app name and today's date. Then every week still to come, one per page,
// and the «ما لحقنا لها وقت» list at the end. The browser turns it into a PDF (Print → Save as PDF):
// no PDF library, so the Arabic text, the RTL order and the fonts stay exactly as on screen.
import { fmtDateOption, fmtDayMonth, fmtHours, fmtNumber } from '../../lib/format.js';
import { APP_NAME, BADGE, PRINT, SCHEDULE as T, fileLabel } from '../../lib/strings.js';
import { Badge } from '../../components/Cards.jsx';
import { weekCount, weekDays } from './view.js';
import WeekGrid from './WeekGrid.jsx';
import { colorIndexOf } from '../courses/courses.js';

const noTooltip = () => undefined;
const notInteractive = () => ({ tabIndex: -1 });

export default function PrintSchedule({ plan, courses, index, today, highlight, highlightLabel }) {
  const weeks = Array.from({ length: weekCount(plan) }, (_, w) => weekDays(plan, w));
  return (
    <div className="print-schedule" aria-hidden="true">
      <header className="print-schedule__head">
        <p className="print-schedule__app">{APP_NAME}</p>
        <p>{PRINT.date(fmtDateOption(today))}</p>
      </header>
      {weeks.map((days) => {
        const weekText = T.weekLabel(fmtDayMonth(days[0].date), fmtDayMonth(days.at(-1).date));
        return (
          <section key={days[0].date} className="print-week">
            <h2 className="print-week__title">{weekText}</h2>
            <WeekGrid
              days={days}
              blocks={plan.blocks}
              index={index}
              courses={courses}
              highlight={highlight}
              highlightLabel={highlightLabel}
              weekText={weekText}
              tipFor={noTooltip}
              onSession={notInteractive}
            />
          </section>
        );
      })}
      {plan.leftover.length > 0 && (
        <section className="print-left">
          <h2>{T.leftoverTitle}</h2>
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
    </div>
  );
}
