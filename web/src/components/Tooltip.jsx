// Tooltip (DESIGN.md §6): white card, 240px wide, under the element it explains, or above it when there
// is no room below. `anchor` is that element's getBoundingClientRect(). Positioned from the start side
// (the right in RTL) so it lines up with the session it belongs to.
import { useLayoutEffect, useRef, useState } from 'react';

const GAP = 8; // px between the session and the tooltip, and from the window edge

export default function Tooltip({ id, anchor, children }) {
  const box = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !anchor) return;
    const { offsetWidth: w, offsetHeight: h } = el;
    const vw = document.documentElement.clientWidth;
    // distance from the start (right) edge of the window to the start edge of the session
    const start = Math.min(Math.max(GAP, vw - anchor.right), vw - w - GAP);
    let top = anchor.bottom + GAP;
    if (top + h > window.innerHeight - GAP) top = Math.max(GAP, anchor.top - h - GAP);
    setPos({ insetInlineStart: start, top });
  }, [anchor]);

  return (
    <div
      ref={box}
      id={id}
      role="tooltip"
      className="tooltip"
      style={pos ?? { visibility: 'hidden', top: 0, insetInlineStart: 0 }}
    >
      {children}
    </div>
  );
}
