/**
 * EZIDINET WORLD — places where Yazidi communities live or have lived.
 * DRAFT for review by the cultural review group (Q-1): names and short notes only, no numbers, no claims about
 * individuals. Coordinates are city/region centres (never homes). Each place is one light on the globe.
 */
export type WorldLocale = 'en' | 'de' | 'ar' | 'ku';
type T = Record<WorldLocale, string>;

export interface WorldPlace {
  id: string;
  name: T;
  country: string; // ISO 3166-1 alpha-2
  lat: number;
  lon: number;
  kind: 'homeland' | 'diaspora';
  note: T;
}

const homeland: T = {
  en: 'Historic homeland of Yazidi life.',
  de: 'Historische Heimat ezidischen Lebens.',
  ar: 'موطن تاريخي للحياة الإيزيدية.',
  ku: 'Welatê dîrokî yê jiyana êzdiyan.',
};
const community: T = {
  en: 'Home to a Yazidi community today.',
  de: 'Heute Heimat einer ezidischen Gemeinschaft.',
  ar: 'تعيش فيها اليوم جالية إيزيدية.',
  ku: 'Îro civakeke êzdî li vir dijî.',
};
const n = (en: string, de: string, ar: string, ku: string): T => ({ en, de, ar, ku });

export const SINJAR = { lat: 36.32, lon: 41.87 };

