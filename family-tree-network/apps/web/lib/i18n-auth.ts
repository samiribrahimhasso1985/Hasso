'use client';

import { useI18n, type Locale } from './i18n';

/** Texts of the account screens (registration, sign-in, verification, password reset). */
const en = {
  stepOf: 'Step {n} of 3',
  stepAccount: 'Your account',
  stepAbout: 'About you',
  stepConsent: 'Privacy & consent',
  confirmPassword: 'Repeat password',
  showPassword: 'Show password',
  passwordHint: 'At least 10 characters. A short sentence is easy to remember and hard to guess.',
  strength0: 'Too short',
  strength1: 'Weak',
  strength2: 'Good',
  strength3: 'Strong',
  passwordsDiffer: 'The two passwords are not the same.',
  next: 'Continue',
  back: 'Back',
  country: 'Country (optional)',
  countryNone: 'Prefer not to say',
  countryHint: 'Only the country is stored — never your city or address. You can change it later.',
  languageHint: 'Language of the app and of your e-mails: use the language buttons above.',
  consentIntro: 'Please read and confirm. All three are needed to create an account.',
  consentTerms: 'I accept the terms of use and the privacy policy.',
  consentSensitive:
    'I explicitly agree that EZIDINET processes my data even though membership of a Yazidi community platform can reveal religious or ethnic affiliation (GDPR Art. 9).',
  consentAge: 'I am at least 16 years old. (Children use EZIDINET Kids through their parents.)',
  consentWhat: 'What this means',
  consentDetails:
    'You are not findable in search until you switch it on. Location is country-level only. Nobody infers religion or origin from your data. You can download or delete your data at any time and withdraw consent. These texts are drafts until the legal review.',
  createAccount: 'Create account',
  forgot: 'Forgot password?',
  forgotTitle: 'Reset your password',
  forgotIntro: 'Enter your e-mail address. If an account exists, we send a link to choose a new password.',
  sendLink: 'Send link',
  forgotSent: 'If an account exists for this address, a link is on its way. It is valid for 1 hour.',
  backToLogin: 'Back to sign in',
  tooMany: 'Too many failed attempts. Try again in {m} minutes.',
  emailTaken: 'An account with this e-mail address already exists. Sign in or reset your password.',
  pwTooShort: 'The password needs at least 10 characters.',
  pwCommon: 'This password is too common. Choose another one.',
  pwEmail: 'The password must not contain your e-mail address.',
  verifyBanner: 'Please confirm your e-mail address. We sent a link to {email}.',
  resend: 'Send again',
  resent: 'A new link was sent.',
  devMailbox: 'Developer mailbox',
  devMailboxNote: 'Local test version: e-mails are not sent to the internet but shown here.',
  verifying: 'Confirming your e-mail address…',
  verified: 'Your e-mail address is confirmed. Thank you!',
  linkInvalid: 'This link is invalid or has expired. Request a new one.',
  toApp: 'Go to EZIDINET',
  resetTitle: 'Choose a new password',
  savePassword: 'Save new password',
  resetDone: 'Your password was changed and every device was signed out. Sign in with the new password.',
  sessionEnded: 'Your session has ended. Please sign in again.',
  logoutAll: 'Sign out on all devices',
  noMessages: 'No messages yet.',
  open: 'Open',
};
export type AuthDict = typeof en;

