// courses.js: the rules for adding a course (HANDOFF.md §7 rules 1–4). Pure functions, no UI.
import { aiEstimate } from '../estimate/aiEstimate.js';
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

// ---------- colours (HANDOFF.md §7 rules 4 and 18) ----------
// A course keeps its colour (--c1 … --c6) for good, also after other courses are edited or deleted.
// Older data (and mock.json) may hold a hex colour; then the add order picks the colour.
export function colorIndexOf(course) {
  const m = /^--c([1-6])$/.exec(course.color ?? '');
  return m ? Number(m[1]) : ((course.order - 1) % 6) + 1;
}

// A new course takes the first colour no course is using.
export function freeColorIndex(courses) {
  const used = new Set(courses.map(colorIndexOf));
  for (let i = 1; i <= 6; i++) if (!used.has(i)) return i;
  return 1;
}

// Courses stay in the order they were added: a new one goes after the last.
export const nextOrder = (courses) => courses.reduce((max, c) => Math.max(max, c.order), 0) + 1;

// ---------- which files the AI judges (HANDOFF.md §7 rule 5) ----------
// On save, the AI judges every NEW file that is not adjusted by hand. A saved file keeps its difficulty
// (its text is not kept, so it cannot be judged again), and the level does not change a difficulty, so
// saving a course with no new file makes no AI call at all.
export const needsAI = (item) => !item.adjusted && !item.saved;

// The estimate of a saved, unadjusted file, without asking the AI:
//   judged by the AI (has a difficulty): its hours again from the formula × difficulty, at the chosen level
//   anything else: its saved estimate while the level stays the same; after a level change undefined,
//   so the formula estimates it again
export function savedEstimate(item, level, savedLevel) {
  if (!item.saved || item.adjusted) return undefined;
  const est = item.saved.estimate;
  if (est?.source === 'ai' && est.difficulty !== undefined && est.aiReason)
    return aiEstimate(item.saved.metrics, level, { difficulty: est.difficulty, reason: est.aiReason });
  return level === savedLevel ? est : undefined;
}

// The saved files the AI already judged, sent with new files as context so it can compare them.
// items: [{ item, kind, index }] in screen order.
export const judgedContext = (items) =>
  items
    .filter(({ item }) => item.saved?.estimate?.source === 'ai' && item.saved.estimate.difficulty !== undefined)
    .map(({ item, kind, index }) => ({
      kind,
      index,
      difficulty: item.saved.estimate.difficulty,
      reason: item.saved.estimate.aiReason,
    }));

// ---------- building the course to save ----------
// files = { lecture: [item], exercises: [item] } in screen order, all without errors. An item is a file
// read now ({ read }) or a file saved before ({ saved }: its chapter), plus `adjusted`: { loHours, hiHours }
// when the student moved its range with − / + (HANDOFF.md §7 rule 19), else null, plus `estimate` when it
// is already known (from the AI, or kept from before); without one, the formula estimates it.
// Chapters and exercise files are numbered separately in screen order. A saved file keeps its id, so its
// studied/finished records stay. An adjusted file keeps its hours when the level changes.
// Only the fields below are copied: the text sample of a file never gets into the saved course.
export function makeCourse({ id, name, level, examDate, order, color, files }) {
  const used = new Set(['lecture', 'exercises'].flatMap((k) => files[k].map((f) => f.saved?.id).filter(Boolean)));
  const chapters = ['lecture', 'exercises'].flatMap((kind) =>
    files[kind].map((item, i) => {
      const source = item.saved ?? item.read;
      const base = item.estimate ?? { ...estimateChapter(source.metrics, level), source: 'formula' };
      const chapter = {
        id: item.saved?.id ?? newChapterId(id, kind, used),
        fileName: source.fileName,
        fileSizeBytes: source.fileSizeBytes,
        kind,
        index: i + 1,
        metrics: source.metrics,
        estimate: item.adjusted ? { ...base, loHours: item.adjusted.loHours, hiHours: item.adjusted.hiHours } : base,
      };
      if (item.adjusted) chapter.adjusted = true;
      return chapter;
    }),
  );
  return { id, name: name.trim(), level, examDate, color: `--c${color}`, order, chapters };
}

// A chapter id that is not used yet in this course: c1-ch4, c1-ex2 …
function newChapterId(courseId, kind, used) {
  const prefix = `${courseId}-${kind === 'exercises' ? 'ex' : 'ch'}`;
  let n = 1;
  while (used.has(prefix + n)) n += 1;
  const id = prefix + n;
  used.add(id);
  return id;
}

// A new course id that does not clash with the ones already there.
export function newCourseId(courses, now = Date.now()) {
  let id = `c${now.toString(36)}`;
  while (courses.some((c) => c.id === id)) id += 'x';
  return id;
}
