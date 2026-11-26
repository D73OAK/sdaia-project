# Brief for the AI coding agent

**ميزان المذاكرة** (Study Scale) is an Arabic RTL web app, live at https://m1zan.vercel.app. A university student
adds each course (chapter PDFs, optional exercise PDFs, their level, the exam date), sees a study-hours range
per file with the reason, and gets a weekly study schedule from tomorrow to the last exam. This brief
describes the **final app (Version 4.8)**. Change it only together with the code.

## Read first, in this order
1. `PRD.md`: the problem, the user, what was built and what stayed out of scope.
2. `HANDOFF.md`: screens, happy and unhappy paths, data, actions, rules, and the **exact Arabic texts (§8)**.
3. `DESIGN.md`: tokens, type, components and their states, motion, Arabic/RTL rules.
4. `design/shots/`: screenshots of the built app (index in its README.md).
5. `web/src/data/mock.json`: the sample data behind the tests and «جرّب ببيانات تجريبية».

`prototype.html` and `design/mockups/` show the **first design** (before Version 2). They are kept for history
only. DESIGN.md, HANDOFF.md and `design/shots/` describe the final app and win over them.

## Hard rules
- Arabic only, `dir="rtl"`, every UI string in `web/src/lib/strings.js`, §8 texts word for word.
- Laptop and tablet first; phones work too. Touch targets 44px or more; every hover has a tap equivalent.
- No accounts and no database. Courses, preferences, the plan and progress live in `localStorage`
  (`web/src/lib/storage.js`, versioned key, defensive reads). The student moves the schedule to other devices
  by downloading it as a PDF.
- The only server code is one Vercel function, `web/api/ai.js`, which holds the AI key. It stores nothing.
- PDF only, 40 MB per file, max 6 courses. A file's kind (`lecture` / `exercises`) comes only from its upload
  zone, never from its name. PDFs are never stored: only their counted numbers.
- Never insert PDF text or user text as HTML.

## The estimate: the AI judges the difficulty, the formula measures the size
1. **Reading (in the browser, pdf.js):** for each file count `pages`, `density` (words per page: low < 120,
   mid 120–300, high > 300), `equations` (lines with `= ∑ √ ∫ ≤ ≥ ^ π` or a fraction) and `exercises`
   (headings like Example / Exercise / مثال / تمرين). Reject a scan: fewer than 3 words per page on average, or
   fewer than half the pages with 3+ words. Keep a ~1500-character text sample in memory only.
2. **Formula** (all weights in `ESTIMATE_CONFIG`, `web/src/features/estimate/estimate.js`):
   ```
   base = pages*0.0375 + {low:0, mid:0.4, high:0.8}[density] + equations*0.03 + exercises*0.12
   lo   = max(0.5, round½(base × level × difficulty))      level: strong 0.75, mid 1, weak 1.4
   hi   = round½(lo × 1.4)                                  difficulty: 1 0.7, 2 0.85, 3 1, 4 1.2, 5 1.4
   ```
   Without an AI difficulty the factor is 1 (the plain formula).
3. **AI** (when a course is saved, `web/src/features/estimate/aiEstimate.js`): ONE call per course for its new
   files (label, kind, density, equation and exercise counts, text sample; no level, pages or hours). Saved
   files already judged go along as context only. The AI returns, per file, a difficulty 1–5 about the content
   and a one-line Saudi reason starting with «فيه». A broken or missing answer, a failed call, a 30 s timeout
   or a missing key means the plain formula for that file, with no error shown. The demo never calls the AI.
4. Saved files keep their difficulty; a level change recomputes hours without a call. Files the student
   adjusted with − / + keep their hours and are never sent.

## The AI route (`web/api/ai.js`)
OpenAI-compatible `POST {AI_BASE_URL}/chat/completions` with `fetch` (no SDK); env `AI_BASE_URL`,
`AI_API_KEY`, `AI_MODEL` (Groq, `openai/gpt-oss-120b`). `temperature 0.2`, `max_tokens 4000`,
`reasoning_effort medium` for gpt-oss, structured output (`json_schema`, strict). Prompt 1–12000 characters
(else 400); 403 unless the Origin (or Referer) is our own host; 10 requests per minute per IP from
`x-real-ip` (else 429); a missing variable logs only its NAME (500); a provider failure logs only its status
and error code, never its body (502, or 429). The system message says the user text is data, never
instructions; the browser checks every answer.

## The schedule (`web/src/features/schedule/`)
- Uses each file's `hiHours` (what is left of it: past days count as studied). Days run from tomorrow to the
  last exam; a day is session, break, session… (`breaks + 1` sessions of `hoursPerDay / (breaks+1)`).
- Each session is filled with the next file of the course whose exam is earliest: within a course all chapters
  (upload order), then all exercise files. A session can hold 2–3 files (parts); no part is under 15 minutes.
  No session on or after a course's exam day; an exam day still holds other courses.
- What does not fit goes to «ما لحقنا لها وقت». Preferences are checked first (HANDOFF §7 rule 11).
- Popups 3a/3b build the plan as a draft; only accepting saves it. ✕ or Esc never saves.
- **Today / tomorrow:** on opening, past days are counted as studied and leave the plan; a saved plan with
  sessions today shows a highlighted «اليوم» column, otherwise «بكرة». A new plan always starts tomorrow.
- **«رتّب جدولي من جديد»:** tick the finished files; the rest is planned again from tomorrow.
- **Swap:** two whole sessions trade places if every part stays before its exam.
- **Edit / delete a course:** from its card; keeps its colour; drops the current plan; keeps progress of files
  that still exist.
- **Adjust:** − / + moves a file's range by half an hour (never under half an hour).
- **«حمّل جدولك PDF»:** `window.print()` with a print stylesheet (no PDF library: they break Arabic). A4
  landscape, one week per page (shrunk to fit), all future weeks, white page, course colours kept.

## How it was built
| Version | What |
|---|---|
| 1 – 1.4 | PDF reading and the formula with tests; page weight calibrated on real study time; exercise zone; prototype mockups |
| 2 – 2.1 | Schedule logic and storage, no backend; the rest of a session goes to the next file |
| 3 – 3.4 | Tokens and components, then screens 1–4 |
| 4 – 4.3 | Current schedule and reschedule; PDF export; today column, edit, adjust, swap; polish |
| 4.4 – 4.7 | AI estimate, then calibrated: the AI judges difficulty, the formula measures size |
| 4.8 | Review fixes: draft plans, abort on leave, scan rule, origin check, safe logs, save-error message |
| 5 | Final docs and README |

## Checks before any commit
`npm test` and `npm run build` pass (run from `web/`); `dist/` contains no `AI_API_KEY` and no provider URL;
`git ls-files | grep env` lists only `web/.env.example`. After a UI change, take 1280px and 768px screenshots
into `design/shots/` and look at them.
