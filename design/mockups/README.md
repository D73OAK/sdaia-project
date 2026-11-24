# design/mockups/

The reference every built screen is compared with. These are 1280px-wide screenshots of the current
`prototype.html` (taken 2026-11-24, Version 1.4), one per screen and main state from HANDOFF.md §4.
Retake them whenever `prototype.html` changes. If a mockup and DESIGN.md disagree, DESIGN.md wins.

Most are 1280×800 viewport shots. The long screens are as tall as the page (marked *tall*).
Motion is turned off (`prefers-reduced-motion`), so the background doodles stand still.

| File | Screen and state |
|---|---|
| `01-home.png` | 1. Home |
| `02-course-entry.png` | 2. Course entry, empty, both upload zones (*tall*) |
| `02-course-entry-missing-fields.png` | 2. «احفظ المادة» with every field missing: each field marked, with its message (*tall*) |
| `02-course-entry-filled.png` | 2. Filled in: 2 chapter files, 1 exercise file, level, date (*tall*) |
| `02-course-entry-bad-files.png` | 2. A non-PDF in the chapters zone, a file over 40 MB in the exercises zone (*tall*) |
| `02-loading.png` | Loading overlay «نقرأ ٣ ملفات ونحسب وقت مذاكرتك...» |
| `03-list-empty.png` | 3. Course list, no courses: «+ أضف أول مادة», «خلصت، رتّب جدولي» disabled |
| `03-list-new-course.png` | 3. Course list right after saving a course (mint tick) |
| `03-list.png` | 3. Course list, 4 demo courses (long name, English name) |
| `03-list-full.png` | 3. Course list, 6 courses: add button disabled, limit message |
| `03-preferences.png` | 3a. Preferences popup with the default values |
| `03-preferences-error.png` | 3a. Preferences: the hours and breaks do not fit between start and end |
| `03-not-enough-time.png` | 3b. «الوقت ما يكفي» popup |
| `04-schedule-warning.png` | 4. Schedule after «لا، اطلع الجدول كذا»: warning + «ما لحقنا لها وقت» (*tall*) |
| `04-schedule-tooltip.png` | 4. Schedule with the reason tooltip on a «بكرة» session |
| `04-schedule-swap.png` | 4. Swap mode: hint, one session picked, sessions that cannot swap faded |
| `04-restart-confirm.png` | 4a. «تبدأ من جديد؟» popup |
| `04-schedule-success.png` | 4. Schedule that fits: success banner, «تمارين ١» after the chapters (*tall*) |
| `04-schedule-empty.png` | 4. Empty schedule: the only exam is tomorrow |

Not shown, because the prototype does not have them: the scanned-PDF and locked/damaged-PDF
chip errors (the prototype's estimate is fake and never reads the file). They look like the
other chip errors, with their HANDOFF.md §8 text.
