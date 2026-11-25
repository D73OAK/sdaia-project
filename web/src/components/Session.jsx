// Schedule cells (DESIGN.md §6 Session).
// A session can hold up to three files (HANDOFF.md §7 rule 9), so the card is split into stacked segments,
// one per part, each in its course colour, with a height that follows its time. Each segment shows the
// course name and «شابتر ن (مدة)» / «تمارين ن (مدة)»; a segment under 30 minutes shows only that label.
// «بكرة» (tomorrow), picked-for-swap and can't-swap apply to the whole card.
import Icon from './Icon.jsx';
import { fmtDuration, fmtNumber } from '../lib/format.js';
import { SESSION, fileLabel } from '../lib/strings.js';

const SHORT_PART_MINUTES = 30;

// parts: [{ courseName, colorIndex, kind, index, hours }]
// context: read first by screen readers only, e.g. «بكرة، ٤:٠٠ م», so a session makes sense on its own.
export function Session({ parts, tomorrow = false, picked = false, blocked = false, context, onClick, ...rest }) {
  const classes = ['session', tomorrow && 'is-tomorrow', picked && 'is-picked', blocked && 'is-blocked']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={classes}
      aria-pressed={picked || undefined}
      aria-disabled={blocked || undefined}
      onClick={blocked ? undefined : onClick}
      {...rest}
    >
      {context && <span className="visually-hidden">{context}، </span>}
      {parts.map((p, i) => {
        const minutes = Math.round(p.hours * 60);
        const short = minutes < SHORT_PART_MINUTES;
        const name = fileLabel(p.kind, fmtNumber(p.index));
        const duration = `(${fmtDuration(p.hours)})`;
        return (
          <span
            key={i}
            className={`session__part ${short ? 'is-short' : ''}`}
            style={{ '--course': `var(--c${p.colorIndex})`, flexGrow: minutes }}
          >
            {short ? (
              // The course name is not shown, but screen readers still hear it.
              <span className="visually-hidden">
                <bdi>{p.courseName}</bdi>،{' '}
              </span>
            ) : (
              <bdi className="session__course">{p.courseName}</bdi>
            )}
            <span className="session__label">
              {name} <span className="nowrap">{duration}</span>
            </span>
          </span>
        );
      })}
    </button>
  );
}

// A break between sessions: dashed outline, cup icon, «بريك ٣٠ د».
export function BreakCell({ minutes }) {
  return (
    <div className="session session--break">
      <Icon name="cup" size={16} />
      {SESSION.breakLabel(fmtNumber(minutes))}
    </div>
  );
}

// An exam day card: paper icon, «اختبار <course>».
export function ExamCell({ courseNames }) {
  return (
    <div className="session session--exam">
      <Icon name="exam" size={16} />
      <span>
        {SESSION.exam} <bdi>{courseNames.join('، ')}</bdi>
      </span>
    </div>
  );
}
