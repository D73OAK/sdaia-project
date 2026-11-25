# sdaia-project

## Overview
ميزان المذاكرة (Study Scale): university students study before exams without knowing how long each course needs.
The app reads their chapter PDFs on the device, estimates a study-hours range per chapter with a reason,
and builds a weekly study schedule up to the last exam.

**Source of truth, in this order:** `AGENT_BRIEF.md` → `PRD.md` → `HANDOFF.md` → `DESIGN.md` → `web/src/data/mock.json`.
`prototype.html` is the visual and behaviour reference (its estimate is fake). When the mockup images
differ from DESIGN.md, DESIGN.md and the latest `prototype.html` win. Items marked [?] in HANDOFF.md: ask me.

## MVP scope
Must stories (PRD.md). Demo = the full flow, upload → estimate → schedule:
1. Add courses (name, chapter PDFs, optional exercise PDFs, level قوي / متوسط / ضعيف, exam date) → hour range per course.
2. See the estimate split per chapter, each with its reason.
3. Set daily hours, breaks, break length, start and end time → weekly schedule until the last exam.

v1 decisions (approved 2026-11-24):
- Estimate: 5 factors only (pages, words-per-page density, equations, exercises, level). Formula and weights
  are in HANDOFF.md §7 rule 5, all in ONE config object (`ESTIMATE_CONFIG` in `estimate.js`).
  Levels: weak ×1.4, mid ×1, strong ×0.75. The weights are placeholders, to calibrate later.
- Course entry has two upload zones: «ملفات الشابترات» (required) and «ملفات التمارين» (optional).
  A file's kind comes ONLY from its zone, never from its name (HANDOFF.md §7 rule 6). Exercise files get the
  same checks, messages and formula, are numbered separately («تمارين ١»), and count in the course range.
- Scanned PDFs (no text) are rejected with the HANDOFF.md §8 text. No OCR in v1.
- Uploads: PDF only, max 40 MB per file, no limit on the number of files. Max 6 courses, enforced in code.
- Schedule: a weekly calendar with week arrows, using the **max** (`hiHours`) of each range, from tomorrow
  to the last exam (logic: `build()` in prototype.html). Device clock and timezone.
  Within a course: all chapters first (upload order), then all exercise files, all before its exam.
- No backend and no accounts in this version. "Backend" means the logic and data layer in the browser:
  courses, preferences and the plan are saved in localStorage (`lib/storage.js`). PDFs are never stored,
  only the counted numbers. The student moves the schedule to other devices by downloading it as a PDF.
- «حمّل جدولك PDF» (a Should story): `window.print()` + a print stylesheet, no PDF library (they break
  Arabic). Rules in HANDOFF.md §7 rule 15.
- An exam day still holds sessions of other courses whose exams are later (shown next to the exam card).
- Swap sessions (a Should story): Day 4, after the PDF export, only if everything else works.

Out of scope: accounts, login, cross-device sync; drag and drop; non-PDF files; reminders and notifications;
sharing; progress tracking and stats; OCR; recording actual study time; success measurement; AI features.
If I ask for something out of scope, say so before building it.

## Design
- Read DESIGN.md before any UI work.
- Arabic-first: `dir="rtl"` on `<html>`, CSS logical properties only, no letter-spacing on Arabic.
- Arabic only for now. Every UI string lives in `web/src/lib/strings.js` so English can be added later.
- Texts: use the HANDOFF.md §8 Saudi-dialect texts exactly as written. New texts follow the same voice.

## Stack
- JavaScript, no TypeScript: the starter uses it and it's faster for a beginner.
- React 18.3 + react-dom 18.3, Vite 5.4 + @vitejs/plugin-react 4: kept from the starter.
  Do not upgrade unless something actually breaks.
- Plain CSS: design tokens live only in `web/src/tokens.css`.
- State: React `useReducer` + one Context, saved to localStorage. No state library.
- Routing: the starter's hash switch in `App.jsx`. No router library.
- pdfjs-dist 6.5.438 (Mozilla PDF.js): reads page count and text in the browser, loaded on first use.
- Vitest 3.2.4 (the newest line that supports Vite 5): tests for the PDF counting, estimate and schedule logic.
- Backend: none.
- Package manager: npm. Node 26 is installed here.

If it grows: cross-device saving → Supabase (Postgres + Auth). AI feature → one Vercel serverless
function to hold the key. Real OCR for scanned PDFs → Tesseract.js.

## Commands
Run from `web/`:
- Install: `npm install`
- Dev: `npm run dev` (on a phone, same Wi-Fi: `npm run phone`)
- Build: `npm run build`
- Preview build: `npm run preview`
- Test: `npm test`
- Lint: none yet

## Architecture
Client-only single-page app with feature folders. The logic (PDF counting, estimate, schedule) is pure
functions with no UI, so it can be tested and later moved to a server unchanged.

