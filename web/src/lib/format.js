// format.js: ONE place for numbers, prices and dates. Never build them by hand.
//
// The numerals decision lives here and in DESIGN.md §8: Gregorian dates with Arabic month and day
// names, and Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩ everywhere in the UI (0-9 only inside code).
// The decimal separator is «٫» and a range is written «١٧–٢٣». Never zero-pad (٥ not ٠٥).
export const LOCALE = 'ar-u-ca-gregory-nu-arab';

const number = new Intl.NumberFormat(LOCALE);
// Hours are rounded to half an hour, so at most one decimal: 4 -> «٤», 5.5 -> «٥٫٥».
const hours = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'SAR' });
const day = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
const time = new Intl.DateTimeFormat(LOCALE, { hour: 'numeric', minute: '2-digit' });

export const fmtNumber = (n) => number.format(n);
export const fmtHours = (n) => hours.format(n);
export const fmtRange = (lo, hi) => `${hours.format(lo)}–${hours.format(hi)}`;
export const fmtMoney = (n) => money.format(n);
export const fmtDay = (iso) => day.format(new Date(iso));
export const fmtTime = (iso) => time.format(new Date(iso));
