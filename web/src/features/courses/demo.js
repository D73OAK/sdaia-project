// demo.js: the sample courses behind «أو جرّب ببيانات تجريبية» (from data/mock.json).
// mock.json was written for one fixed "today", so every exam date is moved by the same number of days
// to keep the same distance from the real today. The estimates were counted from real-looking numbers.
import mock from '../../data/mock.json';
import { addDays } from '../schedule/schedule.js';

const dayNumber = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

// today: 'YYYY-MM-DD' on the student's device.
export function demoCourses(today) {
  const shift = dayNumber(today) - dayNumber(mock.today);
  return mock.courses.map((c) => ({ ...structuredClone(c), color: `--c${c.order}`, examDate: addDays(c.examDate, shift) }));
}
