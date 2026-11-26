# design/shots/

Screenshots of the **built app**, the visual record of what was made. (`design/mockups/` holds the first design,
from `prototype.html`.) Most are viewport shots at 1280×800 and 768×1024. Each group says the version that took
it: the screen may have changed a little since. Where it did, the note says so; the newest shot of a screen wins.

## readme/ (Version 5, the final app, demo data)
Used by the repo's README.md. All from «أو جرّب ببيانات تجريبية», never real files.

| File | Screen |
|---|---|
| `readme/01-home.png` | 1. Home, nothing saved |
| `readme/02-course-entry.png` | 2. A demo course in edit mode: each file with its range and − / +, the course total, the privacy line |
| `readme/03-course-list.png` | 3. Course list, 4 demo courses |
| `readme/04-schedule-tooltip.png` | 4. Schedule from «بكرة», the not-enough-time warning, the reason tooltip open |
| `readme/05-reschedule.png` | 4b. «وش خلصت من الشابترات؟» with checkboxes |
| `readme/06-print-page1.png` | Page 1 of «حمّل جدولك PDF» (Chrome print to PDF, A4 landscape) |
| `readme/07-phone-schedule.png` | The schedule on a phone, portrait 390×844 |

## Version 4.8: review fixes
`01-home-demo-confirm-*` (the demo popup with its own texts), `03-course-list-save-error-*` (saving failed).

## Version 4.4 – 4.7: the AI estimate
`02-course-entry-ai-*` (file ranges, privacy line, «الرقم مبدئي…»), `04-schedule-ai-tooltip-*` (retaken in 4.7:
the tooltip's last line «تقدير الـAI (صعوبة ٢ من ٥): …»).

## Version 4.3: phone checks (`phone/`, landscape 844×390)
Every screen and state at phone size: home, course entry (empty, files, missing fields, limit), edit and delete,
course list (empty, full), preferences (and error), not enough time, schedule (success, warning, empty, all
passed, all finished, today, tooltip, swap), reschedule, restart.

## Version 4.2: today column, edit, adjust, swap
`02-edit-course-*`, `02-delete-course-*`, `03-list-after-edit-*`, `04-today-column-*`, `04-swap-*`,
`04-all-exams-passed-*`.

## Version 4.1: download as PDF
`print-demo*`, `print-demo-long*`, `print-real-pdfs*`: the screen, the PDF Chrome made, and each page as a PNG.

## Version 4: current schedule and reschedule
`04-schedule-two-days-later-*` (past days counted as studied), `04-reschedule-*`, `04-reschedule-real-pdfs-*`,
`04-all-finished-*`.

## Version 3.4: schedule screen
`04-schedule-success-*`, `04-schedule-warning-*`, `04-schedule-empty-*`, `04-schedule-tooltip-*` (before the AI
line), `04-schedule-week2-*`, `04-schedule-real-pdfs-*`, `04-restart-confirm-*`.

## Version 3.3: course list and preferences
`03-list-*` (empty, new course, full), `03-preferences-*` (and error), `03-not-enough-time-*`.

## Version 3.1: course entry
`02-course-entry-*` (empty, filled, missing fields, bad files, scanned and locked), `02-course-limit-*`,
`02-loading-*`, `02-saved-1280`. Taken before Version 4.4: no file ranges yet and no privacy line.

## Version 3: home
`home-1280`, `home-768`, and `home-demo-confirm-1280`, which still has the old texts borrowed from «ابدأ من جديد»
(replaced in 4.8 by `01-home-demo-confirm-*`).
