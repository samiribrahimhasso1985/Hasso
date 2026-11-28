import type { WorldLocale } from './places';

/**
 * "From here the story began" — historical photographs supplied by the product owner (2026-11-28).
 * Backgrounds removed for the 3D scene; the card always shows the untouched original (with any watermark).
 * Names, places, dates and photographers are NOT known here and are never invented: families who recognise
 * someone can add their story later (with consent and review). Sources and publication rights: to be confirmed.
 */
export interface StoryPortrait {
  id: string;
  cutout: string | null; // background removed (null: shown as an archival plate)
  original: string;
  height: number; // size in the 3D scene (world units)
  credit?: string; // visible credit (watermark on the original)
}

const base = '/world/story';
export const STORY: StoryPortrait[] = [
  { id: 'p5', cutout: `${base}/p5.webp`, original: `${base}/p5-original.jpg`, height: 1.45 },
  { id: 'p7', cutout: `${base}/p7.webp`, original: `${base}/p7-original.jpg`, height: 1.5 },
  { id: 'p1', cutout: `${base}/p1.webp`, original: `${base}/p1-original.jpg`, height: 1.6 },
  { id: 'p3', cutout: `${base}/p3.webp`, original: `${base}/p3-original.jpg`, height: 1.8 },
  { id: 'p9', cutout: `${base}/p9.webp`, original: `${base}/p9-original.jpg`, height: 1.6 },
  { id: 'p4', cutout: `${base}/p4.webp`, original: `${base}/p4-original.jpg`, height: 1.45 },
  { id: 'p2', cutout: `${base}/p2.webp`, original: `${base}/p2-original.jpg`, height: 1.35 },
  { id: 'p6', cutout: `${base}/p6.webp`, original: `${base}/p6-original.jpg`, height: 1.45, credit: 'Yezidi Photo Archive' },
];
export const SHRINE = { id: 'p8', plate: `${base}/shrine.webp`, original: `${base}/p8-original.jpg` };

type T = Record<WorldLocale, string>;
const n = (en: string, de: string, ar: string, ku: string): T => ({ en, de, ar, ku });

export const STORY_TEXT = {
  caption: n('FROM HERE THE STORY BEGAN', 'HIER BEGANN DIE GESCHICHTE', 'من هنا بدأت القصة', 'ÇÎROK JI VIR DEST PÊ KIR'),
  button: n('The story', 'Die Geschichte', 'القصة', 'Çîrok'),
  intro: n(
    'Faces of Yazidi life, photographed generations ago in villages at the foot of the mountains. They carried the memory, the language and the traditions of their people through hard times — and from them the roots grew to every place in the world where Yazidis live today.',
    'Gesichter ezidischen Lebens, vor Generationen in Dörfern am Fuß der Berge fotografiert. Sie trugen die Erinnerung, die Sprache und die Traditionen ihres Volkes durch schwere Zeiten — und von ihnen wuchsen die Wurzeln an jeden Ort der Welt, an dem Eziden heute leben.',
    'وجوه من الحياة الإيزيدية، التُقطت صورها قبل أجيال في قرى عند سفوح الجبال. حملوا ذاكرة شعبهم ولغته وتقاليده عبر أزمنة صعبة — ومنهم امتدت الجذور إلى كل مكان في العالم يعيش فيه الإيزيديون اليوم.',
    'Rûyên jiyana êzdiyan, berî çend nifşan li gundên li binê çiyan hatine kişandin. Wan bîranîn, ziman û kevneşopiyên gelê xwe di demên dijwar re derbas kirin — û ji wan kok gihîştin her cihê cîhanê ku êzdî îro lê dijîn.',
  ),
  unknown: n(
    'The names of these people, the places and the dates of the photographs are not recorded here yet. If you recognise someone, you will be able to help add their story — with the family’s consent.',
    'Namen, Orte und Daten dieser Aufnahmen sind hier noch nicht erfasst. Wenn du jemanden erkennst, kannst du künftig helfen, seine Geschichte hinzuzufügen — mit Einwilligung der Familie.',
    'أسماء هؤلاء الأشخاص وأماكن التصوير وتواريخه غير مسجلة هنا بعد. إن عرفت أحداً منهم، ستتمكن من المساعدة في إضافة قصته — بموافقة عائلته.',
    'Nav, cih û dîrokên van wêneyan hîn li vir nehatine tomarkirin. Heke tu kesekî nas dikî, tu yê bikaribî alîkariyê bikî ku çîroka wî zêde bibe — bi razîbûna malbatê.',
  ),
  rights: n(
    'Historical photographs. Sources and publication rights are being confirmed.',
    'Historische Fotografien. Quellen und Veröffentlichungsrechte werden geprüft.',
    'صور تاريخية. يجري التحقق من مصادرها وحقوق نشرها.',
    'Wêneyên dîrokî. Çavkanî û mafên weşanê têne kontrolkirin.',
  ),
  photo: n('Historical photograph', 'Historische Fotografie', 'صورة تاريخية', 'Wêneyê dîrokî'),
  credit: n('Credit', 'Quelle', 'المصدر', 'Çavkanî'),
  all: n('All photographs', 'Alle Fotografien', 'كل الصور', 'Hemû wêne'),
};
