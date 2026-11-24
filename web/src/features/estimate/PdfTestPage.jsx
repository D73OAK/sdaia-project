// TEMPORARY Day 1 test page (route #/pdf-test). Unstyled on purpose.
// It proves PDF reading + the estimate work with real files. Delete it when screen 2 is built.
import { useState } from 'react';
import { readChapter } from '../../lib/pdf.js';
import { fmtNumber, fmtRange } from '../../lib/format.js';
import { DENSITY_LABEL, FILE_ERROR, HOURS_UNIT, LEVEL_LABEL, PDF_TEST as T, loadingText } from '../../lib/strings.js';
import { courseTotal, estimateChapter } from './estimate.js';

export default function PdfTestPage() {
  const [level, setLevel] = useState('mid');
  const [chapters, setChapters] = useState([]); // what readChapter returned, in upload order
  const [reading, setReading] = useState(0); // how many files are being read right now

  async function onFiles(event) {
    const files = [...event.target.files];
    event.target.value = ''; // lets the same file be picked again
    if (!files.length) return;
    setReading(files.length);
    const read = [];
    for (const file of files) read.push(await readChapter(file)); // one at a time keeps memory low
    setChapters((prev) => [...prev, ...read]);
    setReading(0);
  }

  // The estimate is recalculated from the saved numbers when the level changes; files are not re-read.
  const rows = chapters.map((ch, i) => ({
    ...ch,
    index: i + 1,
    estimate: ch.metrics ? estimateChapter(ch.metrics, level) : null,
  }));
  const total = courseTotal(rows);

  return (
    <section>
      <h1>{T.title}</h1>

      <fieldset>
        <legend>{T.level}</legend>
        {Object.entries(LEVEL_LABEL).map(([value, label]) => (
          <label key={value} style={{ marginInlineEnd: 'var(--space-4)' }}>
            <input
              type="radio"
              name="level"
              value={value}
              checked={level === value}
              onChange={() => setLevel(value)}
            />{' '}
            {label}
          </label>
        ))}
      </fieldset>

      <p>
        <label>
          {T.files} <input type="file" multiple onChange={onFiles} disabled={reading > 0} />
        </label>{' '}
        {chapters.length > 0 && (
          <button type="button" onClick={() => setChapters([])}>
            {T.clear}
          </button>
        )}
      </p>

      {reading > 0 && <p role="status">{loadingText(reading, fmtNumber(reading))}</p>}

      {rows.length === 0 && reading === 0 && <p>{T.empty}</p>}

      {rows.length > 0 && (
        <>
          <table border="1" cellPadding="6" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>#</th>
                <th>{T.file}</th>
                <th>{T.kind}</th>
                <th>{T.pages}</th>
                <th>{T.words}</th>
                <th>{T.density}</th>
                <th>{T.equations}</th>
                <th>{T.exercises}</th>
                <th>{T.range}</th>
                <th>{T.reason}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((ch) => (
                <tr key={ch.index}>
                  <td>{fmtNumber(ch.index)}</td>
                  <td>
                    <bdi>{ch.fileName}</bdi>
                  </td>
                  <td>{T.kindLabel[ch.kind]}</td>
                  {ch.error ? (
                    <td colSpan={7} role="alert">
                      {FILE_ERROR[ch.error]}
                    </td>
                  ) : (
                    <>
                      <td>{fmtNumber(ch.metrics.pages)}</td>
                      <td>{fmtNumber(ch.metrics.wordsPerPage)}</td>
                      <td>{DENSITY_LABEL[ch.metrics.density]}</td>
                      <td>{fmtNumber(ch.metrics.equations)}</td>
                      <td>{fmtNumber(ch.metrics.exercises)}</td>
                      <td>{fmtRange(ch.estimate.loHours, ch.estimate.hiHours)}</td>
                      <td>{ch.estimate.reason}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <strong>
              {T.total} {fmtRange(total.loHours, total.hiHours)} {HOURS_UNIT(total.hiHours)}
            </strong>
          </p>
        </>
      )}
    </section>
  );
}
