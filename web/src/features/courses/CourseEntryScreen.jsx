// Screen 2: course entry (HANDOFF.md §2), for a new course or, with `courseId`, in edit mode.
// One course at a time: name, chapter files, optional exercise files, level, exam date.
// Files are read as soon as they are picked, behind the loading overlay: the quick checks (real PDF header,
// size) first, then the full reading (pages, text, scans, locked files). A healthy file then shows its hours
// range with − and + (§7 rule 19) once a level is chosen. Only the counted numbers are saved, never the PDF.
// Edit mode (§7 rule 18): the saved files show as chips by name; «احذف المادة» asks before deleting.
// On save, ONE AI call estimates the files that need it (§7 rule 5, features/estimate/aiEstimate.js),
// behind the same loading overlay; any failure falls back to the formula with no message.
import { useEffect, useRef, useState } from 'react';
import Button from '../../components/Button.jsx';
import { Card } from '../../components/Cards.jsx';
import { Input, Select } from '../../components/Field.jsx';
import LoadingOverlay from '../../components/LoadingOverlay.jsx';
import Modal from '../../components/Modal.jsx';
import Pills from '../../components/Pills.jsx';
import { FileChip, UploadZone } from '../../components/Upload.jsx';
import { fmtNumber, fmtRange } from '../../lib/format.js';
import { dateOptions, localToday } from '../../lib/options.js';
import { checkFile, readChapter } from '../../lib/pdf.js';
import {
  ADJUST,
  AI_TEXT,
  APP_NAME,
  COMMON,
  COURSE_EDIT,
  COURSE_FORM as T,
  COURSE_LIMIT,
  FILE_ERROR,
  LEVEL_LABEL,
  loadingText,
} from '../../lib/strings.js';
import { go, ROUTES } from '../../routes.js';
import { useApp } from '../../state.jsx';
import { estimateCourse } from '../estimate/aiEstimate.js';
import { STEP_HOURS, estimateChapter, shiftRange } from '../estimate/estimate.js';
import {
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
import './course-entry.css';

const KINDS = ['lecture', 'exercises'];
const LEVELS = Object.entries(LEVEL_LABEL).map(([value, label]) => ({ value, label }));
const MIN_LOADING_MS = 700; // so the loading text can be read even when the files are small
const DONE_MS = 700; // how long «انحفظت المادة» shows before the course list opens
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The field ids, in screen order: the first one with a problem gets the focus after saving.
const FIELD_ID = {
  name: 'course-name',
  lecture: 'zone-lecture',
  exercises: 'zone-exercises',
  level: 'course-level',
  examDate: 'course-date',
};

// Moves the focus to a field. For the level pills that is the pill that can take the focus.
function focusField(id) {
  const el = document.getElementById(id);
  const target = el?.getAttribute('role') === 'radiogroup' ? el.querySelector('[tabindex="0"]') : el;
  target?.focus();
}

let nextKey = 1; // a stable key for each file on this screen

// A file on this screen:
//   { key, name, file?, saved?, read?, error?, adjusted }
//   file     a File picked now (kept in memory only, never saved)
//   saved    the chapter saved before (edit mode)
//   read     what readChapter returned (metrics, and the text sample for the AI: memory only),
//            or the saved chapter's numbers
//   adjusted { loHours, hiHours } after − / +, else null
const fromSaved = (ch) => ({
  key: nextKey++,
  name: ch.fileName,
  saved: ch,
  read: { fileName: ch.fileName, fileSizeBytes: ch.fileSizeBytes, kind: ch.kind, metrics: ch.metrics },
  adjusted: ch.adjusted ? { loHours: ch.estimate.loHours, hiHours: ch.estimate.hiHours } : null,
});
const fromPicked = (file) => ({ key: nextKey++, name: file.name, file, adjusted: null });

export default function CourseEntryScreen({ courseId }) {
  const { state, dispatch } = useApp();
  const today = localToday();
  const editing = courseId ? state.courses.find((c) => c.id === courseId) : null;

  const [name, setName] = useState(editing?.name ?? '');
  const [level, setLevel] = useState(editing?.level ?? null);
  const [examDate, setExamDate] = useState(editing?.examDate ?? '');
  const [files, setFiles] = useState(() => ({
    lecture: editing ? editing.chapters.filter((c) => c.kind !== 'exercises').map(fromSaved) : [],
    exercises: editing ? editing.chapters.filter((c) => c.kind === 'exercises').map(fromSaved) : [],
  }));
  const [submitted, setSubmitted] = useState(false); // field errors show after the first save
  const [loading, setLoading] = useState(null); // { done, total } while reading picked files
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const reupload = useRef({ input: null, kind: null, key: null });
  const saving = useRef(false); // a second click while the AI answers must not save twice

  const backTo = state.courses.length ? ROUTES.courses : ROUTES.home;
  const problems = draftProblems({ name, files, level, examDate }, today);
  const show = (field) => (submitted ? problems[field] : undefined);
  const zoneError = (kind) => {
    const p = show(kind);
    if (p === 'bad_file') return T.errors.badFile;
    if (p === 'none') return T.errors.noChapters;
    return undefined;
  };

  // The hours of a healthy file: its own adjusted range, its saved estimate (edit mode: a judged file at
  // the chosen level), or the formula for the chosen level until the AI judges it on save.
  const rangeOf = (f) => {
    if (f.error || !f.read?.metrics || !level) return null;
    return f.adjusted ?? savedEstimate(f, level, editing?.level) ?? estimateChapter(f.read.metrics, level);
  };
  const healthyFiles = KINDS.flatMap((k) => files[k]).filter((f) => rangeOf(f));
  const healthy = healthyFiles.map(rangeOf);
  // «الرقم مبدئي»: only when saving will ask the AI about at least one file shown.
  const draftTotal = healthyFiles.some(needsAI);
  const total = healthy.reduce((s, r) => ({ lo: s.lo + r.loHours, hi: s.hi + r.hiHours }), { lo: 0, hi: 0 });

  // A course id that no longer exists (deleted elsewhere): back to the list.
  const missing = Boolean(courseId && !editing && !saved);
  useEffect(() => {
    if (missing) go(ROUTES.courses);
  }, [missing]);
  if (missing) return null;

  // HANDOFF.md §7 rule 4: at 6 courses a NEW course is not possible; this screen only explains the limit.
  if (!editing && !canAddCourse(state.courses) && !saved) {
    return (
      <section className="screen course-entry" aria-labelledby="course-title">
        <TopBar title={T.title} />
        <Card>
          <p className="course-entry__limit">{COURSE_LIMIT}</p>
          <Button variant="link" onClick={() => go(backTo)}>
            {COMMON.back}
          </Button>
        </Card>
      </section>
    );
  }

  // Checks and reads the picked files one at a time (the loading overlay shows meanwhile).
  async function readPicked(kind, entries) {
    const started = Date.now();
    setLoading({ done: 0, total: entries.length });
    const results = new Map();
    for (const [i, entry] of entries.entries()) {
      const quick = await checkFile(entry.file);
      if (quick) results.set(entry.key, { error: quick });
      else {
        const read = await readChapter(entry.file, kind);
        results.set(entry.key, read.error ? { error: read.error } : { read });
      }
      setLoading({ done: i + 1, total: entries.length });
    }
    await wait(Math.max(0, MIN_LOADING_MS - (Date.now() - started)));
    setFiles((prev) => ({
      ...prev,
      [kind]: prev[kind].map((f) => (results.has(f.key) ? { ...f, ...results.get(f.key) } : f)),
    }));
    setLoading(null);
  }

  function addFiles(kind, picked) {
    const entries = picked.map(fromPicked);
    setFiles((prev) => ({ ...prev, [kind]: [...prev[kind], ...entries] }));
    readPicked(kind, entries);
  }

  // Files are found by their key, never by their position: two quick clicks must not hit the wrong file.
  function replaceFile(kind, key, picked) {
    const entry = fromPicked(picked[0]);
    setFiles((prev) => ({ ...prev, [kind]: prev[kind].map((f) => (f.key === key ? entry : f)) }));
    readPicked(kind, [entry]);
  }

  const removeFile = (kind, key) =>
    setFiles((prev) => ({ ...prev, [kind]: prev[kind].filter((f) => f.key !== key) }));

  function adjust(kind, key, step) {
    setFiles((prev) => ({
      ...prev,
      [kind]: prev[kind].map((f) => {
        if (f.key !== key) return f;
        const next = shiftRange(rangeOf(f), step);
        return next ? { ...f, adjusted: next } : f;
      }),
    }));
  }

  function askReupload(kind, key) {
    reupload.current.kind = kind;
    reupload.current.key = key;
    reupload.current.input.click();
  }

  async function save() {
    if (loading || saved) return;
    setSubmitted(true);
    if (hasProblems(problems)) {
      const first = Object.keys(FIELD_ID).find((f) => problems[f]);
      focusField(FIELD_ID[first]);
      return;
    }
    if (saving.current) return;
    saving.current = true;
    // One AI call for the new files, numbered as they will be saved, with the saved files it already
    // judged as context. Never throws.
    const numbered = KINDS.flatMap((kind) => files[kind].map((f, i) => ({ item: f, kind, index: i + 1 })));
    const toAsk = numbered
      .filter(({ item }) => needsAI(item))
      .map(({ item, kind, index }) => ({ key: item.key, kind, index, metrics: item.read.metrics, sample: item.read.sample }));
    let fromAI = new Map();
    if (toAsk.length) {
      const started = Date.now();
      setLoading({ done: 0, total: toAsk.length });
      fromAI = await estimateCourse({ name, level, files: toAsk, context: judgedContext(numbered) });
      setLoading({ done: toAsk.length, total: toAsk.length });
      await wait(Math.max(0, MIN_LOADING_MS - (Date.now() - started)));
      setLoading(null);
    }
    const item = (f) => ({
      saved: f.saved,
      read: f.read,
      adjusted: f.adjusted,
      estimate: fromAI.get(f.key) ?? savedEstimate(f, level, editing?.level),
    });
    const course = makeCourse({
      id: editing?.id ?? newCourseId(state.courses),
      name,
      level,
      examDate,
      order: editing?.order ?? nextOrder(state.courses),
      color: editing ? colorIndexOf(editing) : freeColorIndex(state.courses),
      files: {
        lecture: files.lecture.map(item),
        exercises: files.exercises.map(item),
      },
    });
    dispatch(editing ? { type: 'updateCourse', course } : { type: 'addCourse', course });
    setSaved(true);
    await wait(DONE_MS);
    go(ROUTES.courses);
  }

  function deleteCourse() {
    setConfirmDelete(false);
    setSaved(true); // the course is gone: do not bounce back to the list from the check above
    dispatch({ type: 'deleteCourse', id: editing.id });
    go(ROUTES.courses);
  }

  return (
    <section className="screen course-entry" aria-labelledby="course-title">
      <TopBar title={editing ? COURSE_EDIT.title : T.title} />
      <Card>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Input
            id={FIELD_ID.name}
            label={T.nameLabel}
            placeholder={T.namePlaceholder}
            value={name}
            onChange={setName}
            error={show('name') && T.errors.name}
            autoComplete="off"
          />

          {KINDS.map((kind) => (
            <UploadZone
              key={kind}
              id={FIELD_ID[kind]}
              kind={kind}
              error={zoneError(kind)}
              onFiles={(picked) => addFiles(kind, picked)}
            >
              {files[kind].length > 0 &&
                files[kind].map((f) => {
                  const range = rangeOf(f);
                  return (
                    <FileChip
                      key={f.key}
                      name={f.name}
                      error={f.error && FILE_ERROR[f.error]}
                      onRemove={() => removeFile(kind, f.key)}
                      onReupload={() => askReupload(kind, f.key)}
                      estimate={
                        range && {
                          text: ADJUST.range(fmtRange(range.loHours, range.hiHours)),
                          canLess: Boolean(shiftRange(range, -STEP_HOURS)),
                          onLess: () => adjust(kind, f.key, -STEP_HOURS),
                          onMore: () => adjust(kind, f.key, STEP_HOURS),
                        }
                      }
                    />
                  );
                })}
            </UploadZone>
          ))}

          <p className="course-entry__note">{AI_TEXT.privacy}</p>

          {healthy.length > 0 && (
            <div className="course-entry__sum" aria-live="polite">
              <p className="course-entry__total">{ADJUST.total(fmtRange(total.lo, total.hi), total.hi)}</p>
              {draftTotal && <p className="course-entry__note">{AI_TEXT.draft}</p>}
            </div>
          )}

          <Pills
            id={FIELD_ID.level}
            label={T.levelLabel}
            options={LEVELS}
            value={level}
            onChange={setLevel}
            error={show('level') && T.errors.level}
          />

          <Select
            id={FIELD_ID.examDate}
            label={T.dateLabel}
            placeholder={T.datePlaceholder}
            options={dateOptions(today)}
            value={examDate}
            onChange={setExamDate}
            error={show('examDate') && T.errors.date}
            className="course-entry__date"
          />

          <div className="course-entry__actions">
            <div className="course-entry__links">
              <Button variant="link" onClick={() => go(backTo)}>
                {COMMON.back}
              </Button>
              {editing && (
                <Button variant="link" className="course-entry__delete" onClick={() => setConfirmDelete(true)}>
                  {COURSE_EDIT.delete}
                </Button>
              )}
            </div>
            <Button type="submit" status={saved ? 'done' : undefined}>
              {editing ? COURSE_EDIT.save : T.save}
            </Button>
          </div>
        </form>
      </Card>

      {/* «أعد الرفع»: one hidden picker that replaces the file it was opened for. */}
      <input
        ref={(el) => (reupload.current.input = el)}
        type="file"
        accept="application/pdf,.pdf"
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const picked = [...e.target.files];
          e.target.value = '';
          if (picked.length) replaceFile(reupload.current.kind, reupload.current.key, picked);
        }}
      />

      {loading && (
        <LoadingOverlay text={loadingText(loading.total, fmtNumber(loading.total))} done={loading.done} total={loading.total} />
      )}

      {editing && (
        <Modal
          open={confirmDelete}
          title={COURSE_EDIT.deleteTitle}
          onClose={() => setConfirmDelete(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                {COURSE_EDIT.deleteNo}
              </Button>
              <Button onClick={deleteCourse}>{COURSE_EDIT.deleteYes}</Button>
            </>
          }
        >
          <p>
            {COURSE_EDIT.deleteText.before} <bdi>{editing.name}</bdi> {COURSE_EDIT.deleteText.after}
          </p>
        </Modal>
      )}
    </section>
  );
}

function TopBar({ title }) {
  return (
    <div className="topbar">
      <h1 id="course-title">{title}</h1>
      <span className="topbar__app">{APP_NAME}</span>
    </div>
  );
}
