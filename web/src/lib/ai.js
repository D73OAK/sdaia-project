// ai.js: the browser's only way to the AI. It calls our own server route (/api/ai), never the provider:
// the API key lives on the server only. Returns the model's text, or throws an Error with an Arabic message.
import { AI_ERROR } from './strings.js';

export const AI_TIMEOUT_MS = 30000; // after this, the call counts as failed (medium reasoning takes longer)

export async function askAI(prompt, { timeoutMs = AI_TIMEOUT_MS } = {}) {
  let res;
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new Error(AI_ERROR); // offline, or the 15 seconds ran out
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(typeof data?.error === 'string' ? data.error : AI_ERROR);
  if (typeof data?.text !== 'string' || !data.text.trim()) throw new Error(AI_ERROR);
  return data.text;
}
