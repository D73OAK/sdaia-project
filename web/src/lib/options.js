// options.js: the lists for the date and time selects (DESIGN.md §6 Input / Select).
// No <input type="date">: Arabic select lists only.
import { addDays } from '../features/schedule/schedule.js';
import { fmtClock, fmtDateOption } from './format.js';

// Exam dates: from tomorrow to 90 days ahead, «الخميس ١٠ ديسمبر». `today` is 'YYYY-MM-DD'.
export function dateOptions(today, days = 90) {
  const out = [];
  for (let i = 1; i <= days; i++) {
    const value = addDays(today, i);
    out.push({ value, label: fmtDateOption(value) });
  }
  return out;
}

// Study times: every 30 minutes from 5:00 ص to 11:30 م, «٤:٠٠ م».
export function timeOptions() {
  const out = [];
  for (let m = 5 * 60; m <= 23 * 60 + 30; m += 30) {
    const value = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    out.push({ value, label: fmtClock(value) });
  }
  return out;
}

// Today on the student's device, as 'YYYY-MM-DD' (local date, not UTC).
export function localToday(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
