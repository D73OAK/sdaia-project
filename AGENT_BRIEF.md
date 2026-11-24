# Brief for the AI coding agent

You are building **ميزان المذاكرة** (Study Scale), an Arabic RTL web app. A student uploads one PDF per chapter for each course and gets an estimated study-hours range per chapter with the reasons, then a weekly study schedule up to the last exam. Build it in **4 days**, for a beginner who works alone.

## Read first, in this order
1. `PRD.md`: the problem, the user, the scope, and what is out of scope.
2. `HANDOFF.md`: the screens, the happy and unhappy paths, data, actions, rules, and the **exact Arabic state texts**. Items marked [?] are assumptions: ask before you decide them.
3. `DESIGN.md`: tokens, type, components, motion, and the Arabic/RTL rules. **Follow it exactly. It wins over the prototype.**
4. `mock.json`: realistic sample data. Use it for fixtures and tests.
5. `prototype.html`: the working reference for the look, the flow, and the scheduling logic. Open it in a browser and click «جرّب ببيانات تجريبية». The estimate in it is **fake**: it is based on a hash of the file. You replace that with real PDF analysis.

## Hard rules
- Arabic, `dir="rtl"`. Laptop and tablet first. Every hover interaction needs a tap equivalent.
- No accounts, no login, no backend database in v1. Keep all state in the browser (`localStorage` for the "Should: saved schedule" story if time allows).
- Only PDF. Each file = exactly one chapter. Estimate only the chapters the student uploaded.
- From opening the app to seeing the schedule must take under **10 minutes** for 4 courses.
- Do not add features that are not in PRD.md. Out of scope: drag-and-drop, notifications, sharing, sync, non-PDF files.

## Estimation (the core; build it first)
For each chapter PDF, extract:
1. `pages`: the page count
2. `density`: average words per page, bucketed into low (<120), mid (120–300), and high (>300)
3. `equations`: the count of math symbols and equation-like lines (`= ∑ √ ∫ ≤ ≥ ^ π`, fractions)
4. `exercises`: the count of "Exercise / Example / Problem / تمرين / مثال / سؤال" headings. A file whose name matches `ex|hw|sheet|تمار` counts as an exercise file
5. `level`: the student's level in the course: strong (×0.75), mid (×1.0), weak (×1.4)

Starting formula, in hours (weights are placeholders to calibrate later; keep them in one config object):
```
base = pages*0.0375 + {low:0, mid:0.4, high:0.8}[density] + equations*0.03 + exercises*0.12
lo   = max(0.5, round_to_half(base * levelMultiplier))
hi   = round_to_half(lo * 1.4)
```
- Show the **range** `lo–hi` and the reason, for example «٣٠ صفحة · كثافة متوسطة · ١٢ معادلة · ٥ تمارين · مستواك: ضعيف».
- If a PDF has no extractable text (a scan), show the file-error state from HANDOFF.md §8.
- Use a client-side PDF library (for example pdf.js). The files must not leave the device.

## Scheduling (copy the logic in prototype.html → `build()`)
- Uses the **upper bound `hi`** of each chapter.
- Days run from tomorrow up to the last exam. No sessions on or after a course's exam day.
- Each day starts at the user's start time: session, break, session... There are `breaks + 1` sessions, each `hoursPerDay / (breaks+1)` long.
- Fill each session with the remaining chapter of the course whose **exam is earliest** and still has a future exam date. Fill chapters in order.
- Anything left after that goes into «ما لحقنا لها وقت».
- Validation before building: `hoursPerDay*60 + breaks*breakMin` must be ≤ `end - start`, and `end` must be after `start`. Otherwise, show the error message from HANDOFF.md §8.
- If anything is left over, show the "not enough time" popup first (see DESIGN.md → states).

## Build order (4 days)
| Day | Deliver | Done when |
|---|---|---|
| 1 | PDF upload + analysis + estimate per chapter, with the reason | Uploading 3 real chapter PDFs shows a sensible `lo–hi` and the reason, and a bad file shows the error state |
| 2 | Screens 1–3 + the preferences popup with validation, styled per DESIGN.md | A student can add 4 courses and see the list with ranges and colours |
| 3 | Scheduling + the weekly calendar + the tooltip + the not-enough-time flow | The schedule matches prototype behaviour, and the «ما لحقنا لها وقت» list works |
| 4 | Polish, the loading state, the background animation, tablet tap checks, and **Should: swap sessions** only if everything else works | All states in DESIGN.md are reproducible, and nothing breaks at 768px width |

If Day 1 slips, cut the per-chapter tooltip details first, not the estimate.

## Acceptance checklist
- [ ] Every Must story in PRD.md works end to end with real PDFs
- [ ] Every unhappy path in HANDOFF.md §4 can be triggered, with the exact text from §8
- [ ] Arabic-Indic digits everywhere, dates and times from Arabic select lists, no emoji (DESIGN.md §8)
- [ ] Course colours are the same in the list and the calendar
- [ ] No session is scheduled on or after its course's exam day
- [ ] The tooltip works with hover (laptop) and tap (tablet)
- [ ] Fonts, colours, radii and shadows match DESIGN.md
