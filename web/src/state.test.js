import { describe, expect, it } from 'vitest';
import mock from './data/mock.json';
import { emptyData } from './lib/storage.js';
import { persist } from './state.jsx';
import { brokenStore, fakeStore } from './test/stores.js';

const withCourses = { ...emptyData(), courses: mock.courses };

describe('persist: tells the app when saving in the browser failed (HANDOFF.md §8)', () => {
  it('returns true when the data is saved', () => {
    const store = fakeStore();
    expect(persist(withCourses, store)).toBe(true);
    expect(store.map.size).toBe(1);
  });

  it('returns false when the browser refuses to save (full or blocked)', () => {
    expect(persist(withCourses, brokenStore)).toBe(false);
  });

  it('returns false when there is no storage at all', () => {
    expect(persist(withCourses, null)).toBe(false);
  });

  it('an empty app keeps nothing and has nothing to lose', () => {
    expect(persist(emptyData(), brokenStore)).toBe(true);
  });
});
