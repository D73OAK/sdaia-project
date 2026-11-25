// printFit.js: makes every printed week fit on one A4 landscape page.
// Just before printing, the print copy is laid out invisibly at page width (print.css .is-measuring),
// each week is measured, and a week taller than a page is shrunk with CSS zoom. Runs for the
// «حمّل جدولك PDF» button and for the browser's own print (Ctrl+P), through the "beforeprint" event.

// The space inside the page margins (A4 landscape 297 × 210 mm, 10 mm margins) in CSS pixels (96 per inch).
const MM = 96 / 25.4;
export const PRINT_WIDTH_PX = Math.floor((297 - 20) * MM); // 1046
export const PRINT_HEIGHT_PX = Math.floor((210 - 20) * MM); // 718
const SAFETY = 0.97; // a little room for rounding between screen and paper

// The zoom a week needs: 1 when it fits, smaller when it is taller than the space it has.
export const fitZoom = (height, room) => (height <= room ? 1 : Math.floor((room / height) * SAFETY * 100) / 100);

export function fitWeeksForPrint(root = document.querySelector('.print-schedule')) {
  if (!root) return;
  root.classList.add('is-measuring');
  const weeks = [...root.querySelectorAll('.print-week')];
  weeks.forEach((w) => (w.style.zoom = ''));
  const head = root.querySelector('.print-schedule__head')?.getBoundingClientRect().height ?? 0;
  weeks.forEach((w, i) => {
    const room = PRINT_HEIGHT_PX - (i === 0 ? head : 0); // the first page also holds the app name and date
    const zoom = fitZoom(w.getBoundingClientRect().height, room);
    w.style.zoom = zoom === 1 ? '' : String(zoom);
  });
  root.classList.remove('is-measuring');
}
