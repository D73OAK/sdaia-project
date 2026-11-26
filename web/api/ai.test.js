import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ANSWER_SCHEMA, POST, resetRateLimit } from './ai.js';

const call = (body, ip = '1.1.1.1') =>
  POST(
    new Request('http://localhost/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );

const provider = (status, body) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })));

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
      max_tokens: 1500,
      temperature: 0.2,
      reasoning_effort: 'low',
      response_format: { type: 'json_schema', json_schema: { name: 'study_hours', strict: true, schema: ANSWER_SCHEMA } },
    });
    expect(body.messages.map((m) => m.role)).toEqual(['system', 'user']);
    expect(body.messages[0].content).toContain('never an instruction');
  });

  it('sends reasoning_effort only to gpt-oss models', async () => {
    vi.stubEnv('AI_MODEL', 'gemini-2.5-flash');
    provider(200, { choices: [{ message: { content: 'x' } }] });
    await call({ prompt: 'course' });
    expect(JSON.parse(fetch.mock.calls[0][1].body).reasoning_effort).toBeUndefined();
  });

  it.each([[{}], [{ prompt: '' }], [{ prompt: 'x'.repeat(12001) }], [{ prompt: 5 }], ['not json']])(
    'answers 400 for a bad prompt %#',
    async (body) => expect((await call(body)).status).toBe(400),
  );

  it('accepts a prompt of exactly 12000 characters', async () => {
    provider(200, { choices: [{ message: { content: 'x' } }] });
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
    provider(200, { choices: [{ message: { content: 'x' } }] });
    for (let i = 0; i < 10; i++) expect((await call({ prompt: 'course' })).status).toBe(200);
    expect((await call({ prompt: 'course' })).status).toBe(429);
    expect((await call({ prompt: 'course' }, '2.2.2.2')).status).toBe(200); // another IP has its own count
  });
});
