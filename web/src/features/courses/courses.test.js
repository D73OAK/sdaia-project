import { describe, expect, it } from 'vitest';
import mock from '../../data/mock.json';
import { reducer } from '../../state.jsx';
import { emptyData } from '../../lib/storage.js';
import { estimateChapter } from '../estimate/estimate.js';
import {
  MAX_COURSES,
  canAddCourse,
  colorIndexOf,
  draftProblems,
  freeColorIndex,
  hasProblems,
  judgedContext,
  makeCourse,
  needsAI,
  newCourseId,
  nextOrder,
  savedEstimate,
} from './courses.js';

const today = '2026-11-24';
const good = { name: 'الرياضيات ١', files: { lecture: [{}], exercises: [] }, level: 'weak', examDate: '2026-11-30' };

describe('draftProblems (HANDOFF.md §7 rule 3)', () => {
  it('has no problems for a complete course', () => {
    expect(draftProblems(good, today)).toEqual({});
    expect(hasProblems(draftProblems(good, today))).toBe(false);
  });

  it('flags every missing field at once', () => {
    const empty = { name: '   ', files: { lecture: [], exercises: [] }, level: null, examDate: '' };
    expect(draftProblems(empty, today)).toEqual({
      name: 'empty',
      lecture: 'none',
      level: 'missing',
      examDate: 'missing',
    });
  });

  it('flags a bad file in either zone; the exercise zone may stay empty', () => {
    const bad = { ...good, files: { lecture: [{}, { error: 'not_pdf' }], exercises: [{ error: 'too_big' }] } };
    expect(draftProblems(bad, today)).toEqual({ lecture: 'bad_file', exercises: 'bad_file' });
  });

  it('needs an exam date after today', () => {
    expect(draftProblems({ ...good, examDate: today }, today)).toEqual({ examDate: 'missing' });
    expect(draftProblems({ ...good, examDate: '2026-11-25' }, today)).toEqual({});
  });
});

describe('makeCourse', () => {
  const fromMock = mock.courses[0]; // الرياضيات ١: 3 chapters + 1 exercise file, level weak
  const read = (ch) => ({ read: { fileName: ch.fileName, fileSizeBytes: ch.fileSizeBytes, kind: ch.kind, metrics: ch.metrics }, adjusted: null });
  const files = {
    lecture: fromMock.chapters.filter((c) => c.kind === 'lecture').map(read),
    exercises: fromMock.chapters.filter((c) => c.kind === 'exercises').map(read),
  };
  const course = makeCourse({ id: 'c1', name: '  الرياضيات ١ ', level: 'weak', examDate: '2026-11-30', order: 1, color: 1, files });

  it('numbers chapters and exercise files separately and estimates each one', () => {
    expect(course.chapters.map((c) => `${c.kind} ${c.index} ${c.id}`)).toEqual([
      'lecture 1 c1-ch1',
      'lecture 2 c1-ch2',
      'lecture 3 c1-ch3',
      'exercises 1 c1-ex1',
    ]);
    expect(course.chapters.map((c) => c.estimate)).toEqual(
      fromMock.chapters.map((c) => ({ ...c.estimate, source: 'formula' })), // no estimate given: the formula
    );
  });

  it('uses an estimate it is given (the AI) and never copies the text sample', () => {
    const ai = { loHours: 4, hiHours: 6, reason: 'counted', source: 'ai', aiReason: 'صعب' };
    const withSample = { ...read(fromMock.chapters[0]), estimate: ai };
    withSample.read.sample = 'secret chapter text';
    const made = makeCourse({ ...course, color: 1, files: { lecture: [withSample], exercises: [] } });
    expect(made.chapters[0].estimate).toEqual(ai);
    expect(JSON.stringify(made)).not.toContain('secret chapter text');
  });

  it('trims the name and keeps the colour it is given', () => {
    expect(course).toMatchObject({ id: 'c1', name: 'الرياضيات ١', color: '--c1', order: 1 });
  });

  it('editing: saved files keep their ids, new files get unused ids, numbers follow the screen order', () => {
    const [ch1, ch2, ch3] = course.chapters;
    const edited = makeCourse({
      ...course,
      color: 1,
      files: { lecture: [{ saved: ch2 }, { saved: ch3 }, read(fromMock.chapters[0])], exercises: [] },
    });
    expect(edited.chapters.map((c) => `${c.index} ${c.id} ${c.fileName}`)).toEqual([
      '1 c1-ch2 chapter2.pdf',
      '2 c1-ch3 chapter3.pdf',
      '3 c1-ch1 chapter1.pdf', // the new file takes the id no longer used
    ]);
    expect(ch1.id).toBe('c1-ch1');
  });

  it('an adjusted file keeps its hours when the level changes; the others are estimated again', () => {
    const [ch1, ch2] = course.chapters;
    const edited = makeCourse({
      ...course,
      level: 'strong',
      color: 1,
      files: { lecture: [{ saved: ch1, adjusted: { loHours: 6, hiHours: 7 } }, { saved: ch2, adjusted: null }], exercises: [] },
    });
    expect(edited.chapters[0]).toMatchObject({ adjusted: true, estimate: { loHours: 6, hiHours: 7 } });
    expect(edited.chapters[0].estimate.reason).toContain('قوي'); // the reason follows the new level
    expect(edited.chapters[1].adjusted).toBeUndefined();
    expect(edited.chapters[1].estimate).toEqual({ ...estimateChapter(ch2.metrics, 'strong'), source: 'formula' });
  });
});

