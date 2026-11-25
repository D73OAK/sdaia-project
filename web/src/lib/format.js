// format.js: ONE place for numbers, durations, dates and times. Never build them by hand.
//
// The numerals decision lives here and in DESIGN.md §8: Gregorian dates with Arabic month and day
// names, and Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩ everywhere in the UI (0-9 only inside code).
// The decimal separator is «٫» and a range is written «١٧–٢٣». Never zero-pad (٥ not ٠٥).
import { DURATION_UNIT } from './strings.js';

export const LOCALE = 'ar-u-ca-gregory-nu-arab';

const number = new Intl.NumberFormat(LOCALE);
// Hours are rounded to half an hour, so at most one decimal: 4 -> «٤», 5.5 -> «٥٫٥».
const hours = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
// Dates and times are built from UTC parts so the device's timezone can never shift them by a day.
const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', timeZone: 'UTC' });
const clock = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });

export const fmtNumber = (n) => number.format(n);
export const fmtHours = (n) => hours.format(n);
export const fmtRange = (lo, hi) => `${hours.format(lo)}–${hours.format(hi)}`;

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
// Turns 0-9 into ٠-٩ while the student types (DESIGN.md §6 Input: numbers).
export const toArabicDigits = (text) => String(text).replace(/[0-9]/g, (d) => ARABIC_DIGITS[d]);
// Reads a number the student typed, in Arabic or Latin digits («١٫٥», «1.5»). Empty or not a number -> NaN.
export function parseNumber(text) {
  const latin = String(text)
    .trim()
    .replace(/[٠-٩]/g, (d) => ARABIC_DIGITS.indexOf(d))
    .replace(/[٫,]/g, '.');
  return latin === '' || !/^\d+(\.\d+)?$/.test(latin) ? NaN : Number(latin);
}

// 'YYYY-MM-DD' -> a Date at midnight UTC.
const utcDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const fmtWeekday = (iso) => weekday.format(utcDate(iso)); // «الخميس»
export const fmtDayMonth = (iso) => dayMonth.format(utcDate(iso)); // «١٠ ديسمبر»
export const fmtDateOption = (iso) => `${fmtWeekday(iso)} ${fmtDayMonth(iso)}`; // «الخميس ١٠ ديسمبر»

// 'HH:MM' -> «٤:٠٠ م» (12-hour, ص/م).
export function fmtClock(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return clock.format(new Date(Date.UTC(2000, 0, 1, h, m)));
}

// How long a session part is (DESIGN.md §6 Session): under an hour in minutes «٢٠ د»; whole or half
// hours in hours «١٫٥ س»; anything else in hours and minutes «١ س ٢٠ د».
export function fmtDuration(hoursValue) {
  const minutes = Math.round(hoursValue * 60);
  if (minutes < 60) return `${fmtNumber(minutes)} ${DURATION_UNIT.minutes}`;
  if (minutes % 30 === 0) return `${hours.format(minutes / 60)} ${DURATION_UNIT.hours}`;
  return `${fmtNumber(Math.floor(minutes / 60))} ${DURATION_UNIT.hours} ${fmtNumber(minutes % 60)} ${DURATION_UNIT.minutes}`;
}
