// Screen 2: course entry (HANDOFF.md §2). One course at a time: name, chapter files, optional exercise
// files, level, exam date, «احفظ المادة».
// Files: a quick check (real PDF header, size) runs as soon as a file is picked, so «مو PDF» and «أكبر من
// ٤٠ ميقا» show at once. The full reading (pages, text, scans, locked files) runs on «احفظ المادة», behind the
// loading overlay. Files stay in this screen only; just the counted numbers are saved (lib/storage.js).
import { useRef, useState } from 'react';
import Button from '../../components/Button.jsx';
import { Card } from '../../components/Cards.jsx';
import { Input, Select } from '../../components/Field.jsx';
import LoadingOverlay from '../../components/LoadingOverlay.jsx';
import Pills from '../../components/Pills.jsx';
import { FileChip, UploadZone } from '../../components/Upload.jsx';
import { fmtNumber } from '../../lib/format.js';
import { dateOptions, localToday } from '../../lib/options.js';
import { checkFile, readChapter } from '../../lib/pdf.js';
import { APP_NAME, COMMON, COURSE_FORM as T, COURSE_LIMIT, FILE_ERROR, LEVEL_LABEL, loadingText } from '../../lib/strings.js';
import { go, ROUTES } from '../../routes.js';
import { useApp } from '../../state.jsx';
import { canAddCourse, draftProblems, hasProblems, makeCourse, newCourseId } from './courses.js';
import './course-entry.css';

const KINDS = ['lecture', 'exercises'];
const LEVELS = Object.entries(LEVEL_LABEL).map(([value, label]) => ({ value, label }));
const MIN_LOADING_MS = 700; // so the loading text can be read even when the files are small
const DONE_MS = 700; // how long «انحفظت المادة» shows before the course list opens
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// The field ids, in screen order: the first one with a problem gets the focus after «احفظ المادة».
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

let nextKey = 1; // a stable key for each picked file in this screen

// A picked file: { key, file, error?, read? }. `read` is what readChapter returned (cached, never read twice).
async function toEntry(file) {
  return { key: nextKey++, file, error: (await checkFile(file)) ?? undefined };
}

export default function CourseEntryScreen() {
  const { state, dispatch } = useApp();
  const today = localToday();
  const [name, setName] = useState('');
  const [files, setFiles] = useState({ lecture: [], exercises: [] });
  const [level, setLevel] = useState(null);
  const [examDate, setExamDate] = useState('');
  const [submitted, setSubmitted] = useState(false); // field errors show after the first «احفظ المادة»
  const [loading, setLoading] = useState(null); // { done, total } while reading
  const [saved, setSaved] = useState(false);
  const reupload = useRef({ input: null, kind: null, key: null });

  const backTo = state.courses.length ? ROUTES.courses : ROUTES.home;
  const problems = draftProblems({ name, files, level, examDate }, today);
  const show = (field) => (submitted ? problems[field] : undefined);
  const zoneError = (kind) => {
    const p = show(kind);
    if (p === 'bad_file') return T.errors.badFile;
    if (p === 'none') return T.errors.noChapters;
    return undefined;
  };

  // HANDOFF.md §7 rule 4: at 6 courses this screen only explains the limit.
  if (!canAddCourse(state.courses) && !saved) {
    return (
      <section className="screen course-entry" aria-labelledby="course-title">
        <TopBar />
        <Card>
          <p className="course-entry__limit">{COURSE_LIMIT}</p>
          <Button variant="link" onClick={() => go(backTo)}>
            {COMMON.back}
          </Button>
        </Card>
      </section>
    );
  }

  async function addFiles(kind, picked) {
    const entries = await Promise.all(picked.map(toEntry));
    setFiles((prev) => ({ ...prev, [kind]: [...prev[kind], ...entries] }));
  }

  // Files are found by their key, never by their position: two quick clicks must not hit the wrong file.
  async function replaceFile(kind, key, picked) {
    const entry = await toEntry(picked[0]);
    setFiles((prev) => ({ ...prev, [kind]: prev[kind].map((f) => (f.key === key ? entry : f)) }));
  }

  const removeFile = (kind, key) =>
    setFiles((prev) => ({ ...prev, [kind]: prev[kind].filter((f) => f.key !== key) }));

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

    // Read every file that was not read yet (one at a time keeps memory low).
    const all = KINDS.flatMap((kind) => files[kind].map((entry) => ({ kind, entry })));
    const toRead = all.filter(({ entry }) => !entry.read);
    const started = Date.now();
    setLoading({ done: 0, total: toRead.length });
    const results = new Map();
    for (const [i, { kind, entry }] of toRead.entries()) {
      results.set(entry.key, await readChapter(entry.file, kind));
      setLoading({ done: i + 1, total: toRead.length });
    }
    await wait(Math.max(0, MIN_LOADING_MS - (Date.now() - started)));

    const next = {};
    for (const kind of KINDS) {
      next[kind] = files[kind].map((entry) => {
        const read = results.get(entry.key) ?? entry.read;
        return { ...entry, read, error: read.error };
      });
    }
    setFiles(next);
    setLoading(null);

    // A scanned or locked file turns its chip into an error; nothing is saved until it is fixed.
    if (KINDS.some((kind) => next[kind].some((f) => f.error))) {
      focusField(next.lecture.some((f) => f.error) ? FIELD_ID.lecture : FIELD_ID.exercises);
      return;
    }

    const course = makeCourse({
      id: newCourseId(state.courses),
      name,
      level,
      examDate,
      order: state.courses.length + 1,
      readFiles: { lecture: next.lecture.map((f) => f.read), exercises: next.exercises.map((f) => f.read) },
    });
    dispatch({ type: 'addCourse', course });
    setSaved(true);
    await wait(DONE_MS);
    go(ROUTES.courses);
  }

  return (
    <section className="screen course-entry" aria-labelledby="course-title">
      <TopBar />
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
                files[kind].map((f) => (
                  <FileChip
                    key={f.key}
                    name={f.file.name}
                    error={f.error && FILE_ERROR[f.error]}
                    onRemove={() => removeFile(kind, f.key)}
                    onReupload={() => askReupload(kind, f.key)}
                  />
                ))}
            </UploadZone>
          ))}

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
            <Button variant="link" onClick={() => go(backTo)}>
              {COMMON.back}
            </Button>
            <Button type="submit" status={saved ? 'done' : undefined}>
              {T.save}
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
    </section>
  );
}

function TopBar() {
  return (
    <div className="topbar">
      <h1 id="course-title">{T.title}</h1>
      <span className="topbar__app">{APP_NAME}</span>
    </div>
  );
}