describe('which files the AI judges (§7 rule 5)', () => {
  const metrics = { pages: 40, density: 'mid', equations: 10, exercises: 2 }; // formula (mid) 2.5–3.5
  const judged = {
    id: 'c1-ch1',
    metrics,
    estimate: { loHours: 3, hiHours: 4, reason: estimateChapter(metrics, 'mid').reason, source: 'ai', aiReason: 'فيه خوارزميات', difficulty: 4 },
  };
  const formulaOnly = { id: 'c1-ch2', metrics, estimate: { ...estimateChapter(metrics, 'mid'), source: 'formula' } };

  it('asks only about new files that are not adjusted by hand', () => {
    expect(needsAI({ read: {}, adjusted: null })).toBe(true);
    expect(needsAI({ saved: judged, adjusted: null })).toBe(false); // even after a level change
    expect(needsAI({ read: {}, adjusted: { loHours: 1, hiHours: 2 } })).toBe(false);
  });

  it('a judged saved file keeps its difficulty; the level changes only the formula part', () => {
    expect(savedEstimate({ saved: judged, adjusted: null }, 'mid', 'mid')).toEqual(judged.estimate);
    // weak: formula lo 3.5 (2.5 × 1.4) × 1.2 = 4.2 -> 4, hi 5.6 -> 5.5
    expect(savedEstimate({ saved: judged, adjusted: null }, 'weak', 'mid')).toEqual({
      ...judged.estimate,
      loHours: 4,
      hiHours: 5.5,
      reason: estimateChapter(metrics, 'weak').reason,
    });
  });

  it('a formula file keeps its estimate at the same level, and is estimated again after a level change', () => {
    expect(savedEstimate({ saved: formulaOnly, adjusted: null }, 'mid', 'mid')).toBe(formulaOnly.estimate);
    expect(savedEstimate({ saved: formulaOnly, adjusted: null }, 'weak', 'mid')).toBeUndefined();
  });

  it('an adjusted or new file has no saved estimate to keep', () => {
    expect(savedEstimate({ saved: judged, adjusted: { loHours: 1, hiHours: 2 } }, 'mid', 'mid')).toBeUndefined();
    expect(savedEstimate({ read: {}, adjusted: null }, 'mid', 'mid')).toBeUndefined();
  });

  it('sends the judged saved files as context, numbered as on screen', () => {
    const items = [
      { item: { saved: formulaOnly }, kind: 'lecture', index: 1 },
      { item: { saved: judged }, kind: 'lecture', index: 2 },
      { item: { read: {} }, kind: 'lecture', index: 3 },
    ];
    expect(judgedContext(items)).toEqual([{ kind: 'lecture', index: 2, difficulty: 4, reason: 'فيه خوارزميات' }]);
  });
});

