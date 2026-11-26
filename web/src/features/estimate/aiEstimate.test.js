import { afterEach, describe, expect, it, vi } from 'vitest';
import { AI_BOUNDS, MAX_PROMPT_CHARS, buildPrompt, checkRange, estimateCourse, parseAnswer } from './aiEstimate.js';
import { estimateChapter } from './estimate.js';

// Two chapters and one exercise file, level mid. Formula: f1 2.5–3.5, f2 1–1.5, f3 1.5–2.
const metrics = {
  a: { pages: 40, density: 'mid', equations: 10, exercises: 2 },
  b: { pages: 20, density: 'low', equations: 0, exercises: 1 },
  c: { pages: 10, density: 'mid', equations: 5, exercises: 4 },
};
const course = {
  name: 'هياكل البيانات',
  level: 'mid',
  files: [
    { key: 1, kind: 'lecture', index: 1, metrics: metrics.a, sample: 'Binary trees and traversal '.repeat(200) },
    { key: 2, kind: 'lecture', index: 2, metrics: metrics.b, sample: 'Stacks and queues '.repeat(200) },
    { key: 3, kind: 'exercises', index: 1, metrics: metrics.c, sample: 'Exercise 1: insert into a heap '.repeat(50) },
  ],
};
const formula = (m) => estimateChapter(m, 'mid');

