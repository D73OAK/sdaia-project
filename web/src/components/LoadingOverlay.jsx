// Loading overlay (DESIGN.md §6): covers the screen while files are read.
// A 64px spinner, a 12px bar that fills from the start (the right in RTL) and the §8 text.
// `done` and `total` drive the bar; screen readers hear the text once, not every step.
export default function LoadingOverlay({ text, done = 0, total = 1 }) {
  const percent = Math.round((Math.min(done, total) / Math.max(total, 1)) * 100);
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader__spinner" aria-hidden="true" />
      <p className="loader__text">{text}</p>
      <div className="loader__bar" aria-hidden="true">
        <span className="loader__fill" style={{ inlineSize: `${percent}%` }} />
      </div>
    </div>
  );
}
