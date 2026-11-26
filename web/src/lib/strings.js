// strings.js: every UI string lives here, so English can be added later.
// Texts marked §8 are copied word for word from HANDOFF.md §8. Do not reword them.
// Functions that take numbers get them already formatted (Arabic digits, from lib/format.js).

export const APP_NAME = 'ميزان المذاكرة';

// Screen 1: Home (texts from prototype.html).
export const HOME = {
  title: 'ميزان المذاكرة',
  lead: 'ارفع شابترات موادك، ونقولك كم ساعة تحتاج كل مادة ونرتب لك جدول مذاكرة لين اختبارك.',
  steps: ['ارفع ملفاتك', 'شوف التقدير', 'استلم جدولك'],
  stepsLabel: 'الخطوات',
  start: 'رتب جدولك الان',
  demo: 'أو جرّب ببيانات تجريبية',
};

// Shared bits of the UI.
export const COMMON = {
  close: 'سكّر',
  back: '→ رجوع',
  removeFile: 'احذف الملف',
};

// DESIGN.md §6 Button: the loading and done states.
export const BUTTON_STATE = { loading: 'نرتّب جدولك...', done: 'انحفظت المادة' };

// DESIGN.md §6 Upload zone and File chip.
export const DROP_ZONE = {
  lecture: 'ارفع ملفات PDF (كل ملف = شابتر)',
  exercises: 'ارفع ملفات PDF للتمارين',
};
export const FILE_CHIP = { reupload: 'أعد الرفع', remove: 'احذفه وكمّل' };

// Units for durations (lib/format.js fmtDuration): «٢٠ د», «١٫٥ س».
export const DURATION_UNIT = { minutes: 'د', hours: 'س' };

// Badges (DESIGN.md §6 Badge).
export const BADGE = {
  hours: (rangeText, hi) => `${rangeText} ${HOURS_UNIT(hi)}`,
  exam: 'اختبار',
  added: 'انضافت',
  missing: (hoursText) => `${hoursText} س ناقصة`,
};

// §8: the schedule banners. The warning's first sentence is its title, the rest its body (prototype.html).
export const BANNER = {
  warningTitle: 'الوقت ما يكفي كل الشابترات قبل اختباراتك.',
  warningBody: (need, have, perDay) =>
    `تحتاج ${need} ساعة، وعندك ${have} ساعة بـ${perDay} ساعات في اليوم. غيّر عدد ساعات المذاكرة.`,
  changeHours: 'غيّر ساعاتي',
  success: 'جدولك يكفي كل الشابترات قبل اختباراتك. بالتوفيق!',
};

// Schedule cells (DESIGN.md §6 Session).
export const SESSION = {
  breakLabel: (minutesText) => `بريك ${minutesText} د`,
  exam: 'اختبار', // followed by the course name(s) in <bdi>
  tomorrow: 'بكرة',
  today: 'اليوم', // §8: the first column when today still has sessions
};

// §8 + HANDOFF.md §2 4a: the «تبدأ من جديد؟» popup. Also asked before the demo replaces saved courses.
export const RESTART = {
  title: 'تبدأ من جديد؟',
  text: 'بتنحذف كل موادك وجدولك، وما تقدر ترجّعها.',
  no: 'لا، خلّ جدولي',
  yes: 'ايه، احذف وابدأ من جديد',
};

// Screen 2: course entry. Errors marked §8 are word for word from HANDOFF.md §8.
export const COURSE_FORM = {
  title: 'مادة جديدة',
  nameLabel: 'اسم المادة:',
  namePlaceholder: 'مثلاً: الرياضيات ١',
  levelLabel: 'مستواك فيها:',
  dateLabel: 'موعد الاختبار:',
  datePlaceholder: 'اختر اليوم',
  save: 'احفظ المادة',
  errors: {
    name: 'اسم المادة فاضي. اكتبه عشان يطلع في جدولك.', // §8
    noChapters: 'ما رفعت ولا شابتر. ارفع ملف PDF واحد على الأقل.', // §8
    badFile: 'فيه ملف ما نقدر نقراه. أعد رفعه أو احذفه، وبعدها احفظ.', // §8
    level: 'ما اخترت مستواك. اختر واحد عشان نضبط الساعات على قدّك.', // §8
    date: 'موعد الاختبار ناقص أو قبل بكرة. اختر تاريخ من بكرة وطالع.', // §8
  },
};

// §8: the 6-course limit.
export const COURSE_LIMIT = 'وصلت لـ٦ مواد، وهذا الحد في هالنسخة. كمّل وخل نرتّب جدولك.';

