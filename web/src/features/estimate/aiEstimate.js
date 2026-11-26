// aiEstimate.js: the AI decides the study time, the formula is the failsafe (HANDOFF.md §7 rule 5).
// When a course is saved, ONE call carries the whole course. The answer is checked file by file: a file
// whose range breaks a rule below gets the formula, and if the whole call fails, every file does.
// Nothing here shows an error: the student always gets an estimate.
//
// The prompt (course name, level, per file: label, counted numbers, formula range, text sample) is sent
// to our server route (api/ai.js), which adds the system message and calls the provider.
import { askAI } from '../../lib/ai.js';
import { fmtNumber } from '../../lib/format.js';
import { SAMPLE_CHARS, spreadText } from '../../lib/pdf.js';
import { fileLabel } from '../../lib/strings.js';
import { ESTIMATE_CONFIG, estimateChapter, roundHalf } from './estimate.js';

// The same limit as api/ai.js (kept separate so no server code ends up in the browser bundle).
export const MAX_PROMPT_CHARS = 12000;
const MIN_SAMPLE_CHARS = 150; // below this a sample says too little; send numbers only
const MAX_REASON_CHARS = 200;

// The checks on the AI's range for one file (all must pass), against the formula's range for that file.
// maxSpread is the formula's own rangeFactor (1.4), with the same rounding: hi ≤ round½(lo × 1.4), so
// lo 1 allows hi 1.5 and lo 2 allows hi 3, exactly like the formula's widest range.
export const AI_BOUNDS = {
  minLo: 0.5, // lo ≥ 0.5
  maxSpread: ESTIMATE_CONFIG.rangeFactor, // hi ≤ round½(lo × 1.4)
  minOfFormulaHi: 1 / 3, // hi ≥ formula hi ÷ 3
  maxOfFormulaHi: 3, // hi ≤ max(formula hi × 3, maxHiFloor)
  maxHiFloor: 2, // so a file the formula puts at half an hour can still get up to 2 hours
  difficulty: [1, 5], // a whole number in this range
};

// files: [{ key, kind, index, metrics, sample?, previousReason? }]
//   sample          text spread across a file picked now (memory only)
//   previousReason  the earlier AI reason of a saved file (its text is not kept, so it has no sample)
// Returns the prompt text, or null when even the numbers alone do not fit the limit.
export function buildPrompt({ name, level, files }) {
  const make = (sampleChars) =>
    JSON.stringify({
      course: name.trim(),
      level,
      files: files.map((f, i) => {
        const formula = estimateChapter(f.metrics, level);
        const entry = {
          id: `f${i + 1}`,
          label: fileLabel(f.kind, fmtNumber(f.index)),
          pages: f.metrics.pages,
          density: f.metrics.density,
          equations: f.metrics.equations,
          exercises: f.metrics.exercises,
          formulaRange: [formula.loHours, formula.hiHours],
        };
        const sample = f.sample && sampleChars >= MIN_SAMPLE_CHARS ? spreadText(f.sample, sampleChars) : '';
        if (sample) entry.sample = sample;
        else if (f.previousReason) entry.previousReason = f.previousReason;
        return entry;
      }),
    });

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

// Checks one file's answer against the rules. Returns { loHours, hiHours, reason, difficulty } or null.
export function checkRange(answer, formula) {
  if (!answer || typeof answer !== 'object') return null;
  const { loHours, hiHours, reason, difficulty } = answer;
  if (typeof loHours !== 'number' || typeof hiHours !== 'number') return null;
  if (!Number.isFinite(loHours) || !Number.isFinite(hiHours) || loHours < AI_BOUNDS.minLo) return null;
  const lo = roundHalf(loHours);
  const hi = roundHalf(hiHours);
  if (lo < AI_BOUNDS.minLo || hi < lo || hi > roundHalf(lo * AI_BOUNDS.maxSpread)) return null;
  const maxHi = Math.max(formula.hiHours * AI_BOUNDS.maxOfFormulaHi, AI_BOUNDS.maxHiFloor);
  if (hi < formula.hiHours * AI_BOUNDS.minOfFormulaHi || hi > maxHi) return null;
  const [dMin, dMax] = AI_BOUNDS.difficulty;
  if (!Number.isInteger(difficulty) || difficulty < dMin || difficulty > dMax) return null;
  if (typeof reason !== 'string') return null;
  const line = reason.replace(/\s+/g, ' ').trim().slice(0, MAX_REASON_CHARS);
  if (!line) return null;
  return { loHours: lo, hiHours: hi, reason: line, difficulty };
}

// The answer text -> Map(id -> checked range) for the files that passed. A broken answer gives an empty map.
export function parseAnswer(text, formulas) {
  const ranges = new Map();
  const data = readJson(text);
  if (!data || !Array.isArray(data.files)) return ranges;
  for (const item of data.files) {
    const id = item?.id;
    if (!formulas.has(id) || ranges.has(id)) continue;
    const range = checkRange(item, formulas.get(id));
    if (range) ranges.set(id, range);
  }
  return ranges;
}

// One AI call for the files of one course. Returns Map(file key -> estimate), one for every file:
//   from the AI:      { loHours, hiHours, reason, source: 'ai', aiReason, difficulty }
//   from the formula: { loHours, hiHours, reason, source: 'formula' }
// `reason` is always the formula's counted reason (pages, density …), the tooltip's first lines.
// `ask` is lib/ai.js's askAI; tests pass their own.
export async function estimateCourse({ name, level, files }, ask = askAI) {
  const formulas = files.map((f) => estimateChapter(f.metrics, level));
  const result = new Map(files.map((f, i) => [f.key, { ...formulas[i], source: 'formula' }]));
  if (!files.length) return result;

  const prompt = buildPrompt({ name, level, files });
  if (!prompt) return result;

  let text;
  try {
    text = await ask(prompt);
  } catch {
    return result; // failed, timed out or no key: the formula for every file, no message
  }

  const ranges = parseAnswer(text, new Map(formulas.map((f, i) => [`f${i + 1}`, f])));
  files.forEach((f, i) => {
    const range = ranges.get(`f${i + 1}`);
    if (range)
      result.set(f.key, {
        loHours: range.loHours,
        hiHours: range.hiHours,
        reason: formulas[i].reason,
        source: 'ai',
        aiReason: range.reason,
        difficulty: range.difficulty,
      });
  });
  return result;
}