export const PLACES: WorldPlace[] = [
  { id: 'sinjar', name: n('Sinjar (Shingal)', 'Sindschar (Şingal)', 'سنجار (شنگال)', 'Şingal'), country: 'IQ', ...SINJAR, kind: 'homeland',
    note: n('The Sinjar mountains: a heartland of Yazidi life and the root of this tree.', 'Das Sindschar-Gebirge: ein Kernland ezidischen Lebens und die Wurzel dieses Baumes.', 'جبال سنجار: قلب الحياة الإيزيدية وجذر هذه الشجرة.', 'Çiyayê Şingalê: dilê jiyana êzdiyan û koka vê darê.') },
  { id: 'lalish', name: n('Lalish', 'Lalisch', 'لالش', 'Laliş'), country: 'IQ', lat: 36.77, lon: 43.3, kind: 'homeland',
    note: n('Valley of the most sacred Yazidi temple.', 'Tal des heiligsten ezidischen Heiligtums.', 'وادي أقدس معبد إيزيدي.', 'Geliyê perestgeha herî pîroz a êzdiyan.') },
  { id: 'sheikhan', name: n('Sheikhan', 'Schaichan', 'الشيخان', 'Şêxan'), country: 'IQ', lat: 36.69, lon: 43.35, kind: 'homeland', note: homeland },
  { id: 'bashiqa', name: n('Bashiqa & Bahzani', 'Baschiqa & Bahzani', 'بعشيقة وبحزاني', 'Başîqa û Behzanê'), country: 'IQ', lat: 36.45, lon: 43.35, kind: 'homeland', note: homeland },
  { id: 'duhok', name: n('Duhok', 'Dohuk', 'دهوك', 'Duhok'), country: 'IQ', lat: 36.87, lon: 42.99, kind: 'homeland', note: community },
  { id: 'khanke', name: n('Khanke', 'Khanke', 'خانكي', 'Xanikê'), country: 'IQ', lat: 36.96, lon: 42.73, kind: 'homeland', note: community },
  { id: 'zakho', name: n('Zakho', 'Zakho', 'زاخو', 'Zaxo'), country: 'IQ', lat: 37.14, lon: 42.68, kind: 'homeland', note: community },
  { id: 'sharya', name: n('Sharya', 'Scharia', 'شاريا', 'Şarya'), country: 'IQ', lat: 36.83, lon: 43.05, kind: 'homeland', note: community },
  { id: 'afrin', name: n('Afrin', 'Afrin', 'عفرين', 'Efrîn'), country: 'SY', lat: 36.51, lon: 36.87, kind: 'homeland', note: homeland },
  { id: 'jazira', name: n('Jazira (Hasakah region)', 'Dschazira (Region Hasaka)', 'الجزيرة (منطقة الحسكة)', 'Cizîr (herêma Hesekê)'), country: 'SY', lat: 36.9, lon: 41.0, kind: 'homeland', note: homeland },
  { id: 'midyat', name: n('Midyat (Mardin)', 'Midyat (Mardin)', 'مديات (ماردين)', 'Midyad (Mêrdîn)'), country: 'TR', lat: 37.42, lon: 41.34, kind: 'homeland', note: homeland },
  { id: 'viransehir', name: n('Viranşehir', 'Viranşehir', 'ويران شهر', 'Wêranşar'), country: 'TR', lat: 37.23, lon: 39.76, kind: 'homeland', note: homeland },
  { id: 'batman', name: n('Batman (Beşiri)', 'Batman (Beşiri)', 'باطمان (بشيري)', 'Êlih (Qubînê)'), country: 'TR', lat: 37.92, lon: 41.29, kind: 'homeland', note: homeland },
  { id: 'aknalich', name: n('Aknalich', 'Aknalitsch', 'أكناليج', 'Aknaliç'), country: 'AM', lat: 40.15, lon: 44.17, kind: 'diaspora',
    note: n('Site of the large Yazidi temple Quba Mêrê Dîwanê.', 'Ort des großen ezidischen Tempels Quba Mêrê Dîwanê.', 'موقع المعبد الإيزيدي الكبير «قوبا ميري ديوانه».', 'Cihê perestgeha mezin a êzdiyan Quba Mêrê Dîwanê.') },
  { id: 'yerevan', name: n('Yerevan', 'Jerewan', 'يريفان', 'Rewan'), country: 'AM', lat: 40.18, lon: 44.51, kind: 'diaspora', note: community },
  { id: 'aragatsotn', name: n('Aragatsotn province', 'Provinz Aragazotn', 'محافظة أراغاتسوتن', 'Herêma Aragatsotn'), country: 'AM', lat: 40.52, lon: 44.2, kind: 'diaspora',
    note: n('Region with many Yazidi villages.', 'Region mit vielen ezidischen Dörfern.', 'منطقة فيها قرى إيزيدية كثيرة.', 'Herêmek bi gelek gundên êzdiyan.') },
  { id: 'tbilisi', name: n('Tbilisi', 'Tiflis', 'تبليسي', 'Tiflîs'), country: 'GE', lat: 41.72, lon: 44.79, kind: 'diaspora', note: community },
  { id: 'telavi', name: n('Telavi', 'Telawi', 'تيلافي', 'Telavî'), country: 'GE', lat: 41.92, lon: 45.48, kind: 'diaspora', note: community },
  { id: 'krasnodar', name: n('Krasnodar', 'Krasnodar', 'كراسنودار', 'Krasnodar'), country: 'RU', lat: 45.04, lon: 38.98, kind: 'diaspora', note: community },
  { id: 'moscow', name: n('Moscow', 'Moskau', 'موسكو', 'Moskova'), country: 'RU', lat: 55.76, lon: 37.62, kind: 'diaspora', note: community },
  { id: 'celle', name: n('Celle', 'Celle', 'تسيله', 'Celle'), country: 'DE', lat: 52.62, lon: 10.08, kind: 'diaspora', note: community },
  { id: 'oldenburg', name: n('Oldenburg', 'Oldenburg', 'أولدنبورغ', 'Oldenburg'), country: 'DE', lat: 53.14, lon: 8.21, kind: 'diaspora', note: community },
  { id: 'bielefeld', name: n('Bielefeld', 'Bielefeld', 'بيليفيلد', 'Bielefeld'), country: 'DE', lat: 52.02, lon: 8.53, kind: 'diaspora', note: community },
  { id: 'hannover', name: n('Hanover', 'Hannover', 'هانوفر', 'Hannover'), country: 'DE', lat: 52.37, lon: 9.73, kind: 'diaspora', note: community },
  { id: 'pforzheim', name: n('Pforzheim', 'Pforzheim', 'بفورتسهايم', 'Pforzheim'), country: 'DE', lat: 48.89, lon: 8.7, kind: 'diaspora', note: community },
  { id: 'bremen', name: n('Bremen', 'Bremen', 'بريمن', 'Bremen'), country: 'DE', lat: 53.08, lon: 8.8, kind: 'diaspora', note: community },
  { id: 'hamburg', name: n('Hamburg', 'Hamburg', 'هامبورغ', 'Hamburg'), country: 'DE', lat: 53.55, lon: 9.99, kind: 'diaspora', note: community },
  { id: 'netherlands', name: n('Netherlands', 'Niederlande', 'هولندا', 'Holenda'), country: 'NL', lat: 52.37, lon: 4.9, kind: 'diaspora', note: community },
  { id: 'belgium', name: n('Belgium', 'Belgien', 'بلجيكا', 'Belçîka'), country: 'BE', lat: 50.85, lon: 4.35, kind: 'diaspora', note: community },
  { id: 'france', name: n('France', 'Frankreich', 'فرنسا', 'Fransa'), country: 'FR', lat: 48.86, lon: 2.35, kind: 'diaspora', note: community },
  { id: 'sweden', name: n('Sweden', 'Schweden', 'السويد', 'Swêd'), country: 'SE', lat: 59.33, lon: 18.07, kind: 'diaspora', note: community },
  { id: 'lincoln', name: n('Lincoln, Nebraska', 'Lincoln, Nebraska', 'لينكولن، نبراسكا', 'Lincoln, Nebraska'), country: 'US', lat: 40.81, lon: -96.7, kind: 'diaspora', note: community },
  { id: 'houston', name: n('Houston', 'Houston', 'هيوستن', 'Houston'), country: 'US', lat: 29.76, lon: -95.37, kind: 'diaspora', note: community },
  { id: 'winnipeg', name: n('Winnipeg', 'Winnipeg', 'وينيبيغ', 'Winnipeg'), country: 'CA', lat: 49.9, lon: -97.14, kind: 'diaspora', note: community },
  { id: 'london-on', name: n('London, Ontario', 'London, Ontario', 'لندن، أونتاريو', 'London, Ontario'), country: 'CA', lat: 42.98, lon: -81.25, kind: 'diaspora', note: community },
  { id: 'toronto', name: n('Toronto', 'Toronto', 'تورونتو', 'Toronto'), country: 'CA', lat: 43.65, lon: -79.38, kind: 'diaspora', note: community },
  { id: 'toowoomba', name: n('Toowoomba', 'Toowoomba', 'توومبا', 'Toowoomba'), country: 'AU', lat: -27.56, lon: 151.95, kind: 'diaspora', note: community },
  { id: 'wagga', name: n('Wagga Wagga', 'Wagga Wagga', 'واغا واغا', 'Wagga Wagga'), country: 'AU', lat: -35.12, lon: 147.37, kind: 'diaspora', note: community },
];

