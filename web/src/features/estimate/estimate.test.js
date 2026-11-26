import { describe, expect, it } from 'vitest';
// The sample data (web/src/data/mock.json).
import mock from '../../data/mock.json';
import { ESTIMATE_CONFIG, courseTotal, densityOf, estimateChapter, estimateWithDifficulty, roundHalf, shiftRange } from './estimate.js';

describe('estimateChapter matches every chapter in mock.json', () => {
  for (const course of mock.courses) {
    for (const ch of course.chapters) {
      it(`${course.id} ${ch.fileName}`, () => {
        expect(estimateChapter(ch.metrics, course.level)).toEqual(ch.estimate);
      });
    }
  }
});

describe('the formula', () => {
  // base = 37×0.0375 + 0 + 12×0.03 + 5×0.12 = 2.3475
  const metrics = { pages: 37, density: 'low', equations: 12, exercises: 5 };

  it('applies the level multiplier: strong ×0.75, mid ×1, weak ×1.4', () => {
    expect(estimateChapter(metrics, 'strong')).toMatchObject({ loHours: 2, hiHours: 3 }); // 1.76 -> 2
    expect(estimateChapter(metrics, 'mid')).toMatchObject({ loHours: 2.5, hiHours: 3.5 }); // 2.35 -> 2.5
    expect(estimateChapter(metrics, 'weak')).toMatchObject({ loHours: 3.5, hiHours: 5 }); // 3.29 -> 3.5
  });

  it('never goes below half an hour', () => {
    const tiny = { pages: 1, density: 'low', equations: 0, exercises: 0 };
    expect(estimateChapter(tiny, 'strong')).toMatchObject({ loHours: 0.5, hiHours: 0.5 });
  });

  it('rejects an unknown level', () => {
    expect(() => estimateChapter(metrics, 'expert')).toThrow();
  });

  it('writes the reason in Arabic digits with the level', () => {
    expect(estimateChapter(metrics, 'weak').reason).toBe(
      '٣٧ صفحة، كثافة النص خفيفة، ١٢ معادلة، ٥ تمرين، مستواك فيها: ضعيف',
    );
  });
});

describe('roundHalf', () => {
  it('rounds to the nearest half hour', () => {
    expect(roundHalf(3.934)).toBe(4);
    expect(roundHalf(5.6)).toBe(5.5);
    expect(roundHalf(5.75)).toBe(6);
    expect(roundHalf(2.2)).toBe(2);
  });
});

describe('densityOf', () => {
  it('buckets words per page: low < 120, mid 120–300, high > 300', () => {
    expect(densityOf(0)).toBe('low');
    expect(densityOf(119)).toBe('low');
    expect(densityOf(120)).toBe('mid');
    expect(densityOf(300)).toBe('mid');
    expect(densityOf(301)).toBe('high');
  });
});

describe('courseTotal', () => {
  it('adds up the readable chapters and skips chapters with an error', () => {
    const chapters = [
      { estimate: { loHours: 4, hiHours: 5.5 } },
      { error: 'not_pdf' },
      { estimate: { loHours: 2.5, hiHours: 3.5 } },
    ];
    expect(courseTotal(chapters)).toEqual({ loHours: 6.5, hiHours: 9 });
  });
});

describe('shiftRange (− / + on a file)', () => {
  it('moves both ends by half an hour', () => {
    expect(shiftRange({ loHours: 2.5, hiHours: 3.5 }, 0.5)).toEqual({ loHours: 3, hiHours: 4 });
    expect(shiftRange({ loHours: 2.5, hiHours: 3.5 }, -0.5)).toEqual({ loHours: 2, hiHours: 3 });
  });
  it('never takes the low end under half an hour', () => {
    expect(shiftRange({ loHours: 0.5, hiHours: 1 }, -0.5)).toBeNull();
    expect(shiftRange({ loHours: 1, hiHours: 1.5 }, -0.5)).toEqual({ loHours: 0.5, hiHours: 1 });
  });
});

describe('estimateWithDifficulty (Version 4.6: the AI judges, the formula measures)', () => {
  const m = { pages: 40, density: 'mid', equations: 10, exercises: 2 }; // formula (mid) 2.5–3.5

  it('keeps the multipliers in ESTIMATE_CONFIG', () =>
    expect(ESTIMATE_CONFIG.difficultyMultiplier).toEqual({ 1: 0.7, 2: 0.85, 3: 1, 4: 1.2, 5: 1.4 }));

  it.each([
    [1, 2, 3], // round½(2.5 × 0.7 = 1.75) = 2, hi round½(2.8) = 3
    [2, 2, 3], // round½(2.125) = 2
    [3, 2.5, 3.5], // difficulty 3 is the formula itself
    [4, 3, 4], // round½(3) = 3, hi round½(4.2) = 4
    [5, 3.5, 5], // round½(3.5) = 3.5, hi round½(4.9) = 5
  ])('difficulty %i -> %s–%s h', (d, lo, hi) =>
    expect(estimateWithDifficulty(m, 'mid', d)).toMatchObject({ loHours: lo, hiHours: hi }));

  it('never goes under half an hour', () => {
    const tiny = { pages: 10, density: 'low', equations: 0, exercises: 0 }; // formula 0.5–0.5
    expect(estimateWithDifficulty(tiny, 'mid', 1)).toMatchObject({ loHours: 0.5, hiHours: 0.5 });
  });

  it('keeps the formula reason and applies the level through the formula', () => {
    expect(estimateWithDifficulty(m, 'weak', 3)).toEqual(estimateChapter(m, 'weak'));
  });

  it('rejects an unknown difficulty', () => expect(() => estimateWithDifficulty(m, 'mid', 6)).toThrow());
});