## Project structure
```
sdaia-project/
├── CLAUDE.md            # this file
├── AGENT_BRIEF.md       # the brief: hard rules, estimate, schedule, 4-day order
├── PRD.md               # product scope
├── HANDOFF.md           # screens, paths, data, actions, rules, exact state texts (§8)
├── DESIGN.md            # design system (wins over the prototype)
├── prototype.html       # visual + behaviour reference
├── design/              # refs/, wireframes.md, mockups/, shots/
├── example/             # camp reference example, read-only
├── plain/               # starter's no-build version, reference only
└── web/                 # the app (Vite + React), deployed to Vercel
    ├── index.html       # <html lang="ar" dir="rtl">
    └── src/
        ├── main.jsx     # entry point
        ├── App.jsx      # background + app state provider + screen switch
        ├── routes.js    # the hash router (#/, #/courses, ...)
        ├── state.jsx    # useReducer + one Context, saved with lib/storage.js
        ├── base.css     # resets and base styles (tokens only)
        ├── tokens.css   # the ONLY place for design tokens
        ├── components/  # Button, Field (Input, Select), Pills, Upload, Cards, Modal, Session, Icon, Doodles
        ├── dev/         # TEMPORARY components page (#/components)
        ├── features/
        │   ├── courses/   # screens 1–3: home, course entry, course list + preferences popup
        │   ├── estimate/  # estimate.js (5 factors → range + reason) + tests
        │   └── schedule/  # screen 4 + schedule.js (week calendar) + tests
        ├── lib/         # pdf.js, storage.js, format.js, strings.js, options.js (shared code)
        └── data/        # mock.json: sample data for tests and the demo
```
The starter's `src/screens/` is replaced by `features/` as each screen is built.

## Build order (AGENT_BRIEF.md)
1) Day 1 (done): PDF reading + estimate per chapter with the reason, tests, and a temporary unstyled test page.
2) Day 2 (done), the "backend day": logic and data only, no UI. schedule.js and storage.js with tests.
3) Day 3: tokens + components, then screens 1–4 one at a time, connected to the real logic and saved data.
4) Day 4: polish, loading state, background animation, 768px tap checks, then «حمّل جدولك PDF»,
   then swap sessions if time allows.

## Deployment
Vercel (Hobby plan), project root = `web/`. No self-managed servers.

## Working rules for AI agents
- Ask before assuming. For anything that touches more than a couple of files, plan first and wait for my OK.
- One task at a time. Explain non-obvious decisions in plain words: I am a beginner, so name the concept.
- Match existing patterns. Clean up what you touch. Look at the result (screenshot) before saying a UI change is done.
- Never install a package version published in the last 7 days.
- Commit names: each day's work is "Version N: ..." where N is the day number (Day 2 = Version 2).
  A small fix inside a version gets a decimal: "Version 1.1: ...", "Version 2.1: ...".
  Tag every version commit with a matching annotated git tag (v1, v1.1, v2...) and push the commit
  and the tag to GitHub (`git push origin main` and `git push origin <tag>`).

## Secrets
- None are needed today. If any appear: environment variables only, never in code.
- Never commit `.env` or `.env.local`. Keep `.env.example` with names only. Validate env at startup.
- Keep `.gitignore` thorough (node_modules, dist, .env*) and check it before every push.

## Input rules
- There is no server, so validate in the browser: check the real `%PDF-` header (not just the extension),
  max 40 MB per file, the text inside (reject scans), required fields, exam date from tomorrow on,
  preferences in range (HANDOFF.md §7 rule 11), max 6 courses.
- Never insert PDF text or user text as HTML (no `dangerouslySetInnerHTML`). Render as plain text.
- Read and write localStorage defensively: wrap it in try/catch, use a versioned key, and fall back to
  empty data if it's corrupt.
- If a server is ever added, validate there too.

## UI rules

- Read `DESIGN.md` before any UI work. Use only its tokens. If something you need is not in
  DESIGN.md, ask me first. Never invent a colour, a font size or a font.
- Tokens live ONLY in `web/src/tokens.css` and mirror DESIGN.md. No hex colours and no px font sizes
  anywhere else. When you fill `tokens.css` from DESIGN.md, delete the `--starter-banner` line.
- Arabic UI, RTL. `dir="rtl"` is set once on `<html>`. Logical CSS properties only
  (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`); never left/right.
  Do not hand-reverse flex rows. No `letter-spacing` and no uppercase on Arabic text. No emoji.
- Touch targets 44px or more. Every hover interaction needs a tap equivalent.
- English names and file names go in `<bdi>`. Codes with dashes and long numbers go in `<span dir="ltr">`.
  Inputs that take user text get `dir="auto"`.
- Numbers and dates go only through `web/src/lib/format.js` (Intl, `ar-u-ca-gregory-nu-arab`):
  Arabic-Indic ١٢٣ in the UI, 0-9 only in code, never zero-pad, decimal «٫», range «١٧–٢٣»;
  no middle dot (U+00B7) next to a number, use «،».
- Reusable components (button, input, select, card, session, modal...) so later screens reuse them.
- `web/src/data/mock.json` is only for tests and the «جرّب ببيانات تجريبية» demo. No backend, no real API calls.
- One screen per task, including its states from HANDOFF.md §4 with the exact texts from §8.
  Do not touch other screens, routing or tokens unless I ask.
- Design files live in `design/`: `refs/`, `wireframes.md`, `mockups/`, `shots/`.
- After each screen: run the app, take viewport screenshots at 1280px and 768px, save them in
  `design/shots/`, compare them with `prototype.html` and `design/mockups/`, list every difference,
  and stop for my OK. `design/mockups/` holds 1280px screenshots of the current `prototype.html`, one per
  screen and state (see its README.md); retake them when `prototype.html` changes. DESIGN.md still wins.
