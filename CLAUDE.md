# sdaia-project

## Overview
Mizan: university students study before exams without knowing how long each course needs.
Mizan reads their chapter PDFs, estimates hours per chapter and builds a daily study schedule.
See PRD.md for scope.

## MVP scope
Must stories (the only ones in v1). Demo = the full flow, upload → estimate → schedule:
1. Add courses (name, exam date, level: قوي / متوسط / ضعيف) and upload one PDF per chapter → hour range per course.
2. See the estimate split per chapter, each with a plain reason ("٣ ساعات لأن فيه ٤٠ صفحة و٢٥ معادلة").
3. Set daily study hours, start time, number of breaks and break length → day-by-day schedule until the last exam.

v1 decisions:
- The estimate uses 5 factors only: pages, words per page, equations/symbols, exercises, level. The result is a range (min–max).
- The schedule uses the **max** of each range, starts tomorrow at the chosen daily start time, and is a list of days (no drag and drop).
- Scanned PDFs (no text): estimate from pages + level only and show "ملف مصوّر، التقدير تقريبي".
- Uploads: PDF only, max 30 MB per file, max 30 files per course.
- Data is saved in the browser (localStorage). PDFs are never stored, only the numbers counted from them.

Out of scope: accounts, login, cross-device sync; visual calendar, drag and drop; non-PDF files;
reminders and notifications; sharing schedules; progress tracking and stats; AI features; rescheduling after a missed day.
If I ask for something out of scope, say so before building it.

## Design
- Read DESIGN.md before any UI work (written on day 2). Until it exists, build plain unstyled structure.
- Arabic-first: `dir="rtl"` on `<html>`, CSS logical properties only, no letter-spacing on Arabic.
- Arabic only for now. Every UI string lives in `web/src/lib/strings.js` so English can be added later.
- Tone: simple Modern Standard Arabic (فصحى مبسطة). Clear, neutral, short sentences, no slang.

## Stack
Versions verified on npm on 2026-11-23.
- JavaScript, no TypeScript: the starter uses it and it's faster for a beginner.
- React 19.3.1 + react-dom 19.3.1: the UI library, huge community.
- Vite 8.3.8 + @vitejs/plugin-react 6.3.0: dev server and build. Vite 5 (in the starter) no longer gets security fixes.
- Plain CSS: design tokens live only in `web/src/tokens.css`.
- State: React `useReducer` + one Context, saved to localStorage. No state library.
- Routing: the starter's hash switch in `App.jsx`. No router library.
- pdfjs-dist 6.5.438 (Mozilla PDF.js): reads page count and text in the browser.
- Vitest 5.1.0: tests for the estimate and schedule math only.
- Backend: none. No accounts, sharing or sync, so a server adds risk for nothing.
- Package manager: npm. Node 26 is installed here (Vite needs ^20.19 or >=22.12).

If it grows: cross-device saving → Supabase (Postgres + Auth). AI feature → one Vercel serverless
function to hold the key. Real OCR for scanned PDFs → Tesseract.js.

## Commands
Run from `web/`:
- Install: `npm install`
- Dev: `npm run dev` (on a phone, same Wi-Fi: `npm run phone`)
- Build: `npm run build`
- Preview build: `npm run preview`
- Test: `npm test` (to confirm: the script is added together with Vitest)
- Lint: none yet

## Architecture
Client-only single-page app with feature folders. The logic (PDF counting, estimate, schedule) is pure
functions with no UI, so it can be tested and later moved to a server unchanged.

## Project structure
```
sdaia-project/
├── CLAUDE.md            # this file
├── PRD.md               # product scope
├── DESIGN.md            # design system (day 2)
├── design/              # refs/, wireframes.md, mockups/, shots/
├── example/             # camp reference example, read-only
├── plain/               # starter's no-build version, reference only
└── web/                 # the app (Vite + React), deployed to Vercel
    ├── index.html       # <html lang="ar" dir="rtl">
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx     # entry point
        ├── App.jsx      # hash routing + app state provider
        ├── base.css     # resets and base styles (tokens only)
        ├── tokens.css   # the ONLY place for design tokens
        ├── features/
        │   ├── courses/   # screen 1: courses, exam dates, level, PDF upload
        │   ├── estimate/  # screen 2 + estimate.js (5 factors → range + reason)
        │   └── schedule/  # screen 3 + schedule.js (hours → day-by-day sessions)
        ├── lib/         # pdf.js, storage.js, format.js, strings.js (shared code)
        └── data/        # mock.json (mock data until day 3)
```
The starter's `src/screens/` moves into `features/` when each screen is built.
Factor weights and level multipliers (e.g. ضعيف ×1.5, قوي ×0.7) are named constants at the top of `estimate.js`.

