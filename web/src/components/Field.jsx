// Form fields (DESIGN.md §6 Input / Select, Error message).
// Each field has a visible label, and its error message sits under it, linked with aria-describedby.
import { toArabicDigits } from '../lib/format.js';

export function ErrorMessage({ id, children }) {
  if (!children) return null;
  return (
    <p className="error-msg" id={id} role="alert">
      {children}
    </p>
  );
}

// Text input. `numeric` = a number field: type=text + inputmode=numeric, and 0-9 turn into ٠-٩ while typing.
// Text fields get dir="auto" so an English course name is written left to right.
export function Input({ id, label, error, numeric = false, value, onChange, className = '', ...rest }) {
  const errorId = error ? `${id}-error` : undefined;
  const handle = (e) => onChange?.(numeric ? toArabicDigits(e.target.value) : e.target.value);
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          id={id}
          type="text"
          inputMode={numeric ? 'numeric' : undefined}
          dir={numeric ? undefined : 'auto'}
          className={`input ${error ? 'is-error' : ''} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          value={value}
          onChange={handle}
          {...rest}
        />
        <ErrorMessage id={errorId}>{error}</ErrorMessage>
      </div>
    </div>
  );
}

// Select list. options: [{ value, label }]. `placeholder` adds an empty first choice («اختر اليوم»).
export function Select({ id, label, error, options, placeholder, value, onChange, className = '', ...rest }) {
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <select
          id={id}
          className={`input select ${error ? 'is-error' : ''} ${className}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ErrorMessage id={errorId}>{error}</ErrorMessage>
      </div>
    </div>
  );
}
