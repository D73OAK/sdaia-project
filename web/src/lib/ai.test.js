import { afterEach, describe, expect, it, vi } from 'vitest';
import { askAI } from './ai.js';

afterEach(() => vi.unstubAllGlobals());

// A fetch that waits until its signal aborts (like a slow AI answer), then rejects like the browser does.
function hangingFetch() {
  const fn = vi.fn(
    (_, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('askAI: leaving the screen cancels the call (Version 4.7 review)', () => {
  it('aborting the outer signal cancels the request and throws', async () => {
    const fetch = hangingFetch();
    const leave = new AbortController();
    const call = askAI('prompt', { signal: leave.signal });
    leave.abort();
    await expect(call).rejects.toThrow();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('the 30-second timeout still works when an outer signal is given', async () => {
    hangingFetch();
    await expect(askAI('prompt', { timeoutMs: 10, signal: new AbortController().signal })).rejects.toThrow();
  });
});
