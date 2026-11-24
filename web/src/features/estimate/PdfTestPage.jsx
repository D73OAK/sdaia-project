// TEMPORARY Day 1 test page (route #/pdf-test). Unstyled on purpose.
// It proves PDF reading + the estimate work with real files. Delete it when screen 2 is built.
import { useState } from 'react';
import { readChapter } from '../../lib/pdf.js';
import { fmtNumber, fmtRange } from '../../lib/format.js';
import {
  DENSITY_LABEL,
  FILE_ERROR,
  HOURS_UNIT,
  LEVEL_LABEL,
  PDF_TEST as T,
  UPLOAD_ZONE,
  fileLabel,
  loadingText,
} from '../../lib/strings.js';
import { courseTotal, estimateChapter } from './estimate.js';

const KINDS = ['lecture', 'exercises']; // the zone order on screen, and the schedule order

export default function PdfTestPage() {
  const [level, setLevel] = useState('mid');
  // What readChapter returned, per upload zone, in upload order.
  const [files, setFiles] = useState({ lecture: [], exercises: [] });
  const [reading, setReading] = useState(0); // how many files are being read right now

  async function onFiles(kind, event) {
    const picked = [...event.target.files];
    event.target.value = ''; // lets the same file be picked again
    if (!picked.length) return;
    setReading(picked.length);
    const read = [];
    for (const file of picked) read.push(await readChapter(file, kind)); // one at a time keeps memory low
    setFiles((prev) => ({ ...prev, [kind]: [...prev[kind], ...read] }));
    setReading(0);
  }

  // Chapters first, then exercise files, each numbered on its own («شابتر ٢», «تمارين ١»).
  // The estimate is recalculated from the saved numbers when the level changes; files are not re-read.
  const rows = KINDS.flatMap((kind) =>
    files[kind].map((ch, i) => ({
      ...ch,
      index: i + 1,
      estimate: ch.metrics ? estimateChapter(ch.metrics, level) : null,
    })),
  );
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

      {KINDS.map((kind) => (
        <p key={kind}>
          <label>
            {UPLOAD_ZONE[kind].label} {UPLOAD_ZONE[kind].hint}{' '}
            <input
              type="file"
              multiple
              data-kind={kind}
              onChange={(e) => onFiles(kind, e)}
              disabled={reading > 0}
            />
          </label>
        </p>
      ))}
      {rows.length > 0 && (
        <p>
          <button type="button" onClick={() => setFiles({ lecture: [], exercises: [] })}>
            {T.clear}
          </button>
        </p>
      )}

      {reading > 0 && <p role="status">{loadingText(reading, fmtNumber(reading))}</p>}

      {rows.length === 0 && reading === 0 && <p>{T.empty}</p>}

      {rows.length > 0 && (
        <>
          <table border="1" cellPadding="6" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>{T.file}</th>
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
                <tr key={`${ch.kind}-${ch.index}`}>
                  <td>{fileLabel(ch.kind, fmtNumber(ch.index))}</td>
                  <td>
                    <bdi>{ch.fileName}</bdi>
                  </td>
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
