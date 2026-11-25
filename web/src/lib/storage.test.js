import { describe, expect, it } from 'vitest';
import mock from '../data/mock.json';
import { STORAGE_KEY, clearData, emptyData, loadData, saveData } from './storage.js';

// A stand-in for the browser's localStorage (Node has none).
function fakeStore(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}
// A store that refuses everything, like a blocked or full localStorage.
const brokenStore = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
  removeItem() {
    throw new Error('SecurityError');
  },
};

const { _note, ...plan } = mock.plan;
const data = {
  courses: mock.courses,
  preferences: mock.preferences,
  plan,
  progress: { studied: { 'c1-ch1': 4.99 }, finished: ['c2-ch1'] },
};

describe('saveData + loadData', () => {
  it('gives back exactly what was saved', () => {
    const store = fakeStore();
    expect(saveData(data, store)).toBe(true);
    expect(loadData(store)).toEqual(data);
  });

  it('uses one versioned key', () => {
    const store = fakeStore();
    saveData(data, store);
    expect([...store.map.keys()]).toEqual([STORAGE_KEY]);
    expect(STORAGE_KEY).toMatch(/:v1$/);
    expect(JSON.parse(store.map.get(STORAGE_KEY)).version).toBe(1);
  });

  it('never saves a PDF file or its text', () => {
    const store = fakeStore();
    const course = structuredClone(mock.courses[0]);
    course.chapters[0].file = new Blob(['%PDF-1.7 the whole file']);
    course.chapters[0].text = 'all the words read from the PDF';
    course.chapters[0].metrics.pages_text = ['page one text'];
    course.draftFiles = ['something'];
    saveData({ courses: [course], preferences: null, plan: null }, store);
    const raw = store.map.get(STORAGE_KEY);
    expect(raw).not.toContain('PDF-1.7');
    expect(raw).not.toContain('all the words');
    expect(raw).not.toContain('page one text');
    expect(raw).not.toContain('draftFiles');
    expect(loadData(store).courses[0]).toEqual(mock.courses[0]);
  });
});

describe('saved data from before Version 4 (no progress)', () => {
  it('still loads, with empty progress', () => {
    const { progress, ...old } = data;
    const store = fakeStore({ [STORAGE_KEY]: JSON.stringify({ version: 1, ...old }) });
    expect(loadData(store)).toEqual({ ...old, progress: { studied: {}, finished: [] } });
  });
  it('drops anything in progress that is not a number per file or a file id', () => {
    const store = fakeStore();
    saveData({ ...data, progress: { studied: { a: 1, b: 'x' }, finished: ['c', 3], text: 'PDF words' } }, store);
    expect(loadData(store).progress).toEqual({ studied: { a: 1 }, finished: ['c'] });
  });
});

describe('loadData starts empty when the data is not usable', () => {
  const cases = {
    'nothing saved yet': fakeStore(),
    'not JSON': fakeStore({ [STORAGE_KEY]: '{broken' }),
    'an old version': fakeStore({ [STORAGE_KEY]: JSON.stringify({ version: 0, courses: [] }) }),
    'a wrong shape': fakeStore({ [STORAGE_KEY]: JSON.stringify({ version: 1, courses: 'oops' }) }),
    'a course without chapters': fakeStore({
      [STORAGE_KEY]: JSON.stringify({ version: 1, courses: [{ id: 'c1' }], preferences: null, plan: null }),
    }),
    'JSON null': fakeStore({ [STORAGE_KEY]: 'null' }),
    'a blocked localStorage': brokenStore,
    'no localStorage at all': null,
  };
  for (const [name, store] of Object.entries(cases)) {
    it(name, () => {
      expect(loadData(store)).toEqual(emptyData());
    });
  }
});

describe('saveData when the browser refuses', () => {
  it('returns false instead of crashing', () => {
    expect(saveData(data, brokenStore)).toBe(false);
    expect(saveData(data, null)).toBe(false);
  });
});

describe('clearData («ابدأ من جديد»)', () => {
  it('deletes the saved data, so the next load is empty', () => {
    const store = fakeStore({ 'another-app': 'keep me' });
    saveData(data, store);
    expect(clearData(store)).toBe(true);
    expect(loadData(store)).toEqual(emptyData());
    expect(store.map.get('another-app')).toBe('keep me'); // only our key is touched
  });
  it('returns false instead of crashing when the browser refuses', () => {
    expect(clearData(brokenStore)).toBe(false);
  });
});
