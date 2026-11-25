import { describe, expect, it } from 'vitest';
import mock from '../../data/mock.json';
import { reducer } from '../../state.jsx';
import { emptyData } from '../../lib/storage.js';
import { MAX_COURSES, canAddCourse, draftProblems, hasProblems, makeCourse, newCourseId } from './courses.js';

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
  const read = (ch) => ({ fileName: ch.fileName, fileSizeBytes: ch.fileSizeBytes, kind: ch.kind, metrics: ch.metrics });
  const course = makeCourse({
    id: 'c1',
    name: '  الرياضيات ١ ',
    level: 'weak',
    examDate: '2026-11-30',
    order: 1,
    readFiles: {
      lecture: fromMock.chapters.filter((c) => c.kind === 'lecture').map(read),
      exercises: fromMock.chapters.filter((c) => c.kind === 'exercises').map(read),
    },
  });

  it('numbers chapters and exercise files separately and estimates each one', () => {
    expect(course.chapters.map((c) => `${c.kind} ${c.index}`)).toEqual([
      'lecture 1',
      'lecture 2',
      'lecture 3',
      'exercises 1',
    ]);
    expect(course.chapters.map((c) => c.estimate)).toEqual(fromMock.chapters.map((c) => c.estimate));
  });

  it('trims the name and picks the colour from the order', () => {
    expect(course).toMatchObject({ id: 'c1', name: 'الرياضيات ١', color: '--c1', order: 1 });
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
