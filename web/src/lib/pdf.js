// pdf.js: reads a chapter PDF on the student's device and counts what the estimate needs.
// The file never leaves the browser. Only the counted numbers are saved, never the PDF or its text.
// A short text sample (SAMPLE_CHARS, spread across the file) stays in memory on screen 2 so the AI can
// judge how hard the content is when the course is saved (features/estimate/aiEstimate.js); it is never saved.
//
// Most of this file is pure functions on plain text (easy to test). Only readChapter() touches
// a real file, and it loads Mozilla's PDF.js library on demand, the first time a file is read.
import { densityOf } from '../features/estimate/estimate.js';

export const MAX_FILE_BYTES = 40 * 1024 * 1024; // 40 MB (HANDOFF.md §7 rule 2)

// Below this many words per page we treat the PDF as a scan with no real text. A single page with fewer
// words than this counts as a page without text (a scanned page, or just a page number).
const NO_TEXT_WORDS_PER_PAGE = 3;

// A line counts as an equation if it has one of these symbols or a fraction like 3/4 (AGENT_BRIEF.md).
const MATH_SYMBOLS = /[=∑√∫≤≥^π]/;
const FRACTION = /[0-9٠-٩]\s*\/\s*[0-9٠-٩]/;

// A line counts as an exercise if it starts with one of these headings, e.g. «Example 2:» or «تمرين ٣».
const EXERCISE_HEADING =
  /^(?:exercises?|examples?|problems?|(?:ال)?(?:تمرين|تمارين|مثال|أمثلة|سؤال|أسئلة))(?=$|[\s\d٠-٩:.)\-–])/i;

// ---------- pure helpers ----------

// True when the bytes look like a PDF: real PDFs start with "%PDF-" (we allow it within the
// first 1024 bytes, like PDF readers do). The file extension alone is not trusted.
export function isPdfHeader(bytes) {
  const head = String.fromCharCode(...bytes.slice(0, 1024));
  return head.includes('%PDF-');
}

export const countWords = (line) => line.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

export const isEquationLine = (line) => MATH_SYMBOLS.test(line) || FRACTION.test(line);

// Arabic text from many PDFs (Chrome, Word …) comes out of pdf.js as presentation forms (ﻣ ﺜ ﺎ ﻝ) in
// visual order, so «مثال ١: …» reads «… :1 لاثم». NFKC turns the shapes back into letters, the Persian
// ی/ک become the Arabic ي/ك, and for a line with Arabic the reversed line is tried too.
const ARABIC = /[؀-ۿ]/;
const normalizeArabic = (text) => text.normalize('NFKC').replace(/ی/g, 'ي').replace(/ک/g, 'ك');
export function isExerciseHeading(line) {
  const t = normalizeArabic(line).trim();
  if (EXERCISE_HEADING.test(t)) return true;
  return ARABIC.test(t) && EXERCISE_HEADING.test([...t].reverse().join('').trim());
}

// Turns PDF.js text items for one page into trimmed text lines.
// A new line starts when PDF.js marks an end of line, or when the text moves to another height.
export function itemsToLines(items) {
  const lines = [];
  let current = '';
  let lastY = null;
  for (const item of items) {
    if (typeof item.str !== 'string') continue; // marked-content items carry no text
    const y = item.transform ? item.transform[5] : null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && current.trim()) {
      lines.push(current);
      current = '';
    }
    current += item.str;
    if (item.hasEOL) {
      lines.push(current);
      current = '';
    }
    lastY = y;
  }
  if (current.trim()) lines.push(current);
  return lines.map((l) => l.trim()).filter(Boolean);
}

