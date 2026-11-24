// strings.js: every UI string lives here, so English can be added later.
// Texts marked §8 are copied word for word from HANDOFF.md §8. Do not reword them.

export const LEVEL_LABEL = { strong: 'قوي', mid: 'متوسط', weak: 'ضعيف' };

export const DENSITY_LABEL = { low: 'خفيفة', mid: 'متوسطة', high: 'عالية' };

// §8: messages on a file chip, keyed by the error code from lib/pdf.js.
export const FILE_ERROR = {
  not_pdf: 'مو PDF، فما نقدر نقراه. ارفعه بصيغة PDF أو احذفه.',
  too_big: 'أكبر من ٤٠ ميقا. صغّر حجمه أو احذفه.',
  no_text: 'ما لقينا نص في الملف، يمكن صورة ممسوحة. ارفع نسخة فيها نص أو احذفه.',
  // A damaged or password-protected PDF has no text of its own in §8 yet.
  // Until it does, it uses the §8 "file error under the field" text.
  unreadable: 'فيه ملف ما نقدر نقراه. أعد رفعه أو احذفه، وبعدها احفظ.',
};

// §8: the loading text. {ن} is the number of files; the noun follows Arabic number agreement.
export const loadingText = (count, countText) =>
  `نقرأ ${countText} ${count >= 3 && count <= 10 ? 'ملفات' : 'ملف'} ونحسب وقت مذاكرتك...`;

// The reason shown with each chapter estimate (same shape as mock.json and the §8 tooltip lines).
export const reasonText = ({ pages, density, equations, exercises, level }) =>
  `${pages} صفحة · كثافة النص ${DENSITY_LABEL[density]} · ${equations} معادلة · ${exercises} تمرين · مستواك فيها: ${LEVEL_LABEL[level]}`;

export const HOURS_UNIT = (hi) => (hi > 10 ? 'ساعة' : 'ساعات');

// Temporary Day 1 test page (features/estimate/PdfTestPage.jsx). Deleted when screen 2 is built.
export const PDF_TEST = {
  title: 'صفحة اختبار قراءة الـPDF (مؤقتة)',
  level: 'مستواك في المادة:',
  files: 'ملفات الشابترات:',
  file: 'الملف',
  kind: 'النوع',
  kindLabel: { lecture: 'محاضرة', exercises: 'تمارين' },
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