const de: AuthDict = {
  stepOf: 'Schritt {n} von 3',
  stepAccount: 'Dein Konto',
  stepAbout: 'Über dich',
  stepConsent: 'Datenschutz & Einwilligung',
  confirmPassword: 'Passwort wiederholen',
  showPassword: 'Passwort anzeigen',
  passwordHint: 'Mindestens 10 Zeichen. Ein kurzer Satz ist leicht zu merken und schwer zu erraten.',
  strength0: 'Zu kurz',
  strength1: 'Schwach',
  strength2: 'Gut',
  strength3: 'Stark',
  passwordsDiffer: 'Die beiden Passwörter stimmen nicht überein.',
  next: 'Weiter',
  back: 'Zurück',
  country: 'Land (freiwillig)',
  countryNone: 'Keine Angabe',
  countryHint: 'Gespeichert wird nur das Land — nie Stadt oder Adresse. Du kannst es später ändern.',
  languageHint: 'Sprache der App und deiner E-Mails: über die Sprachauswahl oben.',
  consentIntro: 'Bitte lesen und bestätigen. Alle drei sind für ein Konto nötig.',
  consentTerms: 'Ich akzeptiere die Nutzungsbedingungen und die Datenschutzerklärung.',
  consentSensitive:
    'Ich willige ausdrücklich ein, dass EZIDINET meine Daten verarbeitet, obwohl die Mitgliedschaft in einer ezidischen Gemeinschaftsplattform eine religiöse oder ethnische Zugehörigkeit erkennen lassen kann (DSGVO Art. 9).',
  consentAge: 'Ich bin mindestens 16 Jahre alt. (Kinder nutzen EZIDINET Kids über ihre Eltern.)',
  consentWhat: 'Was das bedeutet',
  consentDetails:
    'Du bist in der Suche nicht auffindbar, bis du es einschaltest. Der Standort ist nur das Land. Niemand leitet Religion oder Herkunft aus deinen Daten ab. Du kannst deine Daten jederzeit herunterladen oder löschen und die Einwilligung widerrufen. Die Texte sind Entwürfe bis zur rechtlichen Prüfung.',
  createAccount: 'Konto erstellen',
  forgot: 'Passwort vergessen?',
  forgotTitle: 'Passwort zurücksetzen',
  forgotIntro: 'Gib deine E-Mail-Adresse ein. Wenn ein Konto existiert, senden wir einen Link für ein neues Passwort.',
  sendLink: 'Link senden',
  forgotSent: 'Wenn für diese Adresse ein Konto existiert, ist ein Link unterwegs. Er ist 1 Stunde gültig.',
  backToLogin: 'Zurück zur Anmeldung',
  tooMany: 'Zu viele Fehlversuche. Versuche es in {m} Minuten erneut.',
  emailTaken: 'Für diese E-Mail-Adresse gibt es bereits ein Konto. Melde dich an oder setze dein Passwort zurück.',
  pwTooShort: 'Das Passwort braucht mindestens 10 Zeichen.',
  pwCommon: 'Dieses Passwort ist zu häufig. Wähle ein anderes.',
  pwEmail: 'Das Passwort darf deine E-Mail-Adresse nicht enthalten.',
  verifyBanner: 'Bitte bestätige deine E-Mail-Adresse. Wir haben einen Link an {email} gesendet.',
  resend: 'Erneut senden',
  resent: 'Ein neuer Link wurde gesendet.',
  devMailbox: 'Entwickler-Postfach',
  devMailboxNote: 'Lokale Testversion: E-Mails gehen nicht ins Internet, sondern erscheinen hier.',
  verifying: 'E-Mail-Adresse wird bestätigt…',
  verified: 'Deine E-Mail-Adresse ist bestätigt. Danke!',
  linkInvalid: 'Dieser Link ist ungültig oder abgelaufen. Fordere einen neuen an.',
  toApp: 'Zu EZIDINET',
  resetTitle: 'Neues Passwort wählen',
  savePassword: 'Neues Passwort speichern',
  resetDone: 'Dein Passwort wurde geändert und alle Geräte wurden abgemeldet. Melde dich mit dem neuen Passwort an.',
  sessionEnded: 'Deine Sitzung ist beendet. Bitte melde dich erneut an.',
  logoutAll: 'Auf allen Geräten abmelden',
  noMessages: 'Noch keine Nachrichten.',
  open: 'Öffnen',
};

