// The floating study drawings behind every screen (DESIGN.md §5): pencil, hourglass, book, paper.
// A 7×9 grid at 16% opacity. Each drawing drifts back and forth over 8–17 s. Decorative only:
// hidden from screen readers, never catches clicks, and stops with prefers-reduced-motion (base.css).
const SHAPES = {
  pencil: (
    <>
      <rect x="0" y="10" width="60" height="16" rx="3" />
      <polygon points="60,10 78,18 60,26" />
      <rect x="-10" y="10" width="10" height="16" rx="3" />
    </>
  ),
  hourglass: <path d="M0 0 H40 M0 60 H40 M5 0 C5 25 35 25 35 30 C35 35 5 35 5 60 M35 0 C35 25 5 25 5 30 C5 35 35 35 35 60" />,
  book: <path d="M0 8 Q25 0 40 8 Q55 0 80 8 V58 Q55 50 40 58 Q25 50 0 58 Z M40 8 V58" />,
  paper: <path d="M0 0 H40 L52 12 V64 H0 Z M8 20 H42 M8 32 H42 M8 44 H30" />,
};
const ORDER = ['pencil', 'hourglass', 'book', 'paper'];

// The same layout and motion numbers as prototype.html, computed once.
const ITEMS = [];
for (let row = 0, k = 0; row < 7; row++) {
  for (let col = 0; col < 9; col++, k++) {
    ITEMS.push({
      k,
      shape: ORDER[k % 4],
      style: {
        insetInlineStart: `${col * 12 + (row % 2 ? 6 : 0) + ((k * 7) % 5)}%`,
        insetBlockStart: `${row * 15 + ((k * 11) % 6) - 4}%`,
        '--d': `${8 + (k % 7) * 1.5}s`, // 8 to 17 seconds
        '--dx': `${((k % 3) - 1) * 24}px`, // −24, 0 or 24 px
        '--dy': `${((k % 4) - 1.5) * 14}px`, // −21 to 21 px
        '--r0': `${((k * 47) % 50) - 25}deg`,
        '--r1': `${((k * 47) % 50) - 15}deg`, // swings 10°
      },
    });
  }
}

export default function Doodles() {
  return (
    <div className="doodles" aria-hidden="true">
      {ITEMS.map(({ k, shape, style }) => (
        <svg key={k} viewBox="0 0 110 85" style={style}>
          <g transform="translate(15,12)">{SHAPES[shape]}</g>
        </svg>
      ))}
    </div>
  );
}