## Build order
0) Upgrade the starter in `web/` to the versions in Stack, then check `npm run dev` and `npm run build` still work.
1) Screens on mock data, one at a time: courses → estimate → schedule.
2) Logic, one feature at a time: PDF reading → estimate.js (with tests) → schedule.js (with tests) → localStorage.
3) Connect each screen to the real logic and saved data, one at a time.

## Deployment
Vercel (Hobby plan), project root = `web/`. No self-managed servers.

## Working rules for AI agents
- Ask before assuming. For anything that touches more than a couple of files, plan first and wait for my OK.
- One task at a time. Explain non-obvious decisions in plain words: I am a beginner, so name the concept.
- Match existing patterns. Clean up what you touch. Look at the result (screenshot) before saying a UI change is done.
- Never install a package version published in the last 7 days.

## Secrets
- None are needed today. If any appear: environment variables only, never in code.
- Never commit `.env` or `.env.local`. Keep `.env.example` with names only. Validate env at startup.
- Keep `.gitignore` thorough (node_modules, dist, .env*) and check it before every push.

## Input rules
- There is no server, so validate in the browser: check the real `%PDF-` header (not just the extension),
  max 30 MB per file, max 30 files per course, required fields, exam date in the future, hours > 0.
- Never insert PDF text or user text as HTML (no `dangerouslySetInnerHTML`). Render as plain text.
- Read localStorage defensively: wrap it in try/catch, use a versioned key, and fall back to empty data if it's corrupt.
- If a server is ever added, validate there too.

<!--
  الصق هذا القسم في آخر CLAUDE.md حقك (أو AGENTS.md لو أداتك Codex أو Cursor).
  لا تستبدل الملف: ملفك فيه قرارات أمس (الـPRD والـstack). هذا قسم يُضاف تحت.
  ما عندك CLAUDE.md أصلًا (ماشي على مثال كورة الخميس)؟ غيّر اسم هذا الملف إلى CLAUDE.md.
-->

## UI rules (Day 2: design first)

- Read `DESIGN.md` before any UI work. Use only its tokens. If something you need is not in
  DESIGN.md, ask me first. Never invent a colour, a font size or a font.
- The frontend lives in `web/` (Vite + React). Tokens live ONLY in `web/src/tokens.css` and mirror
  DESIGN.md. No hex colours and no px font sizes anywhere else.
- When you fill `web/src/tokens.css` from DESIGN.md, delete the `--starter-banner` line.
- Arabic UI, RTL. `dir="rtl"` is set once on `<html>`. Logical CSS properties only
  (`margin-inline-start`, `padding-inline`, `inset-inline-end`, `text-align: start`); never left/right.
  Do not hand-reverse flex rows. No `letter-spacing` and no uppercase on Arabic text.
- English names go in `<bdi>`. Codes with dashes and long numbers go in `<span dir="ltr">`.
  Inputs that take user text get `dir="auto"`.
- Numbers, prices and dates go only through `web/src/lib/format.js` (Intl). The numeral system is
  written in DESIGN.md (default: Arabic-Indic ١٢٣ in the UI, 0-9 only in code; never zero-pad;
  no middle dot (U+00B7) next to a number, use «،»).
- Mock data only, from `web/src/data/mock.json`, until Day 3. No backend, no real API calls.
  Mock data is Arabic and keeps one very long name, one English name and one number-heavy line.
- One screen per task. Do not touch other screens, routing or tokens unless I ask.
- Design files live in `design/`: `refs/` (references + notes.md), `wireframes.md`, `mockups/`, `shots/`.
- Never tell me a UI task is done without a viewport screenshot at 375px wide (and 1280px when I ask),
  compared with the mockup in `design/mockups/`. Save the screenshots in `design/shots/`.
- If the stack in this file is not Vite + React, keep these rules, port them to that stack,
  and ask me before replacing `web/`.