// pages: an array with one array of text lines per page.
// Returns the counted numbers, or { error: 'no_text' } when there is (almost) no text: too few words per
// page on average, OR fewer than half of the pages with text (a mostly scanned PDF whose few typed pages
// would otherwise lift the average).
// The density thresholds live in estimate.js, next to the other weights.
export function measurePages(pages) {
  const pageCount = pages.length;
  let words = 0;
  let equations = 0;
  let exercises = 0;
  let pagesWithText = 0;
  for (const lines of pages) {
    let pageWords = 0;
    for (const line of lines) {
      pageWords += countWords(line);
      if (isEquationLine(line)) equations += 1;
      if (isExerciseHeading(line)) exercises += 1;
    }
    words += pageWords;
    if (pageWords >= NO_TEXT_WORDS_PER_PAGE) pagesWithText += 1;
  }
  const wordsPerPage = pageCount ? Math.round(words / pageCount) : 0;
  if (wordsPerPage < NO_TEXT_WORDS_PER_PAGE) return { error: 'no_text' };
  if (pagesWithText * 2 < pageCount) return { error: 'no_text' };
  return { pages: pageCount, density: densityOf(wordsPerPage), wordsPerPage, equations, exercises };
}

// ---------- the text sample for the AI ----------

export const SAMPLE_CHARS = 1500;

// Up to `maxChars` of `text`, spread across it: a piece from the start, the middle and the end,
// joined with « … ». Shorter text comes back whole. Spaces are squeezed so they do not waste the budget.
export function spreadText(text, maxChars) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxChars) return clean;
  const gap = ' … ';
  const part = Math.floor((maxChars - 2 * gap.length) / 3);
  if (part < 1) return '';
  const mid = Math.floor((clean.length - part) / 2);
  return [clean.slice(0, part), clean.slice(mid, mid + part), clean.slice(-part)].join(gap);
}

// The sample of a whole file. NFKC turns Arabic letter shapes back into letters the AI can read.
export const textSample = (pages, maxChars = SAMPLE_CHARS) =>
  spreadText(pages.map((lines) => lines.join(' ')).join(' ').normalize('NFKC'), maxChars);

// Checks a File before reading it. Returns an error code ('not_pdf' | 'too_big') or null.
export async function checkFile(file) {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  if (!isPdfHeader(head)) return 'not_pdf';
  if (file.size > MAX_FILE_BYTES) return 'too_big';
  return null;
}

// ---------- reading a real file ----------

// Extracts the text lines of every page. `pdfjs` is the PDF.js library (passed in so a Node script
// can use its own copy); `data` is the file's bytes.
export async function extractPages(pdfjs, data) {
  const task = pdfjs.getDocument({ data });
  try {
    const doc = await task.promise;
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      pages.push(itemsToLines(content.items));
      page.cleanup();
    }
    return pages;
  } finally {
    await task.destroy(); // frees the worker's copy of the file
  }
}

let pdfjsPromise = null;
function loadPdfjs() {
  // Loaded once, on first use, so the app opens fast. The worker reads the PDF off the main thread.
  pdfjsPromise ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return pdfjsPromise;
}

// Reads one uploaded file. `kind` comes ONLY from the upload zone it was dropped in (HANDOFF.md §7 rule 6):
// 'lecture' for «ملفات الشابترات», 'exercises' for «ملفات التمارين». Both kinds get the same checks.
// Never throws for a bad file; it resolves with the error code instead:
//   { fileName, fileSizeBytes, kind, metrics, sample }  or  { fileName, fileSizeBytes, kind, error }
// error is one of 'not_pdf' | 'too_big' | 'no_text' | 'unreadable' (damaged or password-protected).
export async function readChapter(file, kind) {
  if (kind !== 'lecture' && kind !== 'exercises') throw new Error(`Unknown kind: ${kind}`);
  const base = { fileName: file.name, fileSizeBytes: file.size, kind };
  const problem = await checkFile(file);
  if (problem) return { ...base, error: problem };
  try {
    const pdfjs = await loadPdfjs();
    const pages = await extractPages(pdfjs, new Uint8Array(await file.arrayBuffer()));
    const measured = measurePages(pages);
    return measured.error ? { ...base, error: measured.error } : { ...base, metrics: measured, sample: textSample(pages) };
  } catch (err) {
    console.error('Could not read PDF:', file.name, err); // for developers; the user sees the error state
    return { ...base, error: 'unreadable' };
  }
}
