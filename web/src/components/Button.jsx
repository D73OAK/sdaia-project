// Buttons (DESIGN.md §6 Button). Only ONE primary button per screen.
//   variant: 'primary' | 'secondary' | 'link'
//   status:  'loading' (spinner + «نرتّب جدولك...») | 'done' (mint, ✓ + «انحفظت المادة») | undefined
// Hover and pressed come from CSS. `className` lets the components page force them for display only.
import Icon from './Icon.jsx';
import { BUTTON_STATE, COMMON } from '../lib/strings.js';

export default function Button({ variant = 'primary', status, className = '', children, disabled, type = 'button', ...rest }) {
  const classes = ['btn', `btn--${variant}`, status && `btn--${status}`, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} disabled={disabled} aria-busy={status === 'loading' || undefined} {...rest}>
      {status === 'loading' && (
        <>
          <span className="spinner" aria-hidden="true" />
          {BUTTON_STATE.loading}
        </>
      )}
      {status === 'done' && (
        <>
          <Icon name="check" />
          {BUTTON_STATE.done}
        </>
      )}
      {!status && children}
    </button>
  );
}

// The round ✕ button in popups and on file chips (44×44).
export function CloseButton({ label = COMMON.close, className = '', ...rest }) {
  return (
    <button type="button" className={`close-btn ${className}`} aria-label={label} {...rest}>
      <Icon name="close" />
    </button>
  );
}
