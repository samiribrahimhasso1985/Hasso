'use client';

import { useI18n, type Locale } from './i18n';

const en = {
  scanButton: 'Scan a QR code',
  scanTitle: 'Scan an EZIDINET code',
  scanHelp: 'Point the camera at the person’s EZIDINET QR code. Scanning only opens their page — nothing is connected until you send a request and they accept.',
  scanStarting: 'Starting the camera…',
  scanNoCamera: 'The camera is not available here (it needs a secure https address and your permission). Choose a photo of the code instead.',
  scanDenied: 'Camera access was not allowed. You can allow it in the browser settings, or choose a photo of the code.',
  scanPhoto: 'Choose a photo of the code',
  scanNotEzid: 'This QR code is not an EZIDINET connection code.',
  scanNothing: 'No QR code was found in this photo.',
  scanFound: 'Code found — opening…',
  close: 'Close',
};
export type ScanDict = typeof en;

const de: ScanDict = {
  scanButton: 'QR-Code scannen',
  scanTitle: 'EZIDINET-Code scannen',
  scanHelp: 'Richte die Kamera auf den EZIDINET-QR-Code der Person. Das Scannen öffnet nur ihre Seite — verbunden wird erst, wenn du eine Anfrage sendest und sie zustimmt.',
  scanStarting: 'Kamera wird gestartet…',
  scanNoCamera: 'Die Kamera ist hier nicht verfügbar (sie braucht eine sichere https-Adresse und deine Erlaubnis). Wähle stattdessen ein Foto des Codes.',
  scanDenied: 'Der Kamerazugriff wurde nicht erlaubt. Du kannst ihn in den Browser-Einstellungen erlauben oder ein Foto des Codes wählen.',
  scanPhoto: 'Foto des Codes wählen',
  scanNotEzid: 'Dieser QR-Code ist kein EZIDINET-Verbindungscode.',
  scanNothing: 'In diesem Foto wurde kein QR-Code gefunden.',
  scanFound: 'Code gefunden — wird geöffnet…',
  close: 'Schließen',
};

const ar: ScanDict = {
  scanButton: 'مسح رمز QR',
  scanTitle: 'مسح رمز EZIDINET',
  scanHelp: 'وجّه الكاميرا إلى رمز QR الخاص بالشخص. المسح يفتح صفحته فقط — لا يتم أي ربط حتى ترسل طلباً ويوافق عليه.',
  scanStarting: 'جارٍ تشغيل الكاميرا…',
  scanNoCamera: 'الكاميرا غير متاحة هنا (تحتاج عنواناً آمناً https وإذنك). اختر صورة للرمز بدلاً من ذلك.',
  scanDenied: 'لم يُسمح باستخدام الكاميرا. يمكنك السماح بها من إعدادات المتصفح، أو اختيار صورة للرمز.',
  scanPhoto: 'اختر صورة للرمز',
  scanNotEzid: 'هذا الرمز ليس رمز تواصل من EZIDINET.',
  scanNothing: 'لم يُعثر على رمز QR في هذه الصورة.',
  scanFound: 'تم العثور على الرمز — جارٍ الفتح…',
  close: 'إغلاق',
};

// Kurmanji: draft for native review.
const ku: ScanDict = {
  scanButton: 'Koda QR bixwîne',
  scanTitle: 'Koda EZIDINET bixwîne',
  scanHelp: 'Kamerayê ber bi koda QR ya EZIDINET a kesê ve bike. Xwendin tenê rûpela wî vedike — heta tu daxwazekê neşînî û ew qebûl neke, tu girêdan çênabe.',
  scanStarting: 'Kamera dest pê dike…',
  scanNoCamera: 'Kamera li vir ne berdest e (navnîşaneke ewle ya https û destûra te dixwaze). Li şûna wê wêneyekî kodê hilbijêre.',
  scanDenied: 'Destûra kamerayê nehat dayîn. Tu dikarî di mîhengên gerokê de destûrê bidî, an wêneyekî kodê hilbijêrî.',
  scanPhoto: 'Wêneyekî kodê hilbijêre',
  scanNotEzid: 'Ev koda QR ne koda girêdanê ya EZIDINET e.',
  scanNothing: 'Di vî wêneyî de koda QR nehat dîtin.',
  scanFound: 'Kod hat dîtin — tê vekirin…',
  close: 'Bigire',
};

export const SCAN_DICTS: Record<Locale, ScanDict> = { en, de, ar, ku };
export function useScanText() {
  const { locale } = useI18n();
  return SCAN_DICTS[locale] ?? en;
}
