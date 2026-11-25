// TEMPORARY components page (route #/components): every reusable component in every state, so they can
// be checked against DESIGN.md before the screens use them. Deleted when the screens are done.
import { useState } from 'react';
import Button, { CloseButton } from '../components/Button.jsx';
import { Input, Select } from '../components/Field.jsx';
import Pills from '../components/Pills.jsx';
import { FileChip, UploadZone } from '../components/Upload.jsx';
import { Badge, Card, CourseCard, SuccessBanner, WarningBanner } from '../components/Cards.jsx';
import Modal from '../components/Modal.jsx';
import { BreakCell, ExamCell, Session } from '../components/Session.jsx';
import { fmtNumber, fmtRange } from '../lib/format.js';
import { dateOptions, localToday, timeOptions } from '../lib/options.js';
import {
  BADGE,
  BANNER,
  COMPONENTS_PAGE as T,
  FILE_ERROR,
  LEVEL_LABEL,
  RESTART,
} from '../lib/strings.js';
import './dev.css';

const LEVELS = Object.entries(LEVEL_LABEL).map(([value, label]) => ({ value, label }));
const part = (courseName, colorIndex, kind, index, hours) => ({ courseName, colorIndex, kind, index, hours });

function Section({ title, children }) {
  return (
    <section className="dev-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Labeled({ label, children }) {
  return (
    <figure className="dev-item">
      {children}
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export default function ComponentsPage() {
  const [name, setName] = useState('مبادئ الإحصاء والاحتمالات');
  const [hours, setHours] = useState('٤');
  const [level, setLevel] = useState('mid');
  const [modal, setModal] = useState(false);
  const today = localToday();
  const S = T.states;

  return (
    <section className="screen dev">
      <div className="topbar">
        <h1>{T.title}</h1>
      </div>

      <Section title={T.buttons}>
        <div className="dev-row">
          <Labeled label={S.default}><Button>{T.primary}</Button></Labeled>
          <Labeled label={S.hover}><Button className="is-hover">{T.primary}</Button></Labeled>
          <Labeled label={S.pressed}><Button className="is-pressed">{T.primary}</Button></Labeled>
          <Labeled label={S.loading}><Button status="loading" /></Labeled>
          <Labeled label={S.done}><Button status="done" /></Labeled>
          <Labeled label={S.disabled}><Button disabled>{T.primary}</Button></Labeled>
        </div>
        <div className="dev-row">
          <Labeled label={S.default}><Button variant="secondary">{T.secondary}</Button></Labeled>
          <Labeled label={S.hover}><Button variant="secondary" className="is-hover">{T.secondary}</Button></Labeled>
          <Labeled label={S.pressed}><Button variant="secondary" className="is-pressed">{T.secondary}</Button></Labeled>
          <Labeled label={S.disabled}><Button variant="secondary" disabled>{T.secondary}</Button></Labeled>
          <Labeled label="link"><Button variant="link">{T.link}</Button></Labeled>
          <Labeled label="✕"><CloseButton /></Labeled>
        </div>
      </Section>

      <Section title={T.inputs}>
        <Card>
          <Input id="dev-name" label={T.nameLabel} value={name} onChange={setName} placeholder={T.namePlaceholder} />
          <Input id="dev-name-focus" label={`${T.nameLabel} (${T.focus})`} className="is-focus" value="" placeholder={T.namePlaceholder} onChange={() => {}} />
          <Input id="dev-name-error" label={T.nameLabel} value="" placeholder={T.namePlaceholder} error={T.nameError} onChange={() => {}} />
          <Input id="dev-hours" label={T.hoursLabel} numeric value={hours} onChange={setHours} />
          <Select id="dev-date" label={T.dateLabel} placeholder={T.datePlaceholder} options={dateOptions(today)} value="" onChange={() => {}} />
          <Select id="dev-date-error" label={T.dateLabel} placeholder={T.datePlaceholder} options={dateOptions(today)} value="" error={T.dateError} onChange={() => {}} />
          <Select id="dev-time" label={T.timeLabel} options={timeOptions()} value="16:00" onChange={() => {}} />
          <Pills id="dev-level" label={T.levelLabel} options={LEVELS} value={level} onChange={setLevel} />
          <Pills id="dev-level-none" label={T.levelLabel} options={LEVELS} value={null} onChange={() => {}} />
        </Card>
      </Section>

      <Section title={T.upload}>
        <Card>
          <UploadZone id="dev-lecture" kind="lecture">
            <FileChip name="chapter1.pdf" />
            <FileChip name="CH2- Data Representation-Final V.pdf" />
            <FileChip name="notes.docx" error={FILE_ERROR.not_pdf} />
          </UploadZone>
          <UploadZone id="dev-exercises" kind="exercises" error={T.fileError}>
            <FileChip name="huge-41mb.pdf" error={FILE_ERROR.too_big} />
          </UploadZone>
        </Card>
      </Section>

      <Section title={T.cards}>
        <CourseCard name="الرياضيات ١" colorIndex={1} hoursText={BADGE.hours(fmtRange(19.5, 27.5), 27.5)} isNew />
        <CourseCard name="مبادئ الإحصاء والاحتمالات" colorIndex={2} hoursText={BADGE.hours(fmtRange(5, 7), 7)} />
        <CourseCard name="Data Structures" colorIndex={3} hoursText={BADGE.hours(fmtRange(6, 8.5), 8.5)} />
        <CourseCard name="الفيزياء العامة" colorIndex={4} hoursText={BADGE.hours(fmtRange(6, 8), 8)} />
        <CourseCard name="مقدمة في البرمجة" colorIndex={5} hoursText={BADGE.hours(fmtRange(2, 3), 3)} />
        <CourseCard name="English 101" colorIndex={6} hoursText={BADGE.hours(fmtRange(1.5, 2), 2)} />
      </Section>

      <Section title={T.badges}>
        <div className="dev-row">
          <Badge tone="hours">{BADGE.hours(fmtRange(17, 23), 23)}</Badge>
          <Badge tone="exam" icon="exam">{BADGE.exam}</Badge>
          <Badge tone="success" icon="check">{BADGE.added}</Badge>
          <Badge tone="missing">{BADGE.missing(fmtNumber(3))}</Badge>
        </div>
      </Section>

      <Section title={T.banners}>
        <div className="dev-stack">
          <WarningBanner
            title={BANNER.warningTitle}
            body={BANNER.warningBody(fmtNumber(47.5), fmtNumber(43.5), fmtNumber(4))}
            onChangeHours={() => {}}
          />
          <SuccessBanner>{BANNER.success}</SuccessBanner>
        </div>
      </Section>

      <Section title={T.modal}>
        <Button variant="secondary" onClick={() => setModal(true)}>{T.openModal}</Button>
        <Modal
          open={modal}
          title={RESTART.title}
          onClose={() => setModal(false)}
          actions={
            <>
              <Button variant="secondary" onClick={() => setModal(false)}>{RESTART.no}</Button>
              <Button onClick={() => setModal(false)}>{RESTART.yes}</Button>
            </>
          }
        >
          <p>{RESTART.text}</p>
        </Modal>
      </Section>

      <Section title={T.sessions}>
        <div className="dev-grid">
          <Labeled label={T.sessionStates.normal}>
            <Session parts={[part('الرياضيات ١', 1, 'lecture', 2, 1.33)]} />
          </Labeled>
          <Labeled label={T.sessionStates.parts}>
            <Session parts={[part('الرياضيات ١', 1, 'lecture', 1, 1), part('الرياضيات ١', 1, 'lecture', 2, 0.33)]} />
          </Labeled>
          <Labeled label={T.sessionStates.threeParts}>
            <Session
              parts={[
                part('مبادئ الإحصاء والاحتمالات', 2, 'lecture', 2, 0.33),
                part('Data Structures', 3, 'lecture', 1, 0.5),
                part('Data Structures', 3, 'exercises', 1, 0.5),
              ]}
            />
          </Labeled>
          <Labeled label={T.sessionStates.tomorrow}>
            <Session tomorrow parts={[part('الرياضيات ١', 1, 'lecture', 1, 1.33)]} />
          </Labeled>
          <Labeled label={T.sessionStates.tomorrowParts}>
            <Session tomorrow parts={[part('الرياضيات ١', 1, 'exercises', 1, 0.83), part('الفيزياء العامة', 4, 'lecture', 1, 0.5)]} />
          </Labeled>
          <Labeled label={T.sessionStates.break}>
            <BreakCell minutes={30} />
          </Labeled>
          <Labeled label={T.sessionStates.exam}>
            <ExamCell courseNames={['الرياضيات ١']} />
          </Labeled>
          <Labeled label={T.sessionStates.picked}>
            <Session picked parts={[part('Data Structures', 3, 'lecture', 2, 1.5)]} />
          </Labeled>
          <Labeled label={T.sessionStates.blocked}>
            <Session blocked parts={[part('الفيزياء العامة', 4, 'lecture', 2, 1.33)]} />
          </Labeled>
        </div>
      </Section>
    </section>
  );
}
