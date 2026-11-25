// courses.js: the rules for adding a course (HANDOFF.md §7 rules 1–4). Pure functions, no UI.
import { estimateChapter } from '../estimate/estimate.js';

export const MAX_COURSES = 6; // HANDOFF.md §7 rule 4: a design limit AND a code limit

export const canAddCourse = (courses) => courses.length < MAX_COURSES;

// What is wrong with the course form (HANDOFF.md §7 rule 3). Returns an object with only the problems:
//   name: 'empty'               the name is empty (spaces only counts as empty)
//   lecture: 'none' | 'bad_file'  no chapter file, or a chapter file with an error
//   exercises: 'bad_file'       an exercise file with an error (the exercise zone is optional)
//   level: 'missing'
//   examDate: 'missing'         no date, or a date that is not after today
// draft.files = { lecture: [{ error? }], exercises: [{ error? }] }
export function draftProblems(draft, today) {
  const problems = {};
  if (!draft.name.trim()) problems.name = 'empty';
  if (draft.files.lecture.some((f) => f.error)) problems.lecture = 'bad_file';
  else if (!draft.files.lecture.length) problems.lecture = 'none';
  if (draft.files.exercises.some((f) => f.error)) problems.exercises = 'bad_file';
  if (!draft.level) problems.level = 'missing';
  if (!draft.examDate || draft.examDate <= today) problems.examDate = 'missing';
  return problems;
}

export const hasProblems = (problems) => Object.keys(problems).length > 0;

// Builds the course to save. readFiles = { lecture: [readChapter results], exercises: [...] }, all without
// errors. Chapters and exercise files are numbered separately, in upload order, and each gets its estimate.
// `order` (1–6) fixes the course colour: --c1 … --c6.
export function makeCourse({ id, name, level, examDate, order, readFiles }) {
  const chapters = ['lecture', 'exercises'].flatMap((kind) =>
    readFiles[kind].map((file, i) => ({
      id: `${id}-${kind === 'exercises' ? 'ex' : 'ch'}${i + 1}`,
      fileName: file.fileName,
      fileSizeBytes: file.fileSizeBytes,
      kind,
      index: i + 1,
      metrics: file.metrics,
      estimate: estimateChapter(file.metrics, level),
    })),
  );
  return { id, name: name.trim(), level, examDate, color: `--c${order}`, order, chapters };
}

// A new course id that does not clash with the ones already there.
export function newCourseId(courses, now = Date.now()) {
  let id = `c${now.toString(36)}`;
  while (courses.some((c) => c.id === id)) id += 'x';
  return id;
}
