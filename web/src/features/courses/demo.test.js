import { describe, expect, it } from 'vitest';
import mock from '../../data/mock.json';
import { demoCourses } from './demo.js';

describe('demoCourses', () => {
  it('keeps the mock dates when today is the mock today', () => {
    expect(demoCourses(mock.today).map((c) => c.examDate)).toEqual(mock.courses.map((c) => c.examDate));
  });

  it('moves every exam by the same number of days as today moved', () => {
    // mock.today is 2026-11-24 and the first exam is 6 days later.
    const courses = demoCourses('2027-02-26');
    expect(courses[0].examDate).toBe('2027-03-04');
    expect(courses.map((c) => c.examDate)).toEqual(['2027-03-04', '2027-03-07', '2027-03-10', '2027-03-12']);
  });

  it('gives copies, so changing the demo never changes mock.json', () => {
    const courses = demoCourses(mock.today);
    courses[0].chapters[0].fileName = 'changed.pdf';
    expect(mock.courses[0].chapters[0].fileName).toBe('chapter1.pdf');
  });
});
