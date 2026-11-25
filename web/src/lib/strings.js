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
};

// §8 + HANDOFF.md §2 4a: the «تبدأ من جديد؟» popup. Also asked before the demo replaces saved courses.
export const RESTART = {
  title: 'تبدأ من جديد؟',
  text: 'بتنحذف كل موادك وجدولك، وما تقدر ترجّعها.',
  no: 'لا، خلّ جدولي',
  yes: 'ايه، احذف وابدأ من جديد',
};

// Screens that are not built yet (temporary, until screens 2–4 exist).
export const NOT_BUILT = 'هذي الشاشة تنبني في الخطوة الجاية.';

export const LEVEL_LABEL = { strong: 'قوي', mid: 'متوسط', weak: 'ضعيف' };

export const DENSITY_LABEL = { low: 'خفيفة', mid: 'متوسطة', high: 'عالية' };

// §8: messages on a file chip, keyed by the error code from lib/pdf.js.
export const FILE_ERROR = {
  not_pdf: 'مو PDF، فما نقدر نقراه. ارفعه بصيغة PDF أو احذفه.',
  too_big: 'أكبر من ٤٠ ميقا. صغّر حجمه أو احذفه.',
  no_text: 'ما لقينا نص في الملف، يمكن صورة ممسوحة. ارفع نسخة فيها نص أو احذفه.',
  unreadable: 'الملف مقفول أو تالف، فما نقدر نقراه. افتحه واحفظه من جديد، أو احذفه.', // password-protected or damaged
};

// §8: the loading text. {ن} is the number of files; the noun follows Arabic number agreement.
export const loadingText = (count, countText) =>
  `نقرأ ${countText} ${count >= 3 && count <= 10 ? 'ملفات' : 'ملف'} ونحسب وقت مذاكرتك...`;

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

// Temporary Day 1 test page (features/estimate/PdfTestPage.jsx). Deleted when screen 2 is built.
export const PDF_TEST = {
  title: 'صفحة اختبار قراءة الـPDF (مؤقتة)',
  level: 'مستواك في المادة:',
  file: 'الملف',
  pages: 'الصفحات',
  words: 'كلمة في الصفحة',
  density: 'الكثافة',
  equations: 'المعادلات',
  exercises: 'التمارين',
  range: 'المدى (ساعات)',
  reason: 'السبب',
  total: 'مجموع المادة:',
  clear: 'امسح الملفات',
  empty: 'ما رفعت ولا شابتر. ارفع ملف PDF واحد على الأقل.',
};

// Temporary components page (dev/ComponentsPage.jsx, route #/components). Deleted when the screens are done.
export const COMPONENTS_PAGE = {
  title: 'المكوّنات (صفحة مؤقتة)',
  buttons: 'الأزرار',
  states: { default: 'عادي', hover: 'hover', pressed: 'مضغوط', loading: 'تحميل', done: 'تم', disabled: 'معطّل' },
  primary: 'اطلع جدولي',
  secondary: 'خلصت، رتّب جدولي',
  link: 'ابدأ من جديد',
  inputs: 'الحقول',
  nameLabel: 'اسم المادة:',
  namePlaceholder: 'مثلاً: الرياضيات ١',
  nameError: 'اسم المادة فاضي. اكتبه عشان يطلع في جدولك.',
  hoursLabel: 'كم ساعة تذاكر في اليوم؟',
  dateLabel: 'موعد الاختبار:',
  datePlaceholder: 'اختر اليوم',
  dateError: 'موعد الاختبار ناقص أو قبل بكرة. اختر تاريخ من بكرة وطالع.',
  timeLabel: 'متى تبدأ تذاكر؟',
  focus: 'focus',
  pills: 'المستوى',
  levelLabel: 'مستواك فيها:',
  upload: 'رفع الملفات',
  fileError: 'فيه ملف ما نقدر نقراه. أعد رفعه أو احذفه، وبعدها احفظ.',
  cards: 'كروت المواد',
  badges: 'الـbadges',
  banners: 'التحذير والنجاح',
  modal: 'الـpopup',
  openModal: 'افتح popup',
  sessions: 'الجلسات',
  sessionStates: {
    normal: 'عادية',
    parts: 'جزئين',
    threeParts: 'ثلاثة أجزاء',
    tomorrow: 'بكرة',
    tomorrowParts: 'بكرة بجزئين',
    break: 'بريك',
    exam: 'يوم الاختبار',
    picked: 'محددة للتبديل',
    blocked: 'ما ينفع تبديلها',
  },
};
