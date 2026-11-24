// pdf.js: reads a chapter PDF on the student's device and counts what the estimate needs.
// The file never leaves the browser. Only the counted numbers are kept, never the PDF or its text.
//
// Most of this file is pure functions on plain text (easy to test). Only readChapter() touches
// a real file, and it loads Mozilla's PDF.js library on demand, the first time a file is read.
import { densityOf } from '../features/estimate/estimate.js';

export const MAX_FILE_BYTES = 40 * 1024 * 1024; // 40 MB (HANDOFF.md §7 rule 2)

// Below this many words per page we treat the PDF as a scan with no real text.
const NO_TEXT_WORDS_PER_PAGE = 3;

// A line counts as an equation if it has one of these symbols or a fraction like 3/4 (AGENT_BRIEF.md).
const MATH_SYMBOLS = /[=∑√∫≤≥^π]/;
const FRACTION = /[0-9٠-٩]\s*\/\s*[0-9٠-٩]/;

// A line counts as an exercise if it starts with one of these headings, e.g. «Example 2:» or «تمرين ٣».
const EXERCISE_HEADING =
  /^(?:exercises?|examples?|problems?|(?:ال)?(?:تمرين|تمارين|مثال|أمثلة|سؤال|أسئلة))(?=$|[\s\d٠-٩:.)\-–])/i;

// A file whose name matches this is an exercise file (HANDOFF.md §7 rule 6).
const EXERCISE_FILE_NAME = /ex|hw|sheet|تمار/i;

// ---------- pure helpers ----------

// True when the bytes look like a PDF: real PDFs start with "%PDF-" (we allow it within the
// first 1024 bytes, like PDF readers do). The file extension alone is not trusted.
export function isPdfHeader(bytes) {
  const head = String.fromCharCode(...bytes.slice(0, 1024));
  return head.includes('%PDF-');
}

export const chapterKind = (fileName) => (EXERCISE_FILE_NAME.test(fileName) ? 'exercises' : 'lecture');

export const countWords = (line) => line.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

export const isEquationLine = (line) => MATH_SYMBOLS.test(line) || FRACTION.test(line);

export const isExerciseHeading = (line) => EXERCISE_HEADING.test(line.trim());

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
// Returns the counted numbers, or { error: 'no_text' } when there is (almost) no text.
// The density thresholds live in estimate.js, next to the other weights.
export function measurePages(pages) {
  const pageCount = pages.length;
  let words = 0;
  let equations = 0;
  let exercises = 0;
  for (const lines of pages) {
    for (const line of lines) {
      words += countWords(line);
      if (isEquationLine(line)) equations += 1;
      if (isExerciseHeading(line)) exercises += 1;
    }
  }
  const wordsPerPage = pageCount ? Math.round(words / pageCount) : 0;
  if (wordsPerPage < NO_TEXT_WORDS_PER_PAGE) return { error: 'no_text' };
  return { pages: pageCount, density: densityOf(wordsPerPage), wordsPerPage, equations, exercises };
}

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

// Reads one chapter file. Always resolves (never throws):
//   { fileName, fileSizeBytes, kind, metrics }  or  { fileName, fileSizeBytes, kind, error }
// error is one of 'not_pdf' | 'too_big' | 'no_text' | 'unreadable' (damaged or password-protected).
export async function readChapter(file) {
  const base = { fileName: file.name, fileSizeBytes: file.size, kind: chapterKind(file.name) };
  const problem = await checkFile(file);
  if (problem) return { ...base, error: problem };
  try {
    const pdfjs = await loadPdfjs();
    const pages = await extractPages(pdfjs, new Uint8Array(await file.arrayBuffer()));
    const measured = measurePages(pages);
    return measured.error ? { ...base, error: measured.error } : { ...base, metrics: measured };
  } catch (err) {
    console.error('Could not read PDF:', file.name, err); // for developers; the user sees the error state
    return { ...base, error: 'unreadable' };
  }
}
