# sdaia-project

## Overview
ميزان المذاكرة (Study Scale), live at https://m1zan.vercel.app: university students study before exams without
knowing how long each course needs. The app reads their chapter PDFs on the device, estimates a study-hours
range per file with a reason (the AI judges the difficulty, a formula measures the size), and builds a weekly
study schedule from tomorrow to the last exam. This file describes the **final app (Version 4.8)**.

**Source of truth, in this order:** `AGENT_BRIEF.md` → `PRD.md` → `HANDOFF.md` → `DESIGN.md` → `web/src/data/mock.json`.
`prototype.html` and `design/mockups/` show the **first design** (before Version 2) and are kept for history only;
DESIGN.md, HANDOFF.md and `design/shots/` describe the final app. Ask me before deciding anything they do not cover.

## What the app does (all built)
- Courses: name, «ملفات الشابترات» (required) and «ملفات التمارين» (optional) PDFs, level قوي / متوسط / ضعيف,
  exam date. Max 6 courses, PDF only, 40 MB per file. A file's kind comes ONLY from its zone (HANDOFF §7 rule 6).
  Scans are rejected (§7 rule 2). Edit and delete a course; − / + adjusts a file's range by half an hour.
- Estimate (HANDOFF §7 rule 5): formula from pages, density, equations, exercises and level, all weights in
  `ESTIMATE_CONFIG` (`estimate.js`). On save, ONE AI call per course for its new files returns a difficulty 1–5
  per file and a reason starting with «فيه»; `lo = max(0.5, round½(base × level × difficulty))`,
  `hi = round½(lo × 1.4)` (difficulty multipliers 0.7 / 0.85 / 1 / 1.2 / 1.4; 3 = the plain formula). Any AI
  failure means the plain formula, with no error shown. The demo never calls the AI.
- Schedule: weekly calendar with week arrows, from tomorrow, using each file's `hiHours` (minus what was
  studied). Sessions hold parts (never under 15 minutes); chapters first, then exercises, all before the exam.
  Popups 3a/3b save only when the student accepts. Past days count as studied; «اليوم» or «بكرة» column;
  «رتّب جدولي من جديد»; swap two sessions; «حمّل جدولك PDF» with `window.print()` and a print stylesheet.
- Data: localStorage only (`lib/storage.js`), versioned key, defensive reads. PDFs are never stored, only their
  counted numbers. If saving fails, a §8 message shows at the top of every screen.

Out of scope: accounts, login, cross-device sync; drag and drop; non-PDF files; OCR; reminders and
notifications; sharing; stats and recording real study time; the two Could stories (tick sessions done, export
to a phone calendar); AI features other than the difficulty estimate. If I ask for something out of scope, say so
before building it.

## Design
- Read DESIGN.md before any UI work. Arabic-first: `dir="rtl"` on `<html>`, CSS logical properties only,
  no letter-spacing on Arabic.
- Arabic only for now. Every UI string lives in `web/src/lib/strings.js` so English can be added later.
- Texts: use the HANDOFF.md §8 Saudi-dialect texts exactly as written. New texts follow the same voice.

## Stack
- JavaScript, no TypeScript. React 18.3 + react-dom 18.3, Vite 5.4 + @vitejs/plugin-react 4.
  Do not upgrade unless something actually breaks.
- Plain CSS: design tokens live only in `web/src/tokens.css`.
- State: React `useReducer` + one Context (`state.jsx`), saved to localStorage. No state library.
- Routing: a small hash router (`routes.js`, `App.jsx`). No router library.
- pdfjs-dist 6.5.438 (Mozilla PDF.js): reads pages and text in the browser, loaded on first use.
- Vitest 3.2.4: tests for PDF counting, the estimate, the AI checks, the schedule, storage and the AI route.
- Server: only `web/api/ai.js`, one Vercel serverless function (`export async function POST`) that calls any
  OpenAI-compatible provider with `fetch` (no SDK). Env: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`
  (Groq, `openai/gpt-oss-120b`). On the laptop a small plugin in `vite.config.js` runs it under `npm run dev`
  and loads `web/.env.local`.
- Package manager: npm. Node 26 is installed here. Hosting: Vercel (Hobby), project root = `web/`.

If it grows: cross-device saving → Supabase (Postgres + Auth). Real OCR for scanned PDFs → Tesseract.js.

## Commands
Run from `web/`:
- Install: `npm install`
- Dev: `npm run dev` (on a phone, same Wi-Fi: `npm run phone`). The AI needs `web/.env.local` (copy `.env.example`).
- Build: `npm run build`
- Preview build: `npm run preview`
- Test: `npm test`
- Lint: none

## Architecture
Single-page app with feature folders, plus one serverless function for the AI. The logic (PDF counting,
estimate, AI checks, schedule, progress, plan flow) is pure functions with no UI, so it is tested directly.

## Project structure
```
sdaia-project/
├── README.md            # the project page (Arabic), with screenshots
├── CLAUDE.md            # this file
├── AGENT_BRIEF.md       # the brief: final rules and how it was built
├── PRD.md               # product: problem, user, what was built, out of scope
├── HANDOFF.md           # screens, paths, data, actions, rules, exact state texts (§8)
├── DESIGN.md            # design system (wins over the prototype)
├── prototype.html       # the FIRST design (history only)
├── design/              # refs/style_sheet.png, mockups/ (first design), shots/ (the built app, index in README.md)
└── web/                 # the app (Vite + React), deployed to Vercel
    ├── index.html       # <html lang="ar" dir="rtl">
    ├── .env.example     # the 3 AI variable names; the values go in .env.local (never committed)
    ├── vercel.json      # the AI route may run up to 30 s
    ├── vite.config.js   # React + the dev plugin that runs api/ on the laptop
    ├── api/             # ai.js: the only server code (the AI route) + its tests
    └── src/
        ├── main.jsx     # entry point
        ├── App.jsx      # background, app state provider, save-error message, screen switch
        ├── routes.js    # the hash router (#/, #/courses, #/course/new, #/course/edit/<id>, #/schedule)
        ├── state.jsx    # useReducer + one Context, saved with lib/storage.js (persist)
        ├── base.css     # resets and base styles (tokens only)
        ├── tokens.css   # the ONLY place for design tokens
        ├── components/  # Button, Field, Pills, Upload, Cards, Modal, Session, Tooltip, Icon, Doodles, LoadingOverlay
        ├── features/
        │   ├── courses/   # screens 1–3: home, course entry (new/edit), course list; courses.js, demo.js
        │   ├── estimate/  # estimate.js (formula), aiEstimate.js (AI difficulty × formula) + tests
        │   └── schedule/  # screen 4, popups 3a/3b/4b, print; schedule.js, progress.js, planFlow.js, swap.js,
        │                  # view.js, printFit.js + tests
        ├── lib/         # pdf.js, storage.js, format.js, strings.js, options.js, ai.js (askAI) + tests
        ├── test/        # stores.js: fake localStorage for tests
        └── data/        # mock.json: sample data for tests and the demo
