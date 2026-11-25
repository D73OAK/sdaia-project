// Pill selector (DESIGN.md §6): the level قوي / متوسط / ضعيف. Works like radio buttons:
// one choice, arrow keys move between them, the chosen one is announced as checked.
import { useRef } from 'react';
import { ErrorMessage } from './Field.jsx';

export default function Pills({ id, label, options, value, onChange, error }) {
  const refs = useRef([]);
  const errorId = error ? `${id}-error` : undefined;
  const current = Math.max(0, options.findIndex((o) => o.value === value));

  function onKeyDown(e, i) {
    // In RTL the next pill is on the left, so ArrowLeft moves forward.
    const step = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (i + step + options.length) % options.length;
    refs.current[next]?.focus();
    onChange?.(options[next].value);
  }

  return (
    <div className="field">
      <span className="field__label" id={`${id}-label`}>
        {label}
      </span>
      <div className="field__control">
        <div className="pills" id={id} role="radiogroup" aria-labelledby={`${id}-label`} aria-describedby={errorId}>
          {options.map((o, i) => (
            <button
              key={o.value}
              ref={(el) => (refs.current[i] = el)}
              type="button"
              role="radio"
              aria-checked={o.value === value}
              tabIndex={i === current ? 0 : -1}
              className={`pill ${o.value === value ? 'is-on' : ''}`}
              onClick={() => onChange?.(o.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <ErrorMessage id={errorId}>{error}</ErrorMessage>
      </div>
    </div>
  );
}