// A fake /api/ai: the route answers { text } with the model's reply.
function mockFetch(reply, { status = 200 } = {}) {
  const fn = vi.fn(async () =>
    new Response(JSON.stringify(status === 200 ? { text: reply } : { error: 'x' }), { status }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}
const answer = (files) => JSON.stringify({ files });

afterEach(() => vi.unstubAllGlobals());

describe('estimateCourse: the AI decides, the formula is the failsafe', () => {
  it('uses a valid answer for every file, rounded to half hours, in ONE call', async () => {
    const fetch = mockFetch(
      '```json\n' +
        answer([
          { id: 'f1', difficulty: 4, loHours: 3, hiHours: 3.9, reason: 'فيه اجتياز الأشجار تحتاج تتبّع' },
          { id: 'f2', difficulty: 2, loHours: 1, hiHours: 1.5, reason: 'فيه الـstack والـqueue' },
          { id: 'f3', difficulty: 3, loHours: 2, hiHours: 2.5, reason: 'تمارين إدخال في الـheap' },
        ]) +
        '\n```',
    );
    const out = await estimateCourse(course);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(out.get(1)).toEqual({
      loHours: 3,
      hiHours: 4,
      reason: formula(metrics.a).reason, // the counted reason stays for the tooltip's first lines
      source: 'ai',
      aiReason: 'فيه اجتياز الأشجار تحتاج تتبّع',
      difficulty: 4,
    });
    expect(out.get(2)).toMatchObject({ loHours: 1, hiHours: 1.5, source: 'ai', difficulty: 2 });
    expect(out.get(3)).toMatchObject({ loHours: 2, hiHours: 2.5, source: 'ai', difficulty: 3 });
  });

  it('falls back to the formula only for an out-of-bounds file', async () => {
    mockFetch(
      answer([
        { id: 'f1', difficulty: 3, loHours: 2.5, hiHours: 5, reason: 'واسع' }, // hi > round½(2.5 × 1.4) = 3.5
        { id: 'f2', difficulty: 2, loHours: 1, hiHours: 1.5, reason: 'فيه الـstack والـqueue' },
        // f3 missing from the answer
      ]),
    );
    const out = await estimateCourse(course);
    expect(out.get(1)).toEqual({ ...formula(metrics.a), source: 'formula' });
    expect(out.get(2).source).toBe('ai');
    expect(out.get(3)).toEqual({ ...formula(metrics.c), source: 'formula' });
  });

  it.each([
    ['a broken answer', () => mockFetch('sorry, I cannot do that')],
    ['JSON of the wrong shape', () => mockFetch('{"hours": 3}')],
    ['a failed call (502)', () => mockFetch('', { status: 502 })],
    ['a missing key (500)', () => mockFetch('', { status: 500 })],
    ['no network', () => vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('offline'))))],
  ])('falls back to the formula for every file after %s', async (_, setup) => {
    setup();
    const out = await estimateCourse(course);
    for (const f of course.files) expect(out.get(f.key)).toEqual({ ...formula(f.metrics), source: 'formula' });
  });

  it('falls back for every file when the call times out', async () => {
    const out = await estimateCourse(course, () => Promise.reject(new Error('timeout')));
    expect([...out.values()].every((e) => e.source === 'formula')).toBe(true);
  });

  it('makes no call when there is no file to ask about', async () => {
    const fetch = mockFetch('{}');
    expect((await estimateCourse({ ...course, files: [] })).size).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('checkRange: the rules for one file', () => {
  const f = { loHours: 2, hiHours: 3 }; // formula hi 3: the AI hi must be between 1 and 9
  const ok = (lo, hi, difficulty = 3) => checkRange({ loHours: lo, hiHours: hi, reason: 'سبب', difficulty }, f);

  it('accepts a range inside the rules and keeps the difficulty', () =>
    expect(ok(4, 5.5, 4)).toEqual({ loHours: 4, hiHours: 5.5, reason: 'سبب', difficulty: 4 }));

  it('needs numbers, a reason and a difficulty', () => {
    expect(checkRange({ loHours: '2', hiHours: 3, reason: 'x', difficulty: 3 }, f)).toBeNull();
    expect(checkRange({ loHours: 2, hiHours: 3, difficulty: 3 }, f)).toBeNull();
    expect(checkRange({ loHours: 2, hiHours: 3, reason: '  ', difficulty: 3 }, f)).toBeNull();
    expect(checkRange({ loHours: 2, hiHours: 3, reason: 'x' }, f)).toBeNull();
  });

  it('needs a whole difficulty from 1 to 5', () => {
    expect(ok(2, 2.5, 0)).toBeNull();
    expect(ok(2, 2.5, 6)).toBeNull();
    expect(ok(2, 2.5, 2.5)).toBeNull();
    expect(ok(2, 2.5, 1)).not.toBeNull();
    expect(ok(2, 2.5, 5)).not.toBeNull();
  });

  it('needs lo ≥ 0.5 and hi ≥ lo', () => {
    expect(ok(0.4, 0.5)).toBeNull();
    expect(ok(3, 2.5)).toBeNull();
  });

  it('keeps the range as narrow as the formula: hi ≤ round½(lo × 1.4)', () => {
    expect(AI_BOUNDS.maxSpread).toBe(1.4);
    expect(ok(1, 1.5)).not.toBeNull(); // 1.4 rounds to 1.5
    expect(ok(1, 2)).toBeNull();
    expect(ok(2, 3)).not.toBeNull(); // 2.8 rounds to 3
    expect(ok(2, 3.5)).toBeNull();
    expect(ok(2.5, 3.5)).not.toBeNull();
    expect(ok(2.5, 4)).toBeNull();
  });

  it('needs hi between a third and three times the formula hi', () => {
    expect(ok(0.5, 0.5)).toBeNull(); // under 3 ÷ 3 = 1
    expect(ok(7, 9.5)).toBeNull(); // over 3 × 3 = 9
    expect(ok(1, 1)).not.toBeNull();
    expect(ok(7, 9)).not.toBeNull();
  });

  it('lets a half-hour formula file go up to 2 hours: hi ≤ max(3 × formula hi, 2)', () => {
    const tiny = { loHours: 0.5, hiHours: 0.5 }; // 3 × 0.5 = 1.5, so the 2-hour floor wins
    const check = (lo, hi) => checkRange({ loHours: lo, hiHours: hi, reason: 'x', difficulty: 2 }, tiny);
    expect(check(1.5, 2)).not.toBeNull();
    expect(check(2, 2.5)).toBeNull();
  });

  it('keeps the reason on one line', () =>
    expect(checkRange({ loHours: 2, hiHours: 2.5, reason: 'سطر\nثاني', difficulty: 3 }, f).reason).toBe('سطر ثاني'));
});

describe('parseAnswer', () => {
  it('ignores unknown ids and repeats', () => {
    const formulas = new Map([['f1', { loHours: 2, hiHours: 3 }]]);
    const text = answer([
      { id: 'f9', difficulty: 3, loHours: 2, hiHours: 2.5, reason: 'x' },
      { id: 'f1', difficulty: 3, loHours: 2, hiHours: 2.5, reason: 'first' },
      { id: 'f1', difficulty: 3, loHours: 3, hiHours: 4, reason: 'second' },
    ]);
    const out = parseAnswer(text, formulas);
    expect([...out.keys()]).toEqual(['f1']);
    expect(out.get('f1').reason).toBe('first');
  });
});

describe('buildPrompt', () => {
  it('sends the label, the numbers, the formula range and a sample of up to 1500 characters', () => {
    const data = JSON.parse(buildPrompt(course));
    expect(data).toMatchObject({ course: 'هياكل البيانات', level: 'mid' });
    expect(data.files[0]).toMatchObject({ id: 'f1', label: 'شابتر ١', pages: 40, formulaRange: [2.5, 3.5] });
    expect(data.files[2].label).toBe('تمارين ١');
    expect(data.files[0].sample.length).toBeLessThanOrEqual(1500);
  });

  it('sends a saved file its earlier AI reason instead of a sample', () => {
    const saved = { key: 9, kind: 'lecture', index: 1, metrics: metrics.a, previousReason: 'فيه خوارزميات' };
    const data = JSON.parse(buildPrompt({ ...course, files: [saved] }));
    expect(data.files[0].previousReason).toBe('فيه خوارزميات');
    expect(data.files[0].sample).toBeUndefined();
  });

  it('shrinks the samples so a course with many files fits one call', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...course.files[0], key: i, index: i + 1 }));
    const prompt = buildPrompt({ ...course, files: many });
    expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    expect(JSON.parse(prompt).files[0].sample.length).toBeLessThan(1500);
  });
});
