// ai.js: the browser's only way to the AI. It calls our own server route (/api/ai), never the provider:
// the API key lives on the server only. Returns the model's text, or throws an Error with an Arabic message.
import { AI_ERROR } from './strings.js';

export const AI_TIMEOUT_MS = 30000; // after this, the call counts as failed (medium reasoning takes longer)

// One signal that aborts when either the timeout runs out or the caller aborts (the screen was left).
function eitherSignal(timeoutMs, outer) {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!outer) return timeout;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([timeout, outer]);
  const both = new AbortController(); // older browsers without AbortSignal.any
  for (const s of [timeout, outer]) {
    if (s.aborted) both.abort();
    else s.addEventListener('abort', () => both.abort(), { once: true });
  }
  return both.signal;
}

// signal: optional; aborting it cancels the request (it then throws like any failed call).
export async function askAI(prompt, { timeoutMs = AI_TIMEOUT_MS, signal } = {}) {
  let res;
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: eitherSignal(timeoutMs, signal),
    });
  } catch {
    throw new Error(AI_ERROR); // offline, the 30 seconds ran out, or the screen was left
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : AI_ERROR);
  if (typeof data?.text !== 'string' || !data.text.trim()) throw new Error(AI_ERROR);
  return data.text;
}