/**
 * Short, general notes for countries with a known Yazidi presence. DRAFT for community review: no population
 * figures (none are shown until a verified source is approved), no statements about individuals.
 */
export const COUNTRY_NOTES: Record<string, T> = {
  IQ: n('Historic heartland of Yazidi life: the Sinjar mountains, Sheikhan and the valley of Lalish.',
    'Historisches Kernland ezidischen Lebens: das Sindschar-Gebirge, Schaichan und das Tal von Lalisch.',
    'الموطن التاريخي للحياة الإيزيدية: جبال سنجار والشيخان ووادي لالش.',
    'Welatê dîrokî yê jiyana êzdiyan: çiyayê Şingalê, Şêxan û geliyê Lalişê.'),
  SY: n('Historic Yazidi communities in the Afrin area and the Jazira region.',
    'Historische ezidische Gemeinschaften im Gebiet Afrin und in der Region Dschazira.',
    'مجتمعات إيزيدية تاريخية في منطقة عفرين وفي منطقة الجزيرة.',
    'Civakên êzdî yên dîrokî li herêma Efrînê û li Cizîrê.'),
  TR: n('Historic Yazidi villages in the southeast; many families later moved abroad, above all to Germany.',
    'Historische ezidische Dörfer im Südosten; viele Familien zogen später ins Ausland, vor allem nach Deutschland.',
    'قرى إيزيدية تاريخية في الجنوب الشرقي؛ هاجرت عائلات كثيرة لاحقاً، خصوصاً إلى ألمانيا.',
    'Gundên êzdiyan ên dîrokî li başûrê rojhilat; gelek malbat paşê çûn derveyî welat, bi taybetî Almanyayê.'),
  AM: n('Long-established Yazidi community, recognised as a national minority, with the temple Quba Mêrê Dîwanê in Aknalich.',
    'Seit Langem ansässige ezidische Gemeinschaft, als nationale Minderheit anerkannt, mit dem Tempel Quba Mêrê Dîwanê in Aknalitsch.',
    'جالية إيزيدية عريقة معترف بها كأقلية قومية، وفيها معبد «قوبا ميري ديوانه» في أكناليج.',
    'Civakeke êzdî ya kevnar, wek kêmneteweyek naskirî, bi perestgeha Quba Mêrê Dîwanê li Aknaliçê.'),
  GE: n('Long-established Yazidi community, mainly in Tbilisi.', 'Seit Langem ansässige ezidische Gemeinschaft, vor allem in Tiflis.',
    'جالية إيزيدية عريقة، معظمها في تبليسي.', 'Civakeke êzdî ya kevnar, bi piranî li Tiflîsê.'),
  RU: n('Yazidi communities in several regions, especially in the south.', 'Ezidische Gemeinschaften in mehreren Regionen, besonders im Süden.',
    'مجتمعات إيزيدية في عدة مناطق، خصوصاً في الجنوب.', 'Civakên êzdî li çend herêman, bi taybetî li başûr.'),
  DE: n('Home to the largest Yazidi community outside the Middle East, especially in Lower Saxony and North Rhine-Westphalia.',
    'Heimat der größten ezidischen Gemeinschaft außerhalb des Nahen Ostens, besonders in Niedersachsen und Nordrhein-Westfalen.',
    'فيها أكبر جالية إيزيدية خارج الشرق الأوسط، خصوصاً في ولايتي سكسونيا السفلى وشمال الراين-وستفاليا.',
    'Mala civaka êzdî ya herî mezin li derveyî Rojhilata Navîn, bi taybetî li Saksonyaya Jêrîn û Rheinland-Westfalyaya Bakur.'),
};

export const COUNTRY_NAMES: Record<string, T> = {
  IQ: n('Iraq', 'Irak', 'العراق', 'Iraq'), SY: n('Syria', 'Syrien', 'سوريا', 'Sûriye'), TR: n('Turkey', 'Türkei', 'تركيا', 'Tirkiye'),
  AM: n('Armenia', 'Armenien', 'أرمينيا', 'Ermenistan'), GE: n('Georgia', 'Georgien', 'جورجيا', 'Gurcistan'), RU: n('Russia', 'Russland', 'روسيا', 'Rûsya'),
  DE: n('Germany', 'Deutschland', 'ألمانيا', 'Almanya'), NL: n('Netherlands', 'Niederlande', 'هولندا', 'Holenda'), BE: n('Belgium', 'Belgien', 'بلجيكا', 'Belçîka'),
  FR: n('France', 'Frankreich', 'فرنسا', 'Fransa'), SE: n('Sweden', 'Schweden', 'السويد', 'Swêd'), US: n('United States', 'USA', 'الولايات المتحدة', 'DYA'),
  CA: n('Canada', 'Kanada', 'كندا', 'Kanada'), AU: n('Australia', 'Australien', 'أستراليا', 'Awistralya'),
};
