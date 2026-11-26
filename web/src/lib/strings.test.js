import { describe, expect, it } from 'vitest';
import { fmtNumber } from './format.js';
import { AI_TEXT, loadingText } from './strings.js';

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

describe('AI_TEXT.tooltipLine (HANDOFF.md §8)', () => {
  it('shows the difficulty when there is one', () =>
    expect(AI_TEXT.tooltipLine('فيه تحويل بين الأنظمة العددية', fmtNumber(4), fmtNumber(5))).toBe(
      'تقدير الـAI (صعوبة ٤ من ٥): فيه تحويل بين الأنظمة العددية',
    ));
  it('keeps the short line for estimates saved before Version 4.5', () =>
    expect(AI_TEXT.tooltipLine('سبب')).toBe('تقدير الـAI: سبب'));
});
