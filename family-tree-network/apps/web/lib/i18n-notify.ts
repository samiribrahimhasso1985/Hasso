'use client';

import { useI18n, type Locale } from './i18n';

type Fn = (name: string) => string;
interface NotifyDict {
  title: string;
  open: string;
  empty: string;
  markAll: string;
  more: string;
  settings: string;
  back: string;
  someone: string;
  types: Record<string, Fn>;
  categories: Record<string, string>;
  receive: string;
  dnd: string;
  dndOff: string;
  dnd1h: string;
  dnd8h: string;
  dndActive: (until: string) => string;
  quiet: string;
  quietFrom: string;
  quietTo: string;
  quietOff: string;
  quietSave: string;
  silentNote: string;
  saved: string;
  pushLater: string;
}

const en: NotifyDict = {
  title: 'Notifications',
  open: 'Open notifications',
  empty: 'No notifications yet.',
  markAll: 'Mark all as read',
  more: 'Show older',
  settings: 'Settings',
  back: 'Back',
  someone: 'Someone',
  types: {
    FRIEND_REQUEST: (n) => `${n} sent you a friend request.`,
    FRIEND_ACCEPTED: (n) => `${n} accepted your friend request.`,
    NEW_FOLLOWER: (n) => `${n} started following you.`,
    RELATIONSHIP_REQUEST: (n) => `${n} added a relationship that waits for your confirmation.`,
    RELATIONSHIP_CONFIRMED: (n) => `${n} confirmed your relationship.`,
  },
  categories: { FRIENDS: 'Friend requests and answers', FOLLOWS: 'New followers', RELATIONSHIPS: 'Family and other relationships' },
  receive: 'Notify me about',
  dnd: 'Do not disturb',
  dndOff: 'Off',
  dnd1h: '1 hour',
  dnd8h: '8 hours',
  dndActive: (u) => `On until ${u}`,
  quiet: 'Quiet hours (every day)',
  quietFrom: 'From',
  quietTo: 'To',
  quietOff: 'Turn off',
  quietSave: 'Save quiet hours',
  silentNote: 'During quiet hours and do-not-disturb, notifications are still kept here — they just arrive silently.',
  saved: 'Saved.',
  pushLater: 'Notifications on your phone’s lock screen (push) will follow in a later step.',
};

const de: NotifyDict = {
  title: 'Benachrichtigungen',
  open: 'Benachrichtigungen öffnen',
  empty: 'Noch keine Benachrichtigungen.',
  markAll: 'Alle als gelesen markieren',
  more: 'Ältere anzeigen',
  settings: 'Einstellungen',
  back: 'Zurück',
  someone: 'Jemand',
  types: {
    FRIEND_REQUEST: (n) => `${n} hat dir eine Freundschaftsanfrage gesendet.`,
    FRIEND_ACCEPTED: (n) => `${n} hat deine Freundschaftsanfrage angenommen.`,
    NEW_FOLLOWER: (n) => `${n} folgt dir jetzt.`,
    RELATIONSHIP_REQUEST: (n) => `${n} hat eine Beziehung eingetragen, die auf deine Bestätigung wartet.`,
    RELATIONSHIP_CONFIRMED: (n) => `${n} hat eure Beziehung bestätigt.`,
  },
  categories: { FRIENDS: 'Freundschaftsanfragen und Antworten', FOLLOWS: 'Neue Follower', RELATIONSHIPS: 'Familie und andere Beziehungen' },
  receive: 'Benachrichtige mich über',
  dnd: 'Nicht stören',
  dndOff: 'Aus',
  dnd1h: '1 Stunde',
  dnd8h: '8 Stunden',
  dndActive: (u) => `An bis ${u}`,
  quiet: 'Ruhezeiten (täglich)',
  quietFrom: 'Von',
  quietTo: 'Bis',
  quietOff: 'Ausschalten',
  quietSave: 'Ruhezeiten speichern',
  silentNote: 'Während Ruhezeiten und „Nicht stören“ bleiben Benachrichtigungen hier erhalten — sie kommen nur still an.',
  saved: 'Gespeichert.',
  pushLater: 'Benachrichtigungen auf dem Sperrbildschirm des Handys (Push) folgen in einem späteren Schritt.',
};