const ar: AuthDict = {
  stepOf: 'الخطوة {n} من 3',
  stepAccount: 'حسابك',
  stepAbout: 'عنك',
  stepConsent: 'الخصوصية والموافقة',
  confirmPassword: 'أعد كتابة كلمة المرور',
  showPassword: 'إظهار كلمة المرور',
  passwordHint: '10 أحرف على الأقل. جملة قصيرة سهلة التذكر وصعبة التخمين.',
  strength0: 'قصيرة جداً',
  strength1: 'ضعيفة',
  strength2: 'جيدة',
  strength3: 'قوية',
  passwordsDiffer: 'كلمتا المرور غير متطابقتين.',
  next: 'متابعة',
  back: 'رجوع',
  country: 'الدولة (اختياري)',
  countryNone: 'أفضّل عدم الذكر',
  countryHint: 'نحفظ الدولة فقط — لا المدينة ولا العنوان أبداً. يمكنك تغييرها لاحقاً.',
  languageHint: 'لغة التطبيق ورسائل البريد: من أزرار اللغة في الأعلى.',
  consentIntro: 'يرجى القراءة والتأكيد. الثلاثة مطلوبة لإنشاء حساب.',
  consentTerms: 'أوافق على شروط الاستخدام وسياسة الخصوصية.',
  consentSensitive:
    'أوافق صراحةً على أن تعالج EZIDINET بياناتي، مع علمي بأن العضوية في منصة لمجتمع إيزيدي قد تكشف انتماءً دينياً أو عرقياً (المادة 9 من اللائحة الأوروبية لحماية البيانات).',
  consentAge: 'عمري 16 سنة على الأقل. (الأطفال يستخدمون EZIDINET للأطفال عبر أهلهم.)',
  consentWhat: 'ماذا يعني هذا',
  consentDetails:
    'لا يمكن لأحد إيجادك في البحث حتى تفعّل ذلك بنفسك. الموقع على مستوى الدولة فقط. لا أحد يستنتج الدين أو الأصل من بياناتك. يمكنك تنزيل بياناتك أو حذفها وسحب موافقتك في أي وقت. هذه النصوص مسودات حتى المراجعة القانونية.',
  createAccount: 'إنشاء الحساب',
  forgot: 'نسيت كلمة المرور؟',
  forgotTitle: 'إعادة تعيين كلمة المرور',
  forgotIntro: 'أدخل بريدك الإلكتروني. إن كان هناك حساب، نرسل رابطاً لاختيار كلمة مرور جديدة.',
  sendLink: 'أرسل الرابط',
  forgotSent: 'إن كان هناك حساب بهذا البريد، فالرابط في الطريق إليه. صالح لمدة ساعة.',
  backToLogin: 'العودة لتسجيل الدخول',
  tooMany: 'محاولات خاطئة كثيرة. حاول مجدداً بعد {m} دقيقة.',
  emailTaken: 'يوجد حساب بهذا البريد الإلكتروني. سجّل الدخول أو أعد تعيين كلمة المرور.',
  pwTooShort: 'كلمة المرور تحتاج 10 أحرف على الأقل.',
  pwCommon: 'كلمة المرور هذه شائعة جداً. اختر غيرها.',
  pwEmail: 'يجب ألا تحتوي كلمة المرور على بريدك الإلكتروني.',
  verifyBanner: 'يرجى تأكيد بريدك الإلكتروني. أرسلنا رابطاً إلى {email}.',
  resend: 'أرسل مرة أخرى',
  resent: 'أُرسل رابط جديد.',
  devMailbox: 'صندوق بريد المطوّر',
  devMailboxNote: 'نسخة اختبار محلية: الرسائل لا تُرسل إلى الإنترنت بل تظهر هنا.',
  verifying: 'جارٍ تأكيد بريدك الإلكتروني…',
  verified: 'تم تأكيد بريدك الإلكتروني. شكراً لك!',
  linkInvalid: 'هذا الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.',
  toApp: 'الذهاب إلى EZIDINET',
  resetTitle: 'اختر كلمة مرور جديدة',
  savePassword: 'حفظ كلمة المرور الجديدة',
  resetDone: 'تم تغيير كلمة المرور وتسجيل الخروج من كل الأجهزة. سجّل الدخول بكلمة المرور الجديدة.',
  sessionEnded: 'انتهت جلستك. يرجى تسجيل الدخول مجدداً.',
  logoutAll: 'تسجيل الخروج من كل الأجهزة',
  noMessages: 'لا توجد رسائل بعد.',
  open: 'افتح',
};

