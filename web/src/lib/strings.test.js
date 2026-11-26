import { describe, expect, it } from 'vitest';
import { fmtNumber } from './format.js';
import { loadingText } from './strings.js';

describe('loadingText (HANDOFF.md §8): Arabic number agreement', () => {
  const text = (n) => loadingText(n, fmtNumber(n));
  it.each([
    [1, 'نقرأ ملف ونحسب وقت مذاكرتك...'],
    [2, 'نقرأ ملفين ونحسب وقت مذاكرتك...'],
    [3, 'نقرأ ٣ ملفات ونحسب وقت مذاكرتك...'],
    [10, 'نقرأ ١٠ ملفات ونحسب وقت مذاكرتك...'],
    [11, 'نقرأ ١١ ملف ونحسب وقت مذاكرتك...'],
    [25, 'نقرأ ٢٥ ملف ونحسب وقت مذاكرتك...'],
  ])('%i file(s)', (n, expected) => expect(text(n)).toBe(expected));
});