// §8: preferences popup errors (used by screen 3).
export const PREFS_ERROR = {
  out_of_range: 'فيه حقل فاضي أو رقم برا المدى. الساعات من ١ لين ١٤، والبريكات من ٠ لين ٦، ومدة البريك من ٥ لين ٩٠ دقيقة.',
  // «الوقت ما يكفي المدى»: hours, breaks, needed hours, start, end, available hours (all already formatted)
  span_too_short: (h, b, need, start, end, span) =>
    `فيه مشكلة في الأرقام: ${h} ساعات مذاكرة مع ${b} بريك تحتاج ${need} ساعة، والمدى اللي حطيته من ${start} لين ${end} هو ${span} ساعة بس.`,
  end_before_start: 'وقت النهاية لازم يكون بعد وقت البداية',
};

// Screen 3: the course list (texts from prototype.html; the empty text is §8).
export const COURSE_LIST = {
  title: 'موادك',
  add: '+ إضافة مادة أخرى',
  addFirst: '+ أضف أول مادة',
  finish: 'خلصت، رتّب جدولي',
  empty: 'ما أضفت ولا مادة. ابدأ بالمادة اللي اختبارها أقرب.', // §8
};

// Screen 4: the schedule (texts from prototype.html; §8 where marked).
export const SCHEDULE = {
  title: 'جدول مذاكرتك', // for screen readers; the screen shows the banner instead
  weeksLabel: 'الأسابيع',
  prevWeek: '→ الأسبوع اللي قبل',
  nextWeek: 'الأسبوع الجاي ←',
  weekLabel: (from, to) => `${from} – ${to}`,
  backToCourses: '→ موادي',
  restart: 'ابدأ من جديد',
  leftoverTitle: 'ما لحقنا لها وقت',
  // §8 «جدول فاضي», split into its first sentence (the title) and the rest.
  emptyTitle: 'ما فيه أيام قبل اختباراتك.',
  emptyText: 'أقرب اختبار عندك بكرة، فما بقى وقت نرتّب فيه جدول. ارجع وتأكد من مواعيد الاختبارات.',
  emptyBack: 'ارجع لموادي',
  gridLabel: (weekText) => `جدول الأسبوع ${weekText}`,
  // Read before a session's content by screen readers: «بكرة، ٤:٠٠ م».
  sessionContext: (dayText, timeText) => `${dayText}، ${timeText}`,
};

// §8 Tooltip: the reason behind a session's estimate, 4 lines. Numbers come formatted.
export const TOOLTIP = {
  head: (course, file, range) => `${course}، ${file}: ${range} ساعات`,
  pages: (pages, density) => `${pages} صفحة، كثافة النص ${DENSITY_LABEL[density]}`,
  counts: (equations, exercises) => `${equations} معادلة، ${exercises} تمرين`,
  level: (level) => `مستواك فيها: ${LEVEL_LABEL[level]}`,
};

// «حمّل جدولك PDF» (HANDOFF.md §7 rule 15): the button and the top of the printed first page.
export const PRINT = {
  button: 'حمّل جدولك PDF',
  date: (dateText) => dateText, // today, «الأربعاء ٢٥ نوفمبر»
};

// Screen 4 when every exam has passed (§8).
export const ALL_PASSED = 'خلصت اختباراتك كلها. إذا عندك اختبارات جديدة، ابدأ من جديد ورتّب جدولك.';

// «بدّل بين جلستين» (§8; the hint is word for word).
export const SWAP = {
  button: 'بدّل بين جلستين',
  done: 'خلصت التبديل',
  hint: 'اختر جلسة، وبعدها اختر الجلسة اللي تبي تبدّل معها',
};

// Screen 2 in edit mode, and popup 2a (§8).
export const COURSE_EDIT = {
  title: 'عدّل المادة',
  save: 'احفظ التعديل',
  delete: 'احذف المادة',
  deleteTitle: 'تحذف المادة؟',
  // «بتنحذف {المادة} من موادك وجدولك.»: the name goes between, in <bdi>
  deleteText: { before: 'بتنحذف', after: 'من موادك وجدولك.' },
  deleteNo: 'لا، خلّها',
  deleteYes: 'ايه، احذفها',
  openCourse: (name) => `عدّل ${name}`, // the course card, for screen readers
};

// − / + on a file (§7 rule 19). The total and the tooltip line are §8.
export const ADJUST = {
  range: (rangeText) => `${rangeText} س`,
  less: (fileName) => `نقّص نص ساعة من ${fileName}`,
  more: (fileName) => `زد نص ساعة على ${fileName}`,
  total: (rangeText, hi) => `مجموع المادة: ${rangeText} ${HOURS_UNIT(hi)}`,
  tooltipLine: 'عدّلت وقتها بنفسك',
};

