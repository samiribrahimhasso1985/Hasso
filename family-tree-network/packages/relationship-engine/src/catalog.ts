import type {
  Directionality,
  Gender,
  LabelSet,
  RelationshipCategory,
  RelationshipVisibility,
} from './types';

/**
 * Relationship type catalog.
 *
 * Only *canonical* types are stored. Gendered words (father, sister, wife …)
 * are presentation: they are resolved from the canonical type + the person's
 * gender, so the data model never duplicates the same fact.
 *
 * Directed types read: "<from> is the <labels> of <to>",
 * and from the other side: "<to> is the <inverseLabels> of <from>".
 *
 * This catalog is the seed for the `relationship_types` database table;
 * the database copy is the runtime source of truth for which types are enabled.
 */
export interface RelationshipTypeDef {
  key: string;
  category: RelationshipCategory;
  directionality: Directionality;
  /** Sensitive types need confirmations from two *distinct* users. */
  sensitive: boolean;
  /**
   * Kinship "move" this edge represents, read from `to` towards `from`
   * (up = generations up, down = generations down). Used by kinship derivation.
   * Example: PARENT from P to C → walking from C to P is one generation up: {up:1, down:0}.
   */
  kinshipMove?: { up: number; down: number };
  /** Union-type edges (marriage/partnership) used for in-law derivation. */
  isUnion?: boolean;
  defaultVisibility: RelationshipVisibility;
  labels: LabelSet;
  inverseLabels: LabelSet;
  sortOrder: number;
}

/**
 * Kurmanji (`ku`, Latin/Hawar script) labels are a DRAFT and must be reviewed by native speakers
 * before public release (docs/ezidnet/LOCALIZATION.md).
 */
const same = (l: LabelSet) => ({ labels: l, inverseLabels: l });

