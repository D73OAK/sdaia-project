// Cards (DESIGN.md §6): the light form card, the course card, badges and the schedule banners.
import Icon from './Icon.jsx';
import Button from './Button.jsx';
import { BANNER } from '../lib/strings.js';

// The see-through card that holds a form (bg --surface).
export function Card({ className = '', children }) {
  return <div className={`card ${className}`}>{children}</div>;
}

// A course in the list. colorIndex 1–6 picks --c1…--c6 (the course keeps it for good).
// isNew: the mint ✓ before the name and a mint ring that fades in 0.5 s.
// With onClick the card is a button (it opens the course in edit mode); `label` names it for screen readers.
export function CourseCard({ name, colorIndex, hoursText, isNew = false, onClick, label }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={onClick ? label : undefined}
      className={`course-card ${onClick ? 'course-card--button' : ''} ${isNew ? 'is-new' : ''}`}
      style={{ '--course': `var(--c${colorIndex})` }}
    >
      <span className="course-card__name">
        {isNew && (
          <span className="course-card__check">
            <Icon name="check" size={16} />
          </span>
        )}
        <bdi>{name}</bdi>
      </span>
      <Badge tone="hours">{hoursText}</Badge>
    </Tag>
  );
}

// tone: 'hours' | 'exam' | 'success' | 'missing'. icon: an Icon name, at the start.
export function Badge({ tone, icon, children }) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

// «الوقت ما يكفي» banner with the «غيّر ساعاتي» button.
export function WarningBanner({ title, body, onChangeHours }) {
  return (
    <div className="banner banner--warn" role="status">
      <p className="banner__title">
        <Icon name="warn" /> {title}
      </p>
      <p className="banner__body">{body}</p>
      <Button variant="dark" className="banner__action" onClick={onChangeHours}>
        {BANNER.changeHours}
      </Button>
    </div>
  );
}

// «جدولك يكفي كل الشابترات» banner.
export function SuccessBanner({ children }) {
  return (
    <div className="banner banner--success" role="status">
      <Icon name="check" size={16} /> {children}
    </div>
  );
}