describe('course colours (§7 rule 18)', () => {
  const c = (id, color, order) => ({ id, color, order, chapters: [] });
  it('reads a token colour, or falls back to the add order', () => {
    expect(colorIndexOf(c('a', '--c4', 1))).toBe(4);
    expect(colorIndexOf(c('a', '#8FA3D6', 2))).toBe(2);
  });
  it('gives a new course the first colour nobody uses', () => {
    expect(freeColorIndex([c('a', '--c1', 1), c('b', '--c3', 3)])).toBe(2);
    expect(freeColorIndex([])).toBe(1);
  });
  it('adds new courses after the last one', () => {
    expect(nextOrder([c('a', '--c1', 1), c('b', '--c3', 3)])).toBe(4);
  });
});

describe('editing and deleting in the app state (§7 rule 18)', () => {
  const plan = { days: [] };
  const a = { id: 'a', order: 1, color: '--c1', chapters: [{ id: 'a-ch1' }, { id: 'a-ch2' }] };
  const b = { id: 'b', order: 2, color: '--c2', chapters: [{ id: 'b-ch1' }] };
  const state = {
    ...emptyData(),
    courses: [a, b],
    plan,
    progress: { studied: { 'a-ch1': 1, 'a-ch2': 2, 'b-ch1': 1 }, finished: ['a-ch2', 'b-ch1'] },
  };

  it('an edit keeps the place, drops the plan and the records of removed files', () => {
    const next = reducer(state, { type: 'updateCourse', course: { ...a, name: 'x', chapters: [{ id: 'a-ch1' }] } });
    expect(next.courses.map((c) => c.id)).toEqual(['a', 'b']);
    expect(next.plan).toBeNull();
    expect(next.progress).toEqual({ studied: { 'a-ch1': 1, 'b-ch1': 1 }, finished: ['b-ch1'] });
  });

  it('a delete drops the course, its records and the plan; the others keep their colours', () => {
    const next = reducer(state, { type: 'deleteCourse', id: 'a' });
    expect(next.courses).toEqual([b]);
    expect(colorIndexOf(next.courses[0])).toBe(2);
    expect(next.plan).toBeNull();
    expect(next.progress).toEqual({ studied: { 'b-ch1': 1 }, finished: ['b-ch1'] });
    expect(freeColorIndex(next.courses)).toBe(1); // the next new course takes the freed colour
  });
});

describe('the 6-course limit', () => {
  const six = Array.from({ length: MAX_COURSES }, (_, i) => ({ id: `c${i}`, chapters: [] }));

  it('canAddCourse stops at 6', () => {
    expect(canAddCourse(six.slice(0, 5))).toBe(true);
    expect(canAddCourse(six)).toBe(false);
  });

  it('the app state refuses a 7th course', () => {
    const state = { ...emptyData(), courses: six };
    expect(reducer(state, { type: 'addCourse', course: { id: 'c7', chapters: [] } })).toBe(state);
  });

  it('adding a course marks it as new and clears the old plan', () => {
    const state = { ...emptyData(), plan: { days: [] } };
    const next = reducer(state, { type: 'addCourse', course: { id: 'cA', chapters: [] } });
    expect(next.courses.map((c) => c.id)).toEqual(['cA']);
    expect(next.lastAddedId).toBe('cA');
    expect(next.plan).toBeNull();
  });
});

describe('newCourseId', () => {
  it('never repeats an id', () => {
    const id = newCourseId([], 1000);
    expect(newCourseId([{ id }], 1000)).not.toBe(id);
  });
});