// Popup 4b: reschedule from what was finished (HANDOFF.md §8, Version 4).
export const RESCHEDULE = {
  button: 'رتّب جدولي من جديد',
  title: 'وش خلصت من الشابترات؟',
  hint: 'علّم على اللي خلصته، ونرتّب لك الباقي من بكرة.',
  submit: 'رتّب الباقي',
  allDone: 'خلصت كل شابتراتك. بالتوفيق في اختباراتك!',
};

// Popup 3a: preferences (labels from prototype.html).
export const PREFS = {
  title: 'تفضيلات يومك',
  hours: 'كم ساعة تذاكر في اليوم؟',
  breaks: 'كم بريك تبي؟',
  breakMinutes: 'مدة البريك (دقيقة):',
  start: 'متى تبدأ تذاكر؟',
  end: 'متى تخلص؟',
  submit: 'اطلع جدولي',
};

// Popup 3b: not enough time (§8).
export const SHORT = {
  title: 'الوقت ما يكفي',
  text: (need, perDay, have) =>
    `موادك تحتاج تقريباً ${need} ساعة، وبـ${perDay} ساعات في اليوم تلحق ${have} ساعة بس قبل اختباراتك. تبي تزيد ساعات مذاكرتك عشان تكفي؟`,
  more: 'ايه، أزيد ساعاتي',
  keep: 'لا، اطلع الجدول كذا',
};


export const LEVEL_LABEL = { strong: 'قوي', mid: 'متوسط', weak: 'ضعيف' };

export const DENSITY_LABEL = { low: 'خفيفة', mid: 'متوسطة', high: 'عالية' };

// §8: messages on a file chip, keyed by the error code from lib/pdf.js.
export const FILE_ERROR = {
  not_pdf: 'مو PDF، فما نقدر نقراه. ارفعه بصيغة PDF أو احذفه.',
  too_big: 'أكبر من ٤٠ ميقا. صغّر حجمه أو احذفه.',
  no_text: 'ما لقينا نص في الملف، يمكن صورة ممسوحة. ارفع نسخة فيها نص أو احذفه.',
  unreadable: 'الملف مقفول أو تالف، فما نقدر نقراه. افتحه واحفظه من جديد، أو احذفه.', // password-protected or damaged
};

// §8: the loading text. {ن} is the number of files, with Arabic number agreement:
// 1 «ملف», 2 «ملفين» (no number), 3–10 «٣ ملفات», 11 and up «١١ ملف».
export function loadingText(count, countText) {
  const files =
    count === 1 ? 'ملف' : count === 2 ? 'ملفين' : `${countText} ${count >= 3 && count <= 10 ? 'ملفات' : 'ملف'}`;
  return `نقرأ ${files} ونحسب وقت مذاكرتك...`;
}

// The AI study-time estimate (HANDOFF.md §7 rule 5, §8).
export const AI_TEXT = {
  privacy: 'نرسل جزء من نص ملفاتك للـAI عشان يقدّر صعوبتها، وما نحفظه.', // under the upload zones
  draft: 'الرقم مبدئي، والـAI يضبطه لما تحفظ.', // under the course total
  tooltipLine: (reason) => `تقدير الـAI: ${reason}`, // last tooltip line of an AI estimate
};
// Thrown by lib/ai.js. Never shown: a failed AI call falls back to the formula without a message.
export const AI_ERROR = 'ما قدرنا نوصل للـAI، جرّب بعدين.';

// The reason shown with each chapter estimate (same shape as mock.json and the §8 tooltip lines).
// Parts are separated with «،», never a middle dot: next to a number the dot looks like the Arabic zero «٠».
export const reasonText = ({ pages, density, equations, exercises, level }) =>
  `${pages} صفحة، كثافة النص ${DENSITY_LABEL[density]}، ${equations} معادلة، ${exercises} تمرين، مستواك فيها: ${LEVEL_LABEL[level]}`;

export const HOURS_UNIT = (hi) => (hi > 10 ? 'ساعة' : 'ساعات');

// The two upload zones on the course entry screen. A file's kind comes only from its zone.
export const UPLOAD_ZONE = {
  lecture: { label: 'ملفات الشابترات:' },
  exercises: { label: 'ملفات التمارين:', hint: '(اختياري)' },
};

// How a file is named in the list, the schedule and the tooltip. Chapters and exercise files are
// numbered separately: «شابتر ٢», «تمارين ١». `numberText` is already formatted (Arabic digits).
export const fileLabel = (kind, numberText) => `${kind === 'exercises' ? 'تمارين' : 'شابتر'} ${numberText}`;