export const RELATIONSHIP_TYPES: readonly RelationshipTypeDef[] = [
  // ───────────── FAMILY (structural) ─────────────
  {
    key: 'PARENT',
    category: 'FAMILY',
    directionality: 'DIRECTED',
    sensitive: true,
    kinshipMove: { up: 1, down: 0 },
    defaultVisibility: 'FAMILY',
    sortOrder: 10,
    labels: {
      en: { neutral: 'Parent', male: 'Father', female: 'Mother' },
      de: { neutral: 'Elternteil', male: 'Vater', female: 'Mutter' },
      ar: { neutral: 'والد/ة', male: 'الأب', female: 'الأم' },
      ku: { neutral: 'Dê/Bav', male: 'Bav', female: 'Dayik' },
    },
    inverseLabels: {
      en: { neutral: 'Child', male: 'Son', female: 'Daughter' },
      de: { neutral: 'Kind', male: 'Sohn', female: 'Tochter' },
      ar: { neutral: 'ابن/ة', male: 'الابن', female: 'الابنة' },
      ku: { neutral: 'Zarok', male: 'Kur', female: 'Keç' },
    },
  },
  {
    key: 'SIBLING',
    category: 'FAMILY',
    directionality: 'SYMMETRIC',
    sensitive: true,
    kinshipMove: { up: 1, down: 1 },
    defaultVisibility: 'FAMILY',
    sortOrder: 20,
    ...same({
      en: { neutral: 'Sibling', male: 'Brother', female: 'Sister' },
      de: { neutral: 'Geschwister', male: 'Bruder', female: 'Schwester' },
      ar: { neutral: 'أخ/أخت', male: 'الأخ', female: 'الأخت' },
      ku: { neutral: 'Bira/Xwişk', male: 'Bira', female: 'Xwişk' },
    }),
  },
  // ───────────── FAMILY (declared extended) ─────────────
  // Used when the intermediate people are not (yet) in the network.
  // When they are, the engine derives these relations itself.
  {
    key: 'GRANDPARENT',
    category: 'FAMILY',
    directionality: 'DIRECTED',
    sensitive: true,
    kinshipMove: { up: 2, down: 0 },
    defaultVisibility: 'FAMILY',
    sortOrder: 30,
    labels: {
      en: { neutral: 'Grandparent', male: 'Grandfather', female: 'Grandmother' },
      de: { neutral: 'Großelternteil', male: 'Großvater', female: 'Großmutter' },
      ar: { neutral: 'الجد/ة', male: 'الجد', female: 'الجدة' },
      ku: { neutral: 'Bapîr/Dapîr', male: 'Bapîr', female: 'Dapîr' },
    },
    inverseLabels: {
      en: { neutral: 'Grandchild', male: 'Grandson', female: 'Granddaughter' },
      de: { neutral: 'Enkelkind', male: 'Enkel', female: 'Enkelin' },
      ar: { neutral: 'الحفيد/ة', male: 'الحفيد', female: 'الحفيدة' },
      ku: { neutral: 'Nevî', male: 'Nevî', female: 'Nevî' },
    },
  },
  {
    key: 'UNCLE_AUNT',
    category: 'FAMILY',
    directionality: 'DIRECTED',
    sensitive: true,
    kinshipMove: { up: 2, down: 1 },
    defaultVisibility: 'FAMILY',
    sortOrder: 40,
    labels: {
      en: { neutral: 'Uncle/Aunt', male: 'Uncle', female: 'Aunt' },
      de: { neutral: 'Onkel/Tante', male: 'Onkel', female: 'Tante' },
      ar: { neutral: 'العم/الخال', male: 'العم/الخال', female: 'العمة/الخالة' },
      ku: { neutral: 'Mam/Xal', male: 'Mam/Xal', female: 'Met/Xaltî' },
    },
    inverseLabels: {
      en: { neutral: 'Nephew/Niece', male: 'Nephew', female: 'Niece' },
      de: { neutral: 'Neffe/Nichte', male: 'Neffe', female: 'Nichte' },
      ar: { neutral: 'ابن/ة الأخ أو الأخت', male: 'ابن الأخ/الأخت', female: 'ابنة الأخ/الأخت' },
      ku: { neutral: 'Biraza/Xwarza' },
    },
  },
  {
    key: 'COUSIN',
    category: 'FAMILY',
    directionality: 'SYMMETRIC',
    sensitive: true,
    kinshipMove: { up: 2, down: 2 },
    defaultVisibility: 'FAMILY',
    sortOrder: 50,
    ...same({
      en: { neutral: 'Cousin' },
      de: { neutral: 'Cousin/Cousine', male: 'Cousin', female: 'Cousine' },
      ar: { neutral: 'ابن/ة العم أو الخال', male: 'ابن العم/الخال', female: 'ابنة العم/الخال' },
      ku: { neutral: 'Pismam/Pisxal', male: 'Pismam/Pisxal', female: 'Dotmam/Dotxal' },
    }),
  },
  // ───────────── UNION ─────────────
  {
    key: 'SPOUSE',
    category: 'UNION',
    directionality: 'SYMMETRIC',
    sensitive: true,
    isUnion: true,
    defaultVisibility: 'FAMILY',
    sortOrder: 60,
    ...same({
      en: { neutral: 'Spouse', male: 'Husband', female: 'Wife' },
      de: { neutral: 'Ehepartner', male: 'Ehemann', female: 'Ehefrau' },
      ar: { neutral: 'الزوج/ة', male: 'الزوج', female: 'الزوجة' },
      ku: { neutral: 'Hevjîn', male: 'Mêr', female: 'Jin' },
    }),
  },
  {
    key: 'PARTNER',
    category: 'UNION',
    directionality: 'SYMMETRIC',
    sensitive: true,
    isUnion: true,
    defaultVisibility: 'FAMILY',
    sortOrder: 70,
    ...same({
      en: { neutral: 'Partner' },
      de: { neutral: 'Partner/in', male: 'Partner', female: 'Partnerin' },
      ar: { neutral: 'الشريك/ة', male: 'الشريك', female: 'الشريكة' },
      ku: { neutral: 'Heval (hevjîn)' },
    }),
  },
  {
    key: 'FIANCE',
    category: 'UNION',
    directionality: 'SYMMETRIC',
    sensitive: true,
    defaultVisibility: 'FAMILY',
    sortOrder: 75,
    ...same({
      en: { neutral: 'Fiancé(e)', male: 'Fiancé', female: 'Fiancée' },
      de: { neutral: 'Verlobte/r', male: 'Verlobter', female: 'Verlobte' },
      ar: { neutral: 'الخطيب/ة', male: 'الخطيب', female: 'الخطيبة' },
      ku: { neutral: 'Dergistî' },
    }),
  },
  // ───────────── FRIENDSHIP ─────────────
  ...(
    [
      ['FRIEND', 'Friend', 'Freund/in', 'صديق', 'Heval', 80],
      ['CLOSE_FRIEND', 'Close friend', 'Enge/r Freund/in', 'صديق مقرّب', 'Hevalê nêzîk', 81],
      ['CHILDHOOD_FRIEND', 'Childhood friend', 'Kindheitsfreund/in', 'صديق الطفولة', 'Hevalê zarokatiyê', 82],
      ['SCHOOL_FRIEND', 'School friend', 'Schulfreund/in', 'صديق المدرسة', 'Hevalê dibistanê', 83],
      ['TRAVEL_FRIEND', 'Travel friend', 'Reisefreund/in', 'صديق السفر', 'Hevalê rêwîtiyê', 84],
    ] as const
  ).map(
    ([key, en, de, ar, ku, sortOrder]): RelationshipTypeDef => ({
      key,
      category: 'FRIENDSHIP',
      directionality: 'SYMMETRIC',
      sensitive: false,
      defaultVisibility: 'NETWORK',
      sortOrder,
      ...same({ en: { neutral: en }, de: { neutral: de }, ar: { neutral: ar }, ku: { neutral: ku } }),
    }),
  ),
  // ───────────── SOCIAL ─────────────
  ...(
    [
      ['NEIGHBOR', 'Neighbor', 'Nachbar/in', 'جار', 'Cîran', 90],
      ['ACQUAINTANCE', 'Acquaintance', 'Bekannte/r', 'معرفة', 'Nas', 91],
    ] as const
  ).map(
    ([key, en, de, ar, ku, sortOrder]): RelationshipTypeDef => ({
      key,
      category: 'SOCIAL',
      directionality: 'SYMMETRIC',
      sensitive: false,
      defaultVisibility: 'NETWORK',
      sortOrder,
      ...same({ en: { neutral: en }, de: { neutral: de }, ar: { neutral: ar }, ku: { neutral: ku } }),
    }),
  ),
  // ───────────── PROFESSIONAL ─────────────
  ...(
    [
      ['COLLEAGUE', 'Colleague', 'Kollege/Kollegin', 'زميل عمل', 'Hevkar', 100],
      ['FORMER_COLLEAGUE', 'Former colleague', 'Ehemalige/r Kollege/in', 'زميل سابق', 'Hevkarê berê', 101],
      ['BUSINESS_PARTNER', 'Business partner', 'Geschäftspartner/in', 'شريك أعمال', 'Şirîkê karsaziyê', 102],
      ['PROFESSIONAL_CONTACT', 'Professional contact', 'Beruflicher Kontakt', 'جهة اتصال مهنية', 'Têkiliya pîşeyî', 103],
    ] as const
  ).map(
    ([key, en, de, ar, ku, sortOrder]): RelationshipTypeDef => ({
      key,
      category: 'PROFESSIONAL',
      directionality: 'SYMMETRIC',
      sensitive: false,
      defaultVisibility: 'NETWORK',
      sortOrder,
      ...same({ en: { neutral: en }, de: { neutral: de }, ar: { neutral: ar }, ku: { neutral: ku } }),
    }),
  ),
  {
    key: 'MANAGES',
    category: 'PROFESSIONAL',
    directionality: 'DIRECTED',
    sensitive: false,
    defaultVisibility: 'NETWORK',
    sortOrder: 104,
    labels: {
      en: { neutral: 'Manager' },
      de: { neutral: 'Vorgesetzte/r' },
      ar: { neutral: 'المدير' },
      ku: { neutral: 'Rêveber' },
    },
    inverseLabels: {
      en: { neutral: 'Employee' },
      de: { neutral: 'Mitarbeiter/in' },
      ar: { neutral: 'الموظف' },
      ku: { neutral: 'Karmend' },
    },
  },
  // ───────────── CUSTOM ─────────────
  {
    key: 'CUSTOM',
    category: 'CUSTOM',
    directionality: 'SYMMETRIC',
    sensitive: false,
    defaultVisibility: 'NETWORK',
    sortOrder: 200,
    ...same({
      en: { neutral: 'Custom' },
      de: { neutral: 'Benutzerdefiniert' },
      ar: { neutral: 'مخصّص' },
      ku: { neutral: 'Taybet' },
    }),
  },
];