const ar: NotifyDict = {
  title: 'الإشعارات',
  open: 'فتح الإشعارات',
  empty: 'لا توجد إشعارات بعد.',
  markAll: 'تعليم الكل كمقروء',
  more: 'عرض الأقدم',
  settings: 'الإعدادات',
  back: 'رجوع',
  someone: 'شخص ما',
  types: {
    FRIEND_REQUEST: (n) => `أرسل لك ${n} طلب صداقة.`,
    FRIEND_ACCEPTED: (n) => `قبل ${n} طلب صداقتك.`,
    NEW_FOLLOWER: (n) => `بدأ ${n} بمتابعتك.`,
    RELATIONSHIP_REQUEST: (n) => `أضاف ${n} علاقة بانتظار تأكيدك.`,
    RELATIONSHIP_CONFIRMED: (n) => `أكّد ${n} علاقتكما.`,
  },
  categories: { FRIENDS: 'طلبات الصداقة والردود عليها', FOLLOWS: 'متابعون جدد', RELATIONSHIPS: 'العائلة والعلاقات الأخرى' },
  receive: 'أعلمني عن',
  dnd: 'عدم الإزعاج',
  dndOff: 'إيقاف',
  dnd1h: 'ساعة',
  dnd8h: '8 ساعات',
  dndActive: (u) => `مفعّل حتى ${u}`,
  quiet: 'ساعات الهدوء (يومياً)',
  quietFrom: 'من',
  quietTo: 'إلى',
  quietOff: 'إيقاف',
  quietSave: 'حفظ ساعات الهدوء',
  silentNote: 'خلال ساعات الهدوء وعدم الإزعاج تبقى الإشعارات محفوظة هنا — لكنها تصل بصمت.',
  saved: 'تم الحفظ.',
  pushLater: 'الإشعارات على شاشة قفل الهاتف (Push) ستأتي في خطوة لاحقة.',
};

const ku: NotifyDict = {
  title: 'Agahdarî',
  open: 'Agahdariyan veke',
  empty: 'Hîn agahdarî tune.',
  markAll: 'Hemûyan wek xwendî nîşan bide',
  more: 'Yên kevntir nîşan bide',
  settings: 'Mîheng',
  back: 'Vegere',
  someone: 'Yek',
  types: {
    FRIEND_REQUEST: (n) => `${n} daxwaza hevaltiyê ji te re şand.`,
    FRIEND_ACCEPTED: (n) => `${n} daxwaza te ya hevaltiyê qebûl kir.`,
    NEW_FOLLOWER: (n) => `${n} dest bi şopandina te kir.`,
    RELATIONSHIP_REQUEST: (n) => `${n} têkiliyek zêde kir ku li benda erêkirina te ye.`,
    RELATIONSHIP_CONFIRMED: (n) => `${n} têkiliya we erê kir.`,
  },
  categories: { FRIENDS: 'Daxwazên hevaltiyê û bersiv', FOLLOWS: 'Şopînerên nû', RELATIONSHIPS: 'Malbat û têkiliyên din' },
  receive: 'Min agahdar bike li ser',
  dnd: 'Aciz neke',
  dndOff: 'Girtî',
  dnd1h: '1 saet',
  dnd8h: '8 saet',
  dndActive: (u) => `Vekirî heta ${u}`,
  quiet: 'Demên bêdeng (her roj)',
  quietFrom: 'Ji',
  quietTo: 'Heta',
  quietOff: 'Bigire',
  quietSave: 'Demên bêdeng tomar bike',
  silentNote: 'Di demên bêdeng û «aciz neke» de agahdarî li vir tên parastin — tenê bêdeng tên.',
  saved: 'Hat tomarkirin.',
  pushLater: 'Agahdariyên li ser ekrana kilîtkirî ya telefonê (push) dê di gaveke paşê de bên.',
};

export const NOTIFY_DICTS: Record<Locale, NotifyDict> = { en, de, ar, ku };
export function useNotifyText() {
  const { locale } = useI18n();
  return NOTIFY_DICTS[locale] ?? en;
}
