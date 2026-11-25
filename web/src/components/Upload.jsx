// Upload zone and file chips (DESIGN.md §6). The course entry screen has two zones with the same look:
// «ملفات الشابترات» (required) and «ملفات التمارين» (optional). A file's kind comes only from its zone.
import { useRef } from 'react';
import Icon from './Icon.jsx';
import { CloseButton } from './Button.jsx';
import { ErrorMessage } from './Field.jsx';
import { ADJUST, COMMON, DROP_ZONE, FILE_CHIP, UPLOAD_ZONE } from '../lib/strings.js';

// kind: 'lecture' | 'exercises'. onFiles(File[]) gets the picked files. children = the file chips.
export function UploadZone({ id, kind, onFiles, error, children }) {
  const input = useRef(null);
  const errorId = error ? `${id}-error` : undefined;
  const zone = UPLOAD_ZONE[kind];
  return (
    <div className="field">
      <span className="field__label" id={`${id}-label`}>
        {zone.label} {zone.hint && <span className="field__hint">{zone.hint}</span>}
      </span>
      <div className="field__control">
        <label className="drop" htmlFor={id}>
          <Icon name="upload" size={20} />
          {DROP_ZONE[kind]}
        </label>
        <input
          ref={input}
          id={id}
          className="visually-hidden"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          aria-labelledby={`${id}-label`}
          aria-describedby={errorId}
          onChange={(e) => {
            const files = [...e.target.files];
            e.target.value = ''; // lets the same file be picked again
            if (files.length) onFiles?.(files);
          }}
        />
        {children && <div className="chips">{children}</div>}
        <ErrorMessage id={errorId}>{error}</ErrorMessage>
      </div>
    </div>
  );
}

// One uploaded file. With `error` it becomes the error chip with «أعد الرفع» and «احذفه وكمّل».
// The file name is English or mixed, so it sits in <bdi> and never flips the sentence around it.
// `estimate` (HANDOFF.md §7 rule 19): { text: «٢٫٥–٣٫٥ س», onLess, onMore, canLess } shows the file's range
// with − and + (44px each). Without it (no level chosen yet, or still reading) the chip shows only the name.
export function FileChip({ name, error, onRemove, onReupload, estimate }) {
  if (error) {
    return (
      <div className="chip chip--error">
        <p className="chip__text">
          <Icon name="warn" size={16} />
          <span>
            <bdi>{name}</bdi>: {error}
          </span>
        </p>
        <div className="chip__actions">
          <button type="button" className="chip__action" onClick={onReupload}>
            {FILE_CHIP.reupload}
          </button>
          <button type="button" className="chip__action" onClick={onRemove}>
            {FILE_CHIP.remove}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="chip">
      <bdi className="chip__name">{name}</bdi>
      {estimate && (
        <span className="chip__estimate">
          <button type="button" className="chip__step" aria-label={ADJUST.less(name)} disabled={!estimate.canLess} onClick={estimate.onLess}>
            <Icon name="minus" size={16} />
          </button>
          <span className="chip__range" aria-live="polite">
            {estimate.text}
          </span>
          <button type="button" className="chip__step" aria-label={ADJUST.more(name)} onClick={estimate.onMore}>
            <Icon name="plus" size={16} />
          </button>
        </span>
      )}
      <CloseButton className="chip__remove" label={`${COMMON.removeFile} ${name}`} onClick={onRemove} />
    </div>
  );
}
