// Popup (DESIGN.md §6 Modal). Closes with ✕ or Esc, and nothing changes (HANDOFF.md §4).
// While open: focus moves into it, Tab stays inside it, and focus goes back where it was on close.
import { useEffect, useId, useRef } from 'react';
import { CloseButton } from './Button.jsx';

export default function Modal({ open, title, onClose, children, actions }) {
  const box = useRef(null);
  const titleId = useId();
  // Keep the latest onClose without re-running the effect (which would move focus) on every render.
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const before = document.activeElement;
    const focusables = () =>
      [...box.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
        (el) => !el.disabled,
      );
    // Focus the first field or action, not the ✕ (the first focusable after it).
    (focusables()[1] ?? focusables()[0])?.focus();

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current?.();
      }
      if (e.key === 'Tab') {
        const list = focusables();
        const first = list[0];
        const last = list.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      before?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal">
      <div className="modal__box" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={box}>
        <div className="modal__head">
          <h2 id={titleId}>{title}</h2>
          <CloseButton onClick={onClose} />
        </div>
        <div className="modal__body">{children}</div>
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </div>
  );
}
