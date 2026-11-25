// Line icons (DESIGN.md §8: SVG with currentColor, no emoji). Decorative: hidden from screen readers,
// so the text next to them carries the meaning. Icons go at the start of the text (on the right in RTL).
const PATHS = {
  upload: 'M10 14V3M5 8l5-5 5 5M3 17h14',
  warn: 'M10 2 19 18H1Z M10 8v4 M10 15v.5',
  exam: 'M4 2h9l3 3v13H4Z M7 8h6 M7 11h6 M7 14h4',
  cup: 'M3 6h11v5q0 5-5.5 5T3 11Z M14 8q4 0 4 3t-4 3',
  check: 'M3 10l5 5 9-10',
  close: 'M5 5l10 10M15 5 5 15',
  minus: 'M4 10h12',
  plus: 'M4 10h12M10 4v12',
};

export default function Icon({ name, size = 18 }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
