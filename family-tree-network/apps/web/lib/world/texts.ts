import type { WorldLocale } from './places';

type T = Record<WorldLocale, string>;
const n = (en: string, de: string, ar: string, ku: string): T => ({ en, de, ar, ku });

export const WT = {
  kicker: n('EZIDINET WORLD', 'EZIDINET WORLD', 'EZIDINET WORLD', 'EZIDINET WORLD'),
  title: n('FROM SINJAR TO THE WORLD', 'VON SINDSCHAR IN DIE WELT', 'من سنجار إلى العالم', 'JI ŞINGALÊ BO CÎHANÊ'),
  tagline: n(
    'From the roots of Sinjar to the world, one network connects us.',
    'Von den Wurzeln Sindschars in die Welt verbindet uns ein Netzwerk.',
    'من جذور سنجار إلى العالم، تجمعنا شبكة واحدة',
    'Ji kokên Şingalê heta cîhanê, torek me digihîne hev.',
  ),
  explore: n('EXPLORE THE WORLD', 'WELT ENTDECKEN', 'استكشف العالم', 'CÎHANÊ BIGERE'),
  communities: n('ALL COUNTRIES', 'ALLE LÄNDER', 'جميع الدول', 'HEMÛ WELAT'),
  heritage: n('EXPLORE HERITAGE', 'KULTURERBE ENTDECKEN', 'استكشف التراث', 'MÎRATÊ BIGERE'),
  join: n('JOIN EZIDINET', 'EZIDINET BEITRETEN', 'انضم إلى EZIDINET', 'BIBE ENDAMÊ EZIDINET'),
  sinjar: n('Sinjar', 'Sindschar', 'سنجار', 'Şingal'),
  overview: n('Whole view', 'Gesamtansicht', 'المشهد كاملاً', 'Dîtina tevahî'),
  homeland: n('Homeland', 'Heimat', 'الموطن', 'Welat'),
  diaspora: n('Community abroad', 'Gemeinschaft im Ausland', 'جالية في المهجر', 'Civaka li derveyî welat'),
  draft: n('Draft — to be reviewed by the community', 'Entwurf — wird von der Gemeinschaft geprüft', 'مسودة — بانتظار مراجعة المجتمع', 'Reşnivîs — civak dê kontrol bike'),
  story: n('The story of this place', 'Die Geschichte dieses Ortes', 'حكاية هذا المكان', 'Çîroka vî cihî'),
  storySoon: n('Stories, photos and recordings of this place will be added by the community, with consent and review.', 'Geschichten, Fotos und Aufnahmen dieses Ortes fügt die Gemeinschaft hinzu — mit Einwilligung und Prüfung.', 'ستضيف الجالية حكايات هذا المكان وصوره وتسجيلاته، بموافقة أصحابها وبعد المراجعة.', 'Çîrok, wêne û tomarên vî cihî dê ji aliyê civakê ve bi razîbûn û kontrolê werin zêdekirin.'),
  onEzidinet: n('On EZIDINET', 'Auf EZIDINET', 'على EZIDINET', 'Li ser EZIDINET'),
  noCommunities: n('No public communities, events or institutions here yet. They will appear as soon as members publish them.', 'Hier gibt es noch keine öffentlichen Gemeinschaften, Veranstaltungen oder Einrichtungen. Sie erscheinen, sobald Mitglieder sie veröffentlichen.', 'لا توجد هنا بعد مجتمعات أو فعاليات أو مؤسسات عامة. ستظهر فور نشرها من الأعضاء.', 'Li vir hîn civak, çalakî an saziyên giştî tune ne. Dema endam wan biweşînin dê xuya bibin.'),
  privacy: n('Only places and public communities are shown — never where members live.', 'Gezeigt werden nur Orte und öffentliche Gemeinschaften — nie, wo Mitglieder wohnen.', 'تُعرض الأماكن والمجتمعات العامة فقط — ولا يُعرض أبداً مكان سكن الأعضاء.', 'Tenê cih û civakên giştî têne nîşandan — tu carî ne cihê ku endam lê dijîn.'),
  close: n('Close', 'Schließen', 'إغلاق', 'Bigire'),
  places: n('Places of Yazidi life', 'Orte ezidischen Lebens', 'أماكن الحياة الإيزيدية', 'Cihên jiyana êzdiyan'),
  country: n('Country', 'Land', 'دولة', 'Welat'),
  yazidiPlaces: n('Yazidi places in this country', 'Ezidische Orte in diesem Land', 'أماكن إيزيدية في هذه الدولة', 'Cihên êzdiyan li vî welatî'),
  noPlacesYet: n('No Yazidi places are recorded for this country yet. Members will be able to suggest places for review.', 'Für dieses Land sind noch keine ezidischen Orte erfasst. Mitglieder können künftig Orte zur Prüfung vorschlagen.', 'لم تُسجَّل بعد أماكن إيزيدية لهذه الدولة. سيتمكن الأعضاء من اقتراح أماكن للمراجعة.', 'Ji bo vî welatî hîn cihên êzdiyan nehatine tomarkirin. Endam dê bikaribin cihan ji bo kontrolê pêşniyar bikin.'),
  withYazidi: n('Countries with Yazidi places', 'Länder mit ezidischen Orten', 'دول فيها أماكن إيزيدية', 'Welatên bi cihên êzdiyan'),
  allCountries: n('All countries of the world', 'Alle Länder der Welt', 'جميع دول العالم', 'Hemû welatên cîhanê'),
  searchCountry: n('Search a country…', 'Land suchen…', 'ابحث عن دولة…', 'Li welatekî bigere…'),
  placesShort: n('places', 'Orte', 'أماكن', 'cih'),
  countries: n('Countries', 'Länder', 'الدول', 'Welat'),
  hint: n('Drag to turn · pinch or scroll to zoom · tap a country or a light', 'Ziehen zum Drehen · zoomen mit zwei Fingern oder Mausrad · Land oder Licht antippen', 'اسحب للتدوير · كبّر بإصبعين أو بعجلة الفأرة · اضغط على دولة أو نقطة ضوء', 'Bikişîne da bizivire · bi du tiliyan mezin bike · li welatekî an ronahiyekê bitikîne'),
  noWebgl: n('This device cannot show the 3D scene. Here are the places of Yazidi life:', 'Dieses Gerät kann die 3D-Szene nicht anzeigen. Hier sind die Orte ezidischen Lebens:', 'لا يستطيع هذا الجهاز عرض المشهد ثلاثي الأبعاد. هذه أماكن الحياة الإيزيدية:', 'Ev amûr nikare dîmena 3D nîşan bide. Ev cihên jiyana êzdiyan in:'),
  preview: n('Preview for review — not yet on the home page', 'Vorschau zur Prüfung — noch nicht auf der Startseite', 'معاينة للمراجعة — ليست على الصفحة الرئيسية بعد', 'Pêşdîtin ji bo kontrolê — hîn ne li ser rûpela sereke'),
};
