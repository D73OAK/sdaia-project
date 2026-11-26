// aiEstimate.js: the AI judges the difficulty, the formula measures the size (HANDOFF.md §7 rule 5).
// When a course is saved, ONE call carries the course's new files. For each file the AI gives only a
// difficulty of its content (1–5) and a reason; the hours come from the formula range scaled by that
// difficulty (estimateWithDifficulty), so the same file always gets the same hours. A file whose answer
// is missing or broken gets the plain formula, and if the whole call fails, every file does.
// Nothing here shows an error: the student always gets an estimate.
//
// The prompt (course name; per new file: label, kind, text density, equation and exercise counts, a text
// sample; saved files as context: label, difficulty, reason) goes to our server route (api/ai.js),
// which adds the system message and calls the provider. The level is NOT sent: the difficulty is about
// the content, and the formula applies the level.
import { askAI } from '../../lib/ai.js';
import { fmtNumber } from '../../lib/format.js';
import { SAMPLE_CHARS, spreadText } from '../../lib/pdf.js';
import { fileLabel } from '../../lib/strings.js';
import { ESTIMATE_CONFIG, estimateChapter, estimateWithDifficulty } from './estimate.js';

// The same limit as api/ai.js (kept separate so no server code ends up in the browser bundle).
export const MAX_PROMPT_CHARS = 12000;
const MIN_SAMPLE_CHARS = 150; // below this a sample says too little; send numbers only
const MAX_REASON_CHARS = 200;

// The difficulties the AI may give: the keys of ESTIMATE_CONFIG.difficultyMultiplier (1–5).
const DIFFICULTIES = Object.keys(ESTIMATE_CONFIG.difficultyMultiplier).map(Number);

// files:   [{ key, kind, index, metrics, sample? }]   the files to judge (sample: memory only)
// context: [{ kind, index, difficulty, reason }]     saved files already judged, for comparison only
// Returns the prompt text, or null when even the numbers alone do not fit the limit.
export function buildPrompt({ name, files, context = [] }) {
  const label = (f) => fileLabel(f.kind, fmtNumber(f.index));
  const make = (sampleChars) => {
    const data = {
      course: name.trim(),
      files: files.map((f, i) => {
        const entry = {
          id: `f${i + 1}`,
          label: label(f),
          kind: f.kind === 'exercises' ? 'exercises' : 'chapter',
          density: f.metrics.density,
          equations: f.metrics.equations,
          exercises: f.metrics.exercises,
        };
        const sample = f.sample && sampleChars >= MIN_SAMPLE_CHARS ? spreadText(f.sample, sampleChars) : '';
        if (sample) entry.sample = sample;
        return entry;
      }),
    };
    if (context.length)
      data.alreadyJudged = context.map((c) => ({ label: label(c), difficulty: c.difficulty, reason: c.reason }));
    return JSON.stringify(data);
  };

  // 1500 characters per file, fewer when the course has many files, so the whole course fits one call.
  let chars = SAMPLE_CHARS;
  let prompt = make(chars);
  while (prompt.length > MAX_PROMPT_CHARS && chars >= MIN_SAMPLE_CHARS) {
    chars = Math.floor(chars * (MAX_PROMPT_CHARS / prompt.length) * 0.95);
    prompt = make(chars);
  }
  return prompt.length <= MAX_PROMPT_CHARS ? prompt : null;
}

// Finds the JSON object in the answer (models sometimes wrap it in ```json fences or a sentence).
function readJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Checks one file's answer: a whole difficulty from 1 to 5 and a non-empty reason.
// Returns { difficulty, reason } (the reason on one line, without a trailing period) or null.
export function checkJudgment(answer) {
  if (!answer || typeof answer !== 'object') return null;
  const { difficulty, reason } = answer;
  if (!DIFFICULTIES.includes(difficulty)) return null;
  if (typeof reason !== 'string') return null;
  // The tooltip line is not a sentence that ends: drop trailing periods («.», the Arabic «۔») and «…».
  const line = reason
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.۔…]+$/u, '')
    .trim()
    .slice(0, MAX_REASON_CHARS);
  if (!line) return null;
  return { difficulty, reason: line };
}

// The answer text -> Map(id -> checked judgment) for the asked ids that passed. Broken text: an empty map.
export function parseAnswer(text, ids) {
  const judged = new Map();
  const data = readJson(text);
  if (!data || !Array.isArray(data.files)) return judged;
  for (const item of data.files) {
    const id = item?.id;
    if (!ids.has(id) || judged.has(id)) continue;
    const judgment = checkJudgment(item);
    if (judgment) judged.set(id, judgment);
  }
  return judged;
}

// The estimate saved for a file the AI judged.
export const aiEstimate = (metrics, level, { difficulty, reason }) => ({
  ...estimateWithDifficulty(metrics, level, difficulty),
  source: 'ai',
  aiReason: reason,
  difficulty,
});

// One AI call for the new files of one course. Returns Map(file key -> estimate), one for every file:
//   judged by the AI: { loHours, hiHours, reason, source: 'ai', aiReason, difficulty }
//   the formula:      { loHours, hiHours, reason, source: 'formula' }
// `reason` is always the formula's counted reason (pages, density …), the tooltip's first lines.
// `ask` is lib/ai.js's askAI; tests pass their own. `signal` (optional) cancels the call when the screen is left.
export async function estimateCourse({ name, level, files, context = [], signal }, ask = askAI) {
  const result = new Map(files.map((f) => [f.key, { ...estimateChapter(f.metrics, level), source: 'formula' }]));
  if (!files.length) return result;

  const prompt = buildPrompt({ name, files, context });
  if (!prompt) return result;

  let text;
  try {
    text = await ask(prompt, { signal });
  } catch {
    return result; // failed, timed out or no key: the formula for every file, no message
  }

  const judged = parseAnswer(text, new Set(files.map((_, i) => `f${i + 1}`)));
  files.forEach((f, i) => {
    const judgment = judged.get(`f${i + 1}`);
    if (judgment) result.set(f.key, aiEstimate(f.metrics, level, judgment));
  });
  return result;
}
