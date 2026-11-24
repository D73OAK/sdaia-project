import { describe, expect, it } from 'vitest';
import {
  MAX_FILE_BYTES,
  chapterKind,
  checkFile,
  countWords,
  extractPages,
  isEquationLine,
  isExerciseHeading,
  isPdfHeader,
  itemsToLines,
  measurePages,
} from './pdf.js';

const bytes = (text) => new TextEncoder().encode(text);

describe('isPdfHeader', () => {
  it('accepts bytes that start with %PDF-', () => {
    expect(isPdfHeader(bytes('%PDF-1.7\n...'))).toBe(true);
  });
  it('rejects anything else, whatever the file is called', () => {
    expect(isPdfHeader(bytes('PK\u0003\u0004 a docx is a zip'))).toBe(false);
    expect(isPdfHeader(bytes(''))).toBe(false);
  });
});

describe('checkFile', () => {
  it('returns not_pdf for a renamed non-PDF file', async () => {
    const file = new File(['hello'], 'chapter1.pdf');
    expect(await checkFile(file)).toBe('not_pdf');
  });
  it('returns too_big above 40 MB', async () => {
    const file = new File(['%PDF-1.7', new Uint8Array(MAX_FILE_BYTES)], 'big.pdf');
    expect(await checkFile(file)).toBe('too_big');
  });
  it('returns null for a small real PDF header', async () => {
    expect(await checkFile(new File(['%PDF-1.4 body'], 'ok.pdf'))).toBeNull();
  });
});

describe('chapterKind', () => {
  it('marks exercise files by name', () => {
    expect(chapterKind('exercises-sheet.pdf')).toBe('exercises');
    expect(chapterKind('HW3.pdf')).toBe('exercises');
    expect(chapterKind('تمارين الفصل ٢.pdf')).toBe('exercises');
    expect(chapterKind('chapter1.pdf')).toBe('lecture');
  });
});

describe('countWords', () => {
  it('counts Arabic and English words and ignores stray symbols', () => {
    expect(countWords('Data Structures هي بنية البيانات')).toBe(5);
    expect(countWords('x = 5 + 3')).toBe(3);
    expect(countWords('  — • ')).toBe(0);
  });
});

describe('isEquationLine', () => {
  it('finds math symbols and fractions', () => {
    expect(isEquationLine('E = mc^2')).toBe(true);
    expect(isEquationLine('∫ f(x) dx')).toBe(true);
    expect(isEquationLine('x ≤ 10')).toBe(true);
    expect(isEquationLine('نصف الكمية 1/2')).toBe(true);
    expect(isEquationLine('٣ / ٤ من الطلاب')).toBe(true);
    expect(isEquationLine('An ordinary sentence.')).toBe(false);
  });
});

describe('isExerciseHeading', () => {
  it('finds exercise, example and problem headings at the start of a line', () => {
    expect(isExerciseHeading('Exercise 3.2')).toBe(true);
    expect(isExerciseHeading('Example: binary search')).toBe(true);
    expect(isExerciseHeading('PROBLEM 4')).toBe(true);
    expect(isExerciseHeading('تمرين ٣')).toBe(true);
    expect(isExerciseHeading('المثال ٢:')).toBe(true);
    expect(isExerciseHeading('سؤال')).toBe(true);
  });
  it('ignores the words in the middle of a sentence or inside other words', () => {
    expect(isExerciseHeading('This is an example of a stack')).toBe(false);
    expect(isExerciseHeading('Examination rules')).toBe(false);
    expect(isExerciseHeading('مثالية التصميم')).toBe(false);
  });
});

describe('itemsToLines', () => {
  it('splits on end-of-line marks and on height changes', () => {
    const items = [
      { str: 'Chapter', transform: [1, 0, 0, 1, 0, 700] },
      { str: ' 1', transform: [1, 0, 0, 1, 50, 700], hasEOL: true },
      { str: 'First line', transform: [1, 0, 0, 1, 0, 680] },
      { str: 'Second line', transform: [1, 0, 0, 1, 0, 660] },
      { type: 'beginMarkedContent' },
    ];
    expect(itemsToLines(items)).toEqual(['Chapter 1', 'First line', 'Second line']);
  });
});

describe('extractPages', () => {
  // A stand-in for PDF.js with the same shape: getDocument() returns a task with .promise and .destroy().
  function fakePdfjs(pageItems) {
    const calls = { destroyed: false };
    const doc = {
      numPages: pageItems.length,
      getPage: async (n) => ({ getTextContent: async () => ({ items: pageItems[n - 1] }), cleanup() {} }),
    };
    return {
      calls,
      pdfjs: { getDocument: () => ({ promise: Promise.resolve(doc), destroy: async () => (calls.destroyed = true) }) },
    };
  }

  it('returns the lines of every page and frees the document', async () => {
    const { pdfjs, calls } = fakePdfjs([[{ str: 'Page one', hasEOL: true }], [{ str: 'Page two' }]]);
    expect(await extractPages(pdfjs, new Uint8Array())).toEqual([['Page one'], ['Page two']]);
    expect(calls.destroyed).toBe(true);
  });
});

describe('measurePages', () => {
  it('counts pages, words per page, equations and exercises', () => {
    const page = ['Example 1', 'x = 2 + 3', 'Some words here to read'];
    expect(measurePages([page, page])).toEqual({
      pages: 2,
      density: 'low',
      wordsPerPage: 10, // 2 + 3 + 5
      equations: 2,
      exercises: 2,
    });
  });
  it('reports no_text for a scan', () => {
    expect(measurePages([[], [], ['p. 3']])).toEqual({ error: 'no_text' });
  });
});
