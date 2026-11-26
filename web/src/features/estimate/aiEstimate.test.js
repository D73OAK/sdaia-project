import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_PROMPT_CHARS, buildPrompt, checkJudgment, estimateCourse, parseAnswer } from './aiEstimate.js';
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
const formula = (m, level = 'mid') => estimateChapter(m, level);

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

describe('estimateCourse: the AI judges the difficulty, the formula measures the size', () => {
  it('scales the formula range by the difficulty, in ONE call', async () => {
    const fetch = mockFetch(
      '```json\n' +
        answer([
          { id: 'f1', difficulty: 4, reason: 'فيه اجتياز الأشجار تحتاج تتبّع' },
          { id: 'f2', difficulty: 2, reason: 'فيه الـstack والـqueue' },
          { id: 'f3', difficulty: 5, reason: 'تمارين إدخال في الـheap' },
        ]) +
        '\n```',
    );
    const out = await estimateCourse(course);
    expect(fetch).toHaveBeenCalledTimes(1);
    // f1: lo = round½(base 2.44 × 1.2 = 2.93) = 3, hi = round½(3 × 1.4) = 4
    expect(out.get(1)).toEqual({
      loHours: 3,
      hiHours: 4,
      reason: formula(metrics.a).reason, // the counted reason stays for the tooltip's first lines
      source: 'ai',
      aiReason: 'فيه اجتياز الأشجار تحتاج تتبّع',
      difficulty: 4,
    });
    expect(out.get(2)).toMatchObject({ loHours: 0.5, hiHours: 0.5, source: 'ai', difficulty: 2 }); // base 0.87 × 0.85 = 0.74
    expect(out.get(3)).toMatchObject({ loHours: 2, hiHours: 3, source: 'ai', difficulty: 5 }); // base 1.405 × 1.4 = 1.97
  });

  it('gives the same hours for the same difficulty, every time', async () => {
    const reply = answer([{ id: 'f1', difficulty: 3, reason: 'x' }]);
    mockFetch(reply);
    const one = await estimateCourse({ ...course, files: [course.files[0]] });
    const two = await estimateCourse({ ...course, files: [course.files[0]] });
    expect(one.get(1)).toEqual(two.get(1));
    expect(one.get(1)).toMatchObject({ loHours: 2.5, hiHours: 3.5 }); // difficulty 3 = the formula
  });

  it('applies the level through the formula, not through the AI', async () => {
    mockFetch(answer([{ id: 'f1', difficulty: 3, reason: 'x' }]));
    const weak = await estimateCourse({ ...course, level: 'weak', files: [course.files[0]] });
    expect(weak.get(1)).toMatchObject({ loHours: formula(metrics.a, 'weak').loHours });
  });

  it('falls back to the plain formula (not difficulty 3) for a file with a broken or missing answer', async () => {
    mockFetch(
      answer([
        { id: 'f1', difficulty: 7, reason: 'خارج المقياس' },
        { id: 'f2', difficulty: 2, reason: 'فيه الـstack والـqueue' },
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

  it('passes the signal to the call, so leaving the screen can cancel it', async () => {
    const ask = vi.fn(async () => '{"files":[]}');
    const leave = new AbortController();
    const file = { key: 1, kind: 'lecture', index: 1, metrics: { pages: 10, density: 'mid', equations: 0, exercises: 0 } };
    await estimateCourse({ name: 'x', level: 'mid', files: [file], signal: leave.signal }, ask);
    expect(ask).toHaveBeenCalledWith(expect.any(String), { signal: leave.signal });
  });


  it('makes no call when there is no file to ask about', async () => {
    const fetch = mockFetch('{}');
    expect((await estimateCourse({ ...course, files: [] })).size).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('checkJudgment', () => {
  it('accepts a whole difficulty from 1 to 5 and a reason', () => {
    expect(checkJudgment({ difficulty: 1, reason: 'سبب' })).toEqual({ difficulty: 1, reason: 'سبب' });
    expect(checkJudgment({ difficulty: 5, reason: 'سبب' })).toEqual({ difficulty: 5, reason: 'سبب' });
  });
  it.each([
    [{ difficulty: 0, reason: 'x' }],
    [{ difficulty: 6, reason: 'x' }],
    [{ difficulty: 2.5, reason: 'x' }],
    [{ difficulty: '3', reason: 'x' }],
    [{ reason: 'x' }],
    [{ difficulty: 3 }],
    [{ difficulty: 3, reason: '   ' }],
    [null],
  ])('rejects %j', (a) => expect(checkJudgment(a)).toBeNull());
  it('keeps the reason on one line', () =>
    expect(checkJudgment({ difficulty: 3, reason: 'سطر\nثاني' }).reason).toBe('سطر ثاني'));
  it.each([
    ['فيه شرح نموذج OSI وبروتوكولات TCP/IP.', 'فيه شرح نموذج OSI وبروتوكولات TCP/IP'],
    ['فيه جداول الحقيقة للبوابات المنطقية ... ', 'فيه جداول الحقيقة للبوابات المنطقية'],
    ['فيه تعريفات للبرمجيات۔', 'فيه تعريفات للبرمجيات'],
    ['فيه نماذج تطوير البرمجيات…', 'فيه نماذج تطوير البرمجيات'],
    ['فيه نماذج تطوير البرمجيات… ', 'فيه نماذج تطوير البرمجيات'],
    ['فيه أمثلة مثل 2.5 و TCP/IP v4.0', 'فيه أمثلة مثل 2.5 و TCP/IP v4.0'], // only a TRAILING period goes
  ])('drops a trailing period: %j', (reason, expected) =>
    expect(checkJudgment({ difficulty: 2, reason }).reason).toBe(expected));
  it('rejects a reason that is only periods', () => expect(checkJudgment({ difficulty: 2, reason: ' . ' })).toBeNull());
});

describe('parseAnswer', () => {
  it('ignores unknown ids and repeats', () => {
    const text = answer([
      { id: 'f9', difficulty: 3, reason: 'x' },
      { id: 'f1', difficulty: 3, reason: 'first' },
      { id: 'f1', difficulty: 4, reason: 'second' },
    ]);
    const out = parseAnswer(text, new Set(['f1']));
    expect([...out.keys()]).toEqual(['f1']);
    expect(out.get('f1').reason).toBe('first');
  });
});

describe('buildPrompt', () => {
  it('sends the label, the kind, the content counts and a sample, but no level, pages or hours', () => {
    const data = JSON.parse(buildPrompt(course));
    expect(data.course).toBe('هياكل البيانات');
    expect(data.files[0]).toMatchObject({ id: 'f1', label: 'شابتر ١', kind: 'chapter', density: 'mid', equations: 10 });
    expect(data.files[2]).toMatchObject({ label: 'تمارين ١', kind: 'exercises' });
    expect(data.files[0].sample.length).toBeLessThanOrEqual(1500);
    expect(data.level).toBeUndefined();
    expect(data.files[0].pages).toBeUndefined();
    expect(data.files[0].formulaRange).toBeUndefined();
    expect(data.alreadyJudged).toBeUndefined();
  });

  it('sends the saved files already judged as context', () => {
    const context = [{ kind: 'lecture', index: 1, difficulty: 4, reason: 'فيه خوارزميات' }];
    const data = JSON.parse(buildPrompt({ ...course, files: [{ ...course.files[1], index: 2 }], context }));
    expect(data.alreadyJudged).toEqual([{ label: 'شابتر ١', difficulty: 4, reason: 'فيه خوارزميات' }]);
    expect(data.files.map((f) => f.label)).toEqual(['شابتر ٢']);
  });

  it('shrinks the samples so a course with many files fits one call', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...course.files[0], key: i, index: i + 1 }));
    const prompt = buildPrompt({ ...course, files: many });
    expect(prompt.length).toBeLessThanOrEqual(MAX_PROMPT_CHARS);
    expect(JSON.parse(prompt).files[0].sample.length).toBeLessThan(1500);
  });
});