// Kurmanji: draft, to be reviewed by a native speaker (like the rest of the ku texts).
const ku: AuthDict = {
  stepOf: 'Gav {n} ji 3',
  stepAccount: 'Hesabê te',
  stepAbout: 'Derbarê te de',
  stepConsent: 'Nepenî û razîbûn',
  confirmPassword: 'Şîfreyê dubare bike',
  showPassword: 'Şîfreyê nîşan bide',
  passwordHint: 'Herî kêm 10 tîp. Hevokeke kurt hêsan tê bîrê û zehmet tê texmînkirin.',
  strength0: 'Pir kurt',
  strength1: 'Qels',
  strength2: 'Baş',
  strength3: 'Xurt',
  passwordsDiffer: 'Her du şîfre ne wekhev in.',
  next: 'Berdewam bike',
  back: 'Paşve',
  country: 'Welat (bijarte)',
  countryNone: 'Naxwazim bêjim',
  countryHint: 'Tenê welat tê tomarkirin — tu carî bajar an navnîşan. Tu dikarî paşê biguherînî.',
  languageHint: 'Zimanê sepanê û e-nameyên te: bi bişkokên zimên li jor.',
  consentIntro: 'Ji kerema xwe bixwîne û bipejirîne. Her sê jî ji bo hesabekî pêwîst in.',
  consentTerms: 'Ez şertên bikaranînê û polîtîkaya nepeniyê qebûl dikim.',
  consentSensitive:
    'Ez bi eşkere razî me ku EZIDINET daneyên min pêvajo bike, her çend endamtiya li platformeke civaka êzdî dikare girêdana olî an etnîkî eşkere bike (GDPR Xala 9).',
  consentAge: 'Ez herî kêm 16 salî me. (Zarok EZIDINET Kids bi rêya dêûbavên xwe bi kar tînin.)',
  consentWhat: 'Ev tê çi wateyê',
  consentDetails:
    'Heta tu bi xwe venekî, kes te di lêgerînê de nabîne. Cih tenê asta welat e. Kes ol an eslê te ji daneyên te dernaxe. Tu dikarî her dem daneyên xwe dakêşî an jê bibî û razîbûnê paşve bikişînî. Ev nivîs heta kontrola hiqûqî reşnivîs in.',
  createAccount: 'Hesab biafirîne',
  forgot: 'Şîfre ji bîr kir?',
  forgotTitle: 'Şîfreyê nû bike',
  forgotIntro: 'Navnîşana e-nameya xwe binivîse. Heke hesab hebe, em girêdanekê ji bo şîfreyeke nû dişînin.',
  sendLink: 'Girêdanê bişîne',
  forgotSent: 'Heke ji bo vê navnîşanê hesab hebe, girêdan tê şandin. 1 saet derbasdar e.',
  backToLogin: 'Vegere têketinê',
  tooMany: 'Gelek hewldanên şaş. Piştî {m} deqeyan dîsa biceribîne.',
  emailTaken: 'Bi vê e-nameyê hesabek heye. Têkeve an şîfreyê nû bike.',
  pwTooShort: 'Şîfre herî kêm 10 tîpan dixwaze.',
  pwCommon: 'Ev şîfre pir belav e. Yeke din hilbijêre.',
  pwEmail: 'Divê şîfre navnîşana e-nameya te tê de nebe.',
  verifyBanner: 'Ji kerema xwe e-nameya xwe bipejirîne. Me girêdanek şand {email}.',
  resend: 'Dîsa bişîne',
  resent: 'Girêdaneke nû hat şandin.',
  devMailbox: 'Qutiya posteyê ya pêşdebiran',
  devMailboxNote: 'Guhertoya ceribandinê ya herêmî: e-name naçin înternetê, li vir xuya dikin.',
  verifying: 'E-nameya te tê pejirandin…',
  verified: 'E-nameya te hat pejirandin. Spas!',
  linkInvalid: 'Ev girêdan ne derbasdar e an jî dema wê qediyaye. Yeke nû bixwaze.',
  toApp: 'Here EZIDINET',
  resetTitle: 'Şîfreyeke nû hilbijêre',
  savePassword: 'Şîfreya nû tomar bike',
  resetDone: 'Şîfreya te hat guhertin û ji hemû amûran derketin hat kirin. Bi şîfreya nû têkeve.',
  sessionEnded: 'Danişîna te qediya. Ji kerema xwe dîsa têkeve.',
  logoutAll: 'Ji hemû amûran derkeve',
  noMessages: 'Hîn peyam tune.',
  open: 'Veke',
};

export const AUTH_DICTS: Record<Locale, AuthDict> = { en, de, ar, ku };

export function useAuthText() {
  const { locale } = useI18n();
  return AUTH_DICTS[locale] ?? en;
}

export const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

/** 0 too short · 1 weak · 2 good · 3 strong — a guide for the person, the server enforces the real rules. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 10) return 0;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  const words = pw.trim().split(/[\s\-_.]+/).filter(Boolean).length;
  if (pw.length >= 16 || (pw.length >= 12 && (classes >= 3 || words >= 3))) return 3;
  if (pw.length >= 12 || classes >= 2) return 2;
  return 1;
}

/** Countries first by where Yazidi communities live (TARGET_MARKETS.md), then all other ISO 3166 codes. */
export const PRIORITY_COUNTRIES = ['DE', 'IQ', 'SY', 'TR', 'AM', 'GE', 'RU', 'SE', 'NL', 'BE', 'FR', 'AT', 'CH', 'DK', 'GB', 'US', 'CA', 'AU'];
export const ALL_COUNTRIES = (
  'AD AE AF AG AI AL AM AO AR AT AU AW AZ BA BB BD BE BF BG BH BI BJ BM BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ ' +
  'DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FO FR GA GB GD GE GH GI GL GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP ' +
  'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP ' +
  'NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW ' +
  'TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW'
).split(' ');

export function countryName(code: string, locale: Locale): string {
  try {
    // Kurmanji is not available in every browser's region names; English is the fallback.
    const dn = new Intl.DisplayNames([locale === 'ku' ? 'ku' : locale, 'en'], { type: 'region' });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}
