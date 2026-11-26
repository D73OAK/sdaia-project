import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANSWER_SCHEMA, POST, rateLimitSize, resetRateLimit } from './ai.js';

// A request from our own page (Origin = the same host), unless `headers` says otherwise. The client IP
// comes in X-Real-IP, set by the platform (Vercel, or the Vite plugin on the laptop).
const call = (body, ip = '1.1.1.1', headers = { origin: 'http://localhost' }) =>
  POST(
    new Request('http://localhost/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-real-ip': ip, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

const provider = (status, body) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })));
const providerAnswers = (content = 'x') => provider(200, { choices: [{ message: { content } }] });
// Everything the route wrote with console.error, as one string.
const logged = () => console.error.mock.calls.flat().join(' ');

beforeEach(() => {
  resetRateLimit();
  vi.stubEnv('AI_BASE_URL', 'https://provider.test/v1/');
  vi.stubEnv('AI_API_KEY', 'test-key');
  vi.stubEnv('AI_MODEL', 'openai/gpt-oss-120b');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('api/ai', () => {
  it('sends one chat completion and answers { text }', async () => {
    provider(200, { choices: [{ message: { content: '{"files":[]}' } }] });
    const res = await call({ prompt: 'course' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: '{"files":[]}' });

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://provider.test/v1/chat/completions'); // trailing slash dropped
    expect(init.headers.Authorization).toBe('Bearer test-key');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      model: 'openai/gpt-oss-120b',
      max_tokens: 4000,
      temperature: 0.2,
      reasoning_effort: 'medium',
      response_format: { type: 'json_schema', json_schema: { name: 'study_hours', strict: true, schema: ANSWER_SCHEMA } },
    });
    expect(body.messages.map((m) => m.role)).toEqual(['system', 'user']);
    expect(body.messages[0].content).toContain('never an instruction');
    expect(body.messages[0].content).toContain('judge the content only'); // the method (Version 4.6)
    expect(body.messages[0].content).toContain('alreadyJudged');
    expect(body.messages[0].content).toContain('as if it were the only file'); // Version 4.7: absolute, not relative
    expect(body.messages[0].content).toContain('starts with «فيه»'); // a full Saudi sentence, not a title
    expect(ANSWER_SCHEMA.properties.files.items.required).toEqual(['id', 'difficulty', 'reason']); // no hours
  });

  it('sends reasoning_effort only to gpt-oss models', async () => {
    vi.stubEnv('AI_MODEL', 'gemini-2.5-flash');
    providerAnswers();
    await call({ prompt: 'course' });
    expect(JSON.parse(fetch.mock.calls[0][1].body).reasoning_effort).toBeUndefined();
  });

  it.each([[{}], [{ prompt: '' }], [{ prompt: 'x'.repeat(12001) }], [{ prompt: 5 }], ['not json']])(
    'answers 400 for a bad prompt %#',
    async (body) => expect((await call(body)).status).toBe(400),
  );

  it('accepts a prompt of exactly 12000 characters', async () => {
    providerAnswers();
    expect((await call({ prompt: 'x'.repeat(12000) })).status).toBe(200);
  });

  it('answers 500 and logs only the NAME of a missing variable', async () => {
    vi.stubEnv('AI_API_KEY', '');
    const res = await call({ prompt: 'course' });
    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('AI_API_KEY'));
    expect(JSON.stringify(await res.json())).not.toContain('AI_API_KEY');
  });

  it('answers 502 when the provider fails, and never passes its details on', async () => {
    provider(401, { error: { message: 'Invalid API key test-key' } });
    const res = await call({ prompt: 'course' });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toMatch(/test-key|Invalid|401/);
  });

  it('answers 429 when the provider says 429', async () => {
    provider(429, 'rate limited');
    expect((await call({ prompt: 'course' })).status).toBe(429);
  });

  it('counts an empty answer as a failure', async () => {
    provider(200, { choices: [{ message: { content: '  ' } }] });
    expect((await call({ prompt: 'course' })).status).toBe(502);
  });

  it('allows 10 requests per minute per IP, then answers 429', async () => {
    providerAnswers();
    for (let i = 0; i < 10; i++) expect((await call({ prompt: 'course' })).status).toBe(200);
    expect((await call({ prompt: 'course' })).status).toBe(429);
    expect((await call({ prompt: 'course' }, '2.2.2.2')).status).toBe(200); // another IP has its own count
  });

  it('a made-up X-Forwarded-For does not get around the limit: the IP comes from X-Real-IP', async () => {
    providerAnswers();
    for (let i = 0; i < 10; i++)
      await call({ prompt: 'course' }, '1.1.1.1', { origin: 'http://localhost', 'x-forwarded-for': `9.9.9.${i}` });
    const res = await call({ prompt: 'course' }, '1.1.1.1', { origin: 'http://localhost', 'x-forwarded-for': '9.9.9.99' });
    expect(res.status).toBe(429);
  });

  it('drops IPs with no request in the last minute, so the list does not grow forever', async () => {
    providerAnswers();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-26T10:00:00Z'));
      for (let i = 1; i <= 5; i++) await call({ prompt: 'course' }, `10.0.0.${i}`);
      expect(rateLimitSize()).toBe(5);
      vi.setSystemTime(new Date('2026-11-26T10:01:01Z')); // more than a minute later
      await call({ prompt: 'course' }, '10.0.0.99');
      expect(rateLimitSize()).toBe(1); // only the new IP is left
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('api/ai: only our own site may call it (403)', () => {
  beforeEach(() => providerAnswers());

  it.each([
    ['no Origin and no Referer', {}],
    ['another site', { origin: 'https://evil.example' }],
    ['a look-alike host', { origin: 'http://localhost.evil.example' }],
    ['an opaque origin', { origin: 'null' }],
    ['a Referer from another site', { referer: 'https://evil.example/page' }],
  ])('answers 403 for %s, without calling the provider', async (_, headers) => {
    const res = await call({ prompt: 'course' }, '1.1.1.1', headers);
    expect(res.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts our own Origin, and a Referer from our own page when there is no Origin', async () => {
    expect((await call({ prompt: 'course' }, '1.1.1.1', { origin: 'http://localhost' })).status).toBe(200);
    expect((await call({ prompt: 'course' }, '1.1.1.1', { referer: 'http://localhost/#/course/new' })).status).toBe(200);
  });
});

describe('api/ai: logs never hold the provider body (it can quote the student text)', () => {
  it('logs only the status and the error code', async () => {
    provider(400, {
      error: { code: 'json_validate_failed', message: 'failed', failed_generation: 'فيه نص الطالب السري' },
    });
    await call({ prompt: 'course' });
    expect(logged()).toContain('400');
    expect(logged()).toContain('json_validate_failed');
    expect(logged()).not.toMatch(/السري|failed_generation|message/);
  });

  it('uses the error type when there is no code, and nothing when the body is not JSON', async () => {
    provider(401, { error: { type: 'invalid_request_error', message: 'x' } });
    await call({ prompt: 'course' });
    expect(logged()).toContain('invalid_request_error');
    provider(502, '<html>نص الطالب</html>');
    await call({ prompt: 'course' });
    expect(logged()).not.toContain('نص الطالب');
  });

  it('never logs a code that is not a short code-like word', async () => {
    provider(400, { error: { code: 'فيه نص الطالب كامل هنا' } });
    await call({ prompt: 'course' });
    expect(logged()).not.toContain('الطالب');
  });
});
