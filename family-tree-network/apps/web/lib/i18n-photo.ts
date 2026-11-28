'use client';

import { useI18n, type Locale } from './i18n';

const en = {
  photoTitle: 'My profile photo',
  photoHelp: 'A clear photo helps your family recognise you. Location data hidden in photos is removed automatically.',
  takePhoto: 'Take a photo',
  choosePhoto: 'Choose from gallery',
  changePhoto: 'Change photo',
  removePhoto: 'Remove photo',
  editTitle: 'Adjust your photo',
  editHelp: 'Drag to move, use the slider to zoom.',
  zoom: 'Zoom',
  save: 'Save photo',
  cancel: 'Cancel',
  saving: 'Saving…',
  whoSees: 'Who can see my photo',
  visPUBLIC: 'Everyone on EZIDINET',
  visNETWORK: 'My connections (recommended)',
  visFAMILY: 'Family only',
  visPRIVATE: 'Only me',
  photoError: 'This photo could not be used. Choose a JPEG or PNG photo.',
  photoSaved: 'Photo saved.',
};
export type PhotoDict = typeof en;

const de: PhotoDict = {
  photoTitle: 'Mein Profilfoto',
  photoHelp: 'Ein klares Foto hilft deiner Familie, dich zu erkennen. In Fotos versteckte Standortdaten werden automatisch entfernt.',
  takePhoto: 'Foto aufnehmen',
  choosePhoto: 'Aus Galerie wählen',
  changePhoto: 'Foto ändern',
  removePhoto: 'Foto entfernen',
  editTitle: 'Foto anpassen',
  editHelp: 'Zum Verschieben ziehen, mit dem Regler zoomen.',
  zoom: 'Zoom',
  save: 'Foto speichern',
  cancel: 'Abbrechen',
  saving: 'Wird gespeichert…',
  whoSees: 'Wer mein Foto sehen kann',
  visPUBLIC: 'Alle auf EZIDINET',
  visNETWORK: 'Meine Verbindungen (empfohlen)',
  visFAMILY: 'Nur Familie',
  visPRIVATE: 'Nur ich',
  photoError: 'Dieses Foto kann nicht verwendet werden. Wähle ein JPEG- oder PNG-Foto.',
  photoSaved: 'Foto gespeichert.',
};

const ar: PhotoDict = {
  photoTitle: 'صورتي الشخصية',
  photoHelp: 'الصورة الواضحة تساعد عائلتك على التعرّف إليك. بيانات الموقع المخفية في الصور تُحذف تلقائياً.',
  takePhoto: 'التقاط صورة',
  choosePhoto: 'اختيار من المعرض',
  changePhoto: 'تغيير الصورة',
  removePhoto: 'حذف الصورة',
  editTitle: 'اضبط صورتك',
  editHelp: 'اسحب لتحريك الصورة، واستخدم الشريط للتكبير.',
  zoom: 'تكبير',
  save: 'حفظ الصورة',
  cancel: 'إلغاء',
  saving: 'جارٍ الحفظ…',
  whoSees: 'من يستطيع رؤية صورتي',
  visPUBLIC: 'الجميع في EZIDINET',
  visNETWORK: 'المرتبطون بي (موصى به)',
  visFAMILY: 'العائلة فقط',
  visPRIVATE: 'أنا فقط',
  photoError: 'تعذّر استخدام هذه الصورة. اختر صورة بصيغة JPEG أو PNG.',
  photoSaved: 'تم حفظ الصورة.',
};

// Kurmanji: draft for native review.
const ku: PhotoDict = {
  photoTitle: 'Wêneyê min ê profîlê',
  photoHelp: 'Wêneyekî zelal alîkariya malbata te dike ku te nas bike. Daneyên cihê yên veşartî di wêneyan de bixweber têne jêbirin.',
  takePhoto: 'Wêne bikişîne',
  choosePhoto: 'Ji galeriyê hilbijêre',
  changePhoto: 'Wêneyê biguherîne',
  removePhoto: 'Wêneyê jê bibe',
  editTitle: 'Wêneyê xwe eyar bike',
  editHelp: 'Ji bo livandinê bikişîne, bi şirîtê mezin bike.',
  zoom: 'Mezinkirin',
  save: 'Wêneyê tomar bike',
  cancel: 'Betal bike',
  saving: 'Tê tomarkirin…',
  whoSees: 'Kî dikare wêneyê min bibîne',
  visPUBLIC: 'Hemû li ser EZIDINET',
  visNETWORK: 'Girêdanên min (tê pêşniyarkirin)',
  visFAMILY: 'Tenê malbat',
  visPRIVATE: 'Tenê ez',
  photoError: 'Ev wêne nayê bikaranîn. Wêneyekî JPEG an PNG hilbijêre.',
  photoSaved: 'Wêne hat tomarkirin.',
};

export const PHOTO_DICTS: Record<Locale, PhotoDict> = { en, de, ar, ku };
export function usePhotoText() {
  const { locale } = useI18n();
  return PHOTO_DICTS[locale] ?? en;
}