const BY_KEY = new Map(RELATIONSHIP_TYPES.map((t) => [t.key, t]));

export function getType(key: string): RelationshipTypeDef {
  const t = BY_KEY.get(key);
  if (!t) throw new EngineError('UNKNOWN_TYPE', `Unknown relationship type: ${key}`);
  return t;
}

export function hasType(key: string): boolean {
  return BY_KEY.has(key);
}

/**
 * Input aliases. Semantics: "<related> is the <ALIAS> of <subject>".
 *   canonical    – stored type
 *   relatedIs    – which canonical side the *related* person lands on
 *   gender       – gender implied by the word (validated against the profile)
 *   ended        – alias implies a finished union (e.g. FORMER_SPOUSE)
 */
export interface AliasDef {
  canonical: string;
  relatedIs: 'from' | 'to' | 'either';
  gender?: Exclude<Gender, 'UNSPECIFIED'>;
  ended?: boolean;
}

export const ALIASES: Readonly<Record<string, AliasDef>> = {
  PARENT: { canonical: 'PARENT', relatedIs: 'from' },
  FATHER: { canonical: 'PARENT', relatedIs: 'from', gender: 'MALE' },
  MOTHER: { canonical: 'PARENT', relatedIs: 'from', gender: 'FEMALE' },
  CHILD: { canonical: 'PARENT', relatedIs: 'to' },
  SON: { canonical: 'PARENT', relatedIs: 'to', gender: 'MALE' },
  DAUGHTER: { canonical: 'PARENT', relatedIs: 'to', gender: 'FEMALE' },
  SIBLING: { canonical: 'SIBLING', relatedIs: 'either' },
  BROTHER: { canonical: 'SIBLING', relatedIs: 'either', gender: 'MALE' },
  SISTER: { canonical: 'SIBLING', relatedIs: 'either', gender: 'FEMALE' },
  GRANDPARENT: { canonical: 'GRANDPARENT', relatedIs: 'from' },
  GRANDFATHER: { canonical: 'GRANDPARENT', relatedIs: 'from', gender: 'MALE' },
  GRANDMOTHER: { canonical: 'GRANDPARENT', relatedIs: 'from', gender: 'FEMALE' },
  GRANDCHILD: { canonical: 'GRANDPARENT', relatedIs: 'to' },
  GRANDSON: { canonical: 'GRANDPARENT', relatedIs: 'to', gender: 'MALE' },
  GRANDDAUGHTER: { canonical: 'GRANDPARENT', relatedIs: 'to', gender: 'FEMALE' },
  UNCLE_AUNT: { canonical: 'UNCLE_AUNT', relatedIs: 'from' },
  UNCLE: { canonical: 'UNCLE_AUNT', relatedIs: 'from', gender: 'MALE' },
  AUNT: { canonical: 'UNCLE_AUNT', relatedIs: 'from', gender: 'FEMALE' },
  NEPHEW_NIECE: { canonical: 'UNCLE_AUNT', relatedIs: 'to' },
  NEPHEW: { canonical: 'UNCLE_AUNT', relatedIs: 'to', gender: 'MALE' },
  NIECE: { canonical: 'UNCLE_AUNT', relatedIs: 'to', gender: 'FEMALE' },
  COUSIN: { canonical: 'COUSIN', relatedIs: 'either' },
  SPOUSE: { canonical: 'SPOUSE', relatedIs: 'either' },
  HUSBAND: { canonical: 'SPOUSE', relatedIs: 'either', gender: 'MALE' },
  WIFE: { canonical: 'SPOUSE', relatedIs: 'either', gender: 'FEMALE' },
  FORMER_SPOUSE: { canonical: 'SPOUSE', relatedIs: 'either', ended: true },
  PARTNER: { canonical: 'PARTNER', relatedIs: 'either' },
  FIANCE: { canonical: 'FIANCE', relatedIs: 'either' },
  MANAGER: { canonical: 'MANAGES', relatedIs: 'from' },
  EMPLOYEE: { canonical: 'MANAGES', relatedIs: 'to' },
  ...Object.fromEntries(
    RELATIONSHIP_TYPES.filter(
      (t) => t.directionality === 'SYMMETRIC' && !['SIBLING', 'COUSIN', 'SPOUSE', 'PARTNER', 'FIANCE'].includes(t.key),
    ).map((t) => [t.key, { canonical: t.key, relatedIs: 'either' } as AliasDef]),
  ),
};

/**
 * Line colour per category — Modern Luxury / Editorial Minimalism palette (CLAUDE.md §31).
 * Hues are the approved palette colours, deepened just enough to reach WCAG 1.4.11
 * non-text contrast (≥ 3:1) on the light canvas (#FAF9F5 / #F3F0E9). See docs/design/COLOR_TOKENS.md.
 */
export const CATEGORY_COLORS: Readonly<Record<RelationshipCategory, string>> = {
  FAMILY: '#8B8C7A', // Dusty Olive (#989985) — line variant
  UNION: '#A68371', // Muted Terracotta (#B58F7B) — line variant
  FRIENDSHIP: '#808B92', // Slate Blue Gray (#87939A) — line variant
  PROFESSIONAL: '#9A877A', // Soft Cocoa (#A18D80) — line variant
  SOCIAL: '#858078', // Stone Gray
  CUSTOM: '#716C65', // Stone Gray — ink variant
};

export class EngineError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}