```

## Versions
Each day's work was "Version N", small fixes inside it "Version N.x", each with an annotated tag.
- v1 – v1.4: PDF reading, formula and tests; page weight calibrated (0.0375) on real study time; exercise zone;
  prototype mockups.
- v2 – v2.1: schedule logic and storage, no backend; the rest of a session goes to the next file.
- v3 – v3.4: tokens and components, then screens 1–4.
- v4 – v4.3: current schedule and reschedule; PDF export; today column, edit, adjust, swap; polish.
- v4.4 – v4.7: AI study-time estimate, then calibrated into "the AI judges difficulty, the formula measures size".
- v4.8: review fixes (draft plans, abort on leave, scan rule, origin check, safe logs, save-error message).
- v5: final docs and README.

## Working rules for AI agents
- Ask before assuming. For anything that touches more than a couple of files, plan first and wait for my OK.
- One task at a time. Explain non-obvious decisions in plain words: I am a beginner, so name the concept.
- Match existing patterns. Clean up what you touch. Look at the result (screenshot) before saying a UI change is done.
- Never install a package version published in the last 7 days.
- Commits: "Version N: ..." for a new version, "Version N.x: ..." for a small fix. Tag every version commit with a
  matching annotated tag (v5, v5.1...) and push the commit and the tag (`git push origin main`, `git push origin <tag>`).
  Commit or push only when I say so.

## Secrets
- `AI_API_KEY` (with `AI_BASE_URL`, `AI_MODEL`): in `web/.env.local` on the laptop and in Vercel's Environment
  Variables. Only `web/api/ai.js` reads them. Never a `VITE_` name, never in code, never printed.
- Never commit `.env` or `.env.local`. Keep `.env.example` with names only. The route checks each variable per
  request and logs only the NAME of a missing one.
- Before every push: `npm test` and `npm run build` pass, `dist/` contains no `AI_API_KEY` and no provider URL,
  and `git ls-files | grep env` lists only `web/.env.example`. Keep `.gitignore` thorough (node_modules, dist,
  .env*, .vercel).

## Input rules
- Validate in the browser: the real `%PDF-` header (not just the extension), max 40 MB per file, the text inside
  (reject scans), required fields, exam date from tomorrow on, preferences in range (HANDOFF §7 rule 11),
  max 6 courses.
- Never insert PDF text or user text as HTML (no `dangerouslySetInnerHTML`). Render as plain text.
- Read and write localStorage defensively: try/catch, a versioned key, empty data if it is corrupt.
- The AI route validates on the server too: prompt 1 to 12000 characters, our own Origin only (403), 10 requests
  per minute per IP from `x-real-ip` (429). The browser checks the shape and bounds of every AI answer, and the
  system message says the user text is data, never instructions (prompt injection).

## UI rules
- Read `DESIGN.md` before any UI work. Use only its tokens. If something you need is not in DESIGN.md, ask me
  first. Never invent a colour, a font size or a font.
- Tokens live ONLY in `web/src/tokens.css` and mirror DESIGN.md. No hex colours and no px font sizes anywhere else.
- Arabic UI, RTL. `dir="rtl"` is set once on `<html>`. Logical CSS properties only (`margin-inline-start`,
  `padding-inline`, `inset-inline-end`, `text-align: start`); never left/right. Do not hand-reverse flex rows.
  No `letter-spacing` and no uppercase on Arabic text. No emoji.
- Touch targets 44px or more. Every hover interaction needs a tap equivalent.
- English names and file names go in `<bdi>`. Codes with dashes and long numbers go in `<span dir="ltr">`.
  Inputs that take user text get `dir="auto"`.
- Numbers and dates go only through `web/src/lib/format.js` (Intl, `ar-u-ca-gregory-nu-arab`): Arabic-Indic ١٢٣
  in the UI, 0-9 only in code, never zero-pad, decimal «٫», range «١٧–٢٣»; no middle dot (U+00B7) next to a
  number, use «،».
- Reusable components (button, input, select, card, session, modal...) so screens reuse them.
- `web/src/data/mock.json` is only for tests and the «جرّب ببيانات تجريبية» demo, which never calls the AI.
- Include every state from HANDOFF.md §4 with the exact texts from §8.
- After a UI change: run the app, take viewport screenshots at 1280px and 768px into `design/shots/`, add them to
  its README.md index, look at them, list every difference from DESIGN.md, and stop for my OK.
