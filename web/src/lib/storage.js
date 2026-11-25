// storage.js: saves the student's data in the browser (localStorage) so it is there next time.
// What is saved: the courses (name, exam date, level, colour, and per file: name, size, kind, number,
// counted metrics, estimate), the preferences and the plan. What is NEVER saved: the PDF files or any
// text read from them. Only the fields listed below are copied, so nothing else can slip in.
//
// Every read and write is wrapped in try/catch: localStorage can be full, blocked (private mode,
// browser settings) or hold broken data. When anything is wrong we start empty instead of crashing.

// One key with the version in it. If the saved shape ever changes, bump the version: old data is then
// ignored (the student starts empty) instead of being read wrongly.
export const STORAGE_VERSION = 1;
export const STORAGE_KEY = `mizan-study-scale:v${STORAGE_VERSION}`;

// progress (HANDOFF.md §5): hours already studied per file and the files ticked as finished.
export const emptyProgress = () => ({ studied: {}, finished: [] });
export const emptyData = () => ({ courses: [], preferences: null, plan: null, progress: emptyProgress() });

// The browser's localStorage, or null when there is none or it is blocked (reading it can throw).
function browserStore() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
};

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Keeps only the fields we mean to save (HANDOFF.md §5). Anything else, like a File object or text
// from a PDF, is dropped here.
function cleanChapter(ch) {
  const out = pick(ch, ['id', 'fileName', 'fileSizeBytes', 'kind', 'index', 'error', 'adjusted']);
  if (isObject(ch.metrics)) out.metrics = pick(ch.metrics, ['pages', 'density', 'wordsPerPage', 'equations', 'exercises']);
  if (isObject(ch.estimate)) out.estimate = pick(ch.estimate, ['loHours', 'hiHours', 'reason']);
  return out;
}

function cleanCourse(c) {
  return {
    ...pick(c, ['id', 'name', 'level', 'examDate', 'color', 'order']),
    chapters: Array.isArray(c.chapters) ? c.chapters.map(cleanChapter) : [],
  };
}

// Progress keeps only numbers per file id and a list of file ids. Data saved before Version 4 has none:
// it loads with empty progress (an addition, so the saved data stays valid and the version stays 1).
function cleanProgress(p) {
  if (!isObject(p)) return emptyProgress();
  const studied = {};
  if (isObject(p.studied))
    for (const [id, h] of Object.entries(p.studied)) if (typeof h === 'number' && Number.isFinite(h)) studied[id] = h;
  const finished = Array.isArray(p.finished) ? p.finished.filter((id) => typeof id === 'string') : [];
  return { studied, finished };
}

export function cleanData({ courses, preferences, plan, progress }) {
  return {
    progress: cleanProgress(progress),
    courses: Array.isArray(courses) ? courses.map(cleanCourse) : [],
    preferences: isObject(preferences)
      ? pick(preferences, ['hoursPerDay', 'breaks', 'breakMinutes', 'startTime', 'endTime'])
      : null,
    plan: isObject(plan) ? pick(plan, ['needHours', 'haveHours', 'blocks', 'days', 'leftover']) : null,
  };
}

// A light shape check of what was read back. Broken or unexpected data -> false -> start empty.
function looksValid(saved) {
  return (
    isObject(saved) &&
    saved.version === STORAGE_VERSION &&
    Array.isArray(saved.courses) &&
    saved.courses.every((c) => isObject(c) && typeof c.id === 'string' && Array.isArray(c.chapters)) &&
    (saved.preferences === null || isObject(saved.preferences)) &&
    (saved.plan === null || (isObject(saved.plan) && Array.isArray(saved.plan.days)))
  );
}

// Reads the saved data. Always returns { courses, preferences, plan }; empty when nothing usable is saved.
export function loadData(store = browserStore()) {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const saved = JSON.parse(raw);
    if (!looksValid(saved)) return emptyData();
    return cleanData(saved);
  } catch {
    return emptyData();
  }
}

// Saves the data. Returns true when it worked, false when the browser refused (full or blocked).
export function saveData(data, store = browserStore()) {
  try {
    if (!store) return false;
    store.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, ...cleanData(data) }));
    return true;
  } catch {
    return false;
  }
}

// Deletes everything we saved («ابدأ من جديد»). Returns true when it worked.
export function clearData(store = browserStore()) {
  try {
    if (!store) return false;
    store.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
