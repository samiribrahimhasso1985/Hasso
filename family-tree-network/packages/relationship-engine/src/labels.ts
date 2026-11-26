import { getType } from './catalog';
import type { Kinship } from './kinship';
import { isEndedUnion } from './normalize';
import type { Gender, LocalizedLabel, Locale, RelationshipEdge } from './types';

const pick = (l: LocalizedLabel, g: Gender) => (g === 'MALE' && l.male) || (g === 'FEMALE' && l.female) || l.neutral;

/**
 * Label of the *other* person of an edge, as seen from `subjectId`.
 * Example: PARENT edge Layla→Omar, subject Omar, Layla female → "Mother".
 */
export function edgeLabel(edge: RelationshipEdge, subjectId: string, otherGender: Gender, locale: Locale): string {
  const def = getType(edge.typeKey);
  if (def.key === 'CUSTOM' && edge.attributes?.customLabel) return edge.attributes.customLabel;
  if (def.isUnion && isEndedUnion(edge.attributes) && edge.attributes?.endReason !== 'DEATH') {
    return pick(FORMER[locale], otherGender);
  }
  if (def.directionality === 'DIRECTED') {
    // other is "from" → use labels; other is "to" → inverse labels
    const otherIsFrom = edge.toId === subjectId;
    return pick((otherIsFrom ? def.labels : def.inverseLabels)[locale], otherGender);
  }
  return pick(def.labels[locale], otherGender);
}

const FORMER: Record<Locale, LocalizedLabel> = {
  en: { neutral: 'Former spouse', male: 'Former husband', female: 'Former wife' },
  de: { neutral: 'Ehemalige/r Ehepartner/in', male: 'Ex-Ehemann', female: 'Ex-Ehefrau' },
  ar: { neutral: 'الزوج/ة السابق/ة', male: 'الزوج السابق', female: 'الزوجة السابقة' },
  ku: { neutral: 'Hevjînê berê', male: 'Mêrê berê', female: 'Jina berê' },
};

type G = { m: string; f: string; n: string };
const g = (m: string, f: string, n: string): G => ({ m, f, n });
const sel = (x: G, gender: Gender) => (gender === 'MALE' ? x.m : gender === 'FEMALE' ? x.f : x.n);

const EN: Record<string, G> = {
  SELF: g('Self', 'Self', 'Self'),
  PARENT: g('Father', 'Mother', 'Parent'),
  CHILD: g('Son', 'Daughter', 'Child'),
  SIBLING: g('Brother', 'Sister', 'Sibling'),
  HALF_SIBLING: g('Half-brother', 'Half-sister', 'Half-sibling'),
  GRANDPARENT: g('Grandfather', 'Grandmother', 'Grandparent'),
  GRANDCHILD: g('Grandson', 'Granddaughter', 'Grandchild'),
  UNCLE_AUNT: g('Uncle', 'Aunt', 'Uncle/Aunt'),
  NEPHEW_NIECE: g('Nephew', 'Niece', 'Nephew/Niece'),
  COUSIN: g('Cousin', 'Cousin', 'Cousin'),
  SPOUSE: g('Husband', 'Wife', 'Spouse'),
  FORMER_SPOUSE: g('Former husband', 'Former wife', 'Former spouse'),
  PARTNER: g('Partner', 'Partner', 'Partner'),
  FIANCE: g('Fiancé', 'Fiancée', 'Fiancé(e)'),
  STEP_PARENT: g('Stepfather', 'Stepmother', 'Step-parent'),
  STEP_CHILD: g('Stepson', 'Stepdaughter', 'Stepchild'),
  PARENT_IN_LAW: g('Father-in-law', 'Mother-in-law', 'Parent-in-law'),
  CHILD_IN_LAW: g('Son-in-law', 'Daughter-in-law', 'Child-in-law'),
  SIBLING_IN_LAW: g('Brother-in-law', 'Sister-in-law', 'Sibling-in-law'),
  RELATIVE_BY_MARRIAGE: g('Relative by marriage', 'Relative by marriage', 'Relative by marriage'),
  NONE: g('No family relation', 'No family relation', 'No family relation'),
};

const DE: Record<string, G> = {
  SELF: g('Ich', 'Ich', 'Ich'),
  PARENT: g('Vater', 'Mutter', 'Elternteil'),
  CHILD: g('Sohn', 'Tochter', 'Kind'),
  SIBLING: g('Bruder', 'Schwester', 'Geschwister'),
  HALF_SIBLING: g('Halbbruder', 'Halbschwester', 'Halbgeschwister'),
  GRANDPARENT: g('Großvater', 'Großmutter', 'Großelternteil'),
  GRANDCHILD: g('Enkel', 'Enkelin', 'Enkelkind'),
  UNCLE_AUNT: g('Onkel', 'Tante', 'Onkel/Tante'),
  NEPHEW_NIECE: g('Neffe', 'Nichte', 'Neffe/Nichte'),
  COUSIN: g('Cousin', 'Cousine', 'Cousin/Cousine'),
  SPOUSE: g('Ehemann', 'Ehefrau', 'Ehepartner'),
  FORMER_SPOUSE: g('Ex-Ehemann', 'Ex-Ehefrau', 'Ehemalige/r Ehepartner/in'),
  PARTNER: g('Partner', 'Partnerin', 'Partner/in'),
  FIANCE: g('Verlobter', 'Verlobte', 'Verlobte/r'),
  STEP_PARENT: g('Stiefvater', 'Stiefmutter', 'Stiefelternteil'),
  STEP_CHILD: g('Stiefsohn', 'Stieftochter', 'Stiefkind'),
  PARENT_IN_LAW: g('Schwiegervater', 'Schwiegermutter', 'Schwiegerelternteil'),
  CHILD_IN_LAW: g('Schwiegersohn', 'Schwiegertochter', 'Schwiegerkind'),
  SIBLING_IN_LAW: g('Schwager', 'Schwägerin', 'Schwager/Schwägerin'),
  RELATIVE_BY_MARRIAGE: g('Angeheirateter Verwandter', 'Angeheiratete Verwandte', 'Angeheiratete/r Verwandte/r'),
  NONE: g('Keine Verwandtschaft', 'Keine Verwandtschaft', 'Keine Verwandtschaft'),
};

const AR: Record<string, G> = {
  SELF: g('أنا', 'أنا', 'أنا'),
  PARENT: g('الأب', 'الأم', 'الوالد/ة'),
  CHILD: g('الابن', 'الابنة', 'الابن/ة'),
  SIBLING: g('الأخ', 'الأخت', 'الأخ/الأخت'),
  HALF_SIBLING: g('أخ غير شقيق', 'أخت غير شقيقة', 'أخ/أخت غير شقيق'),
  GRANDPARENT: g('الجد', 'الجدة', 'الجد/ة'),
  GRANDCHILD: g('الحفيد', 'الحفيدة', 'الحفيد/ة'),
  NEPHEW_NIECE: g('ابن الأخ/الأخت', 'ابنة الأخ/الأخت', 'ابن/ة الأخ أو الأخت'),
  SPOUSE: g('الزوج', 'الزوجة', 'الزوج/ة'),
  FORMER_SPOUSE: g('الزوج السابق', 'الزوجة السابقة', 'الزوج/ة السابق/ة'),
  PARTNER: g('الشريك', 'الشريكة', 'الشريك/ة'),
  FIANCE: g('الخطيب', 'الخطيبة', 'الخطيب/ة'),
  STEP_PARENT: g('زوج الأم', 'زوجة الأب', 'زوج/ة الوالد'),
  STEP_CHILD: g('ابن الزوج/ة', 'ابنة الزوج/ة', 'ربيب/ة'),
  PARENT_IN_LAW: g('الحمو', 'الحماة', 'والد/ة الزوج/ة'),
  CHILD_IN_LAW: g('الصهر', 'الكنّة', 'زوج/ة الابن/ة'),
  SIBLING_IN_LAW: g('النسيب', 'النسيبة', 'النسيب/ة'),
  RELATIVE_BY_MARRIAGE: g('قريب بالمصاهرة', 'قريبة بالمصاهرة', 'قريب/ة بالمصاهرة'),
  NONE: g('لا توجد قرابة عائلية', 'لا توجد قرابة عائلية', 'لا توجد قرابة عائلية'),
};

const ORD_EN = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
const QUAL: Record<Locale, Record<string, string>> = {
  en: { ADOPTIVE: 'adoptive', STEP: 'step', FOSTER: 'foster', GUARDIAN: 'guardian' },
  de: { ADOPTIVE: 'Adoption', STEP: 'Stief', FOSTER: 'Pflege', GUARDIAN: 'Vormundschaft' },
  ar: { ADOPTIVE: 'بالتبنّي', STEP: 'بالمصاهرة', FOSTER: 'بالرعاية', GUARDIAN: 'بالوصاية' },
  ku: { ADOPTIVE: 'bi xwedîkirinê', STEP: 'zir', FOSTER: 'bi parastinê', GUARDIAN: 'bi serperiştiyê' },
};

/** Kurmanji (Latin/Hawar) — DRAFT, needs native-speaker review (docs/ezidnet/LOCALIZATION.md). */
const KU: Record<string, G> = {
  SELF: g('Ez', 'Ez', 'Ez'),
  PARENT: g('Bav', 'Dayik', 'Dê/Bav'),
  CHILD: g('Kur', 'Keç', 'Zarok'),
  SIBLING: g('Bira', 'Xwişk', 'Bira/Xwişk'),
  HALF_SIBLING: g('Birayê nîvî', 'Xwişka nîvî', 'Bira/Xwişka nîvî'),
  GRANDPARENT: g('Bapîr', 'Dapîr', 'Bapîr/Dapîr'),
  GRANDCHILD: g('Nevî', 'Nevî', 'Nevî'),
  SPOUSE: g('Mêr', 'Jin', 'Hevjîn'),
  FORMER_SPOUSE: g('Mêrê berê', 'Jina berê', 'Hevjînê berê'),
  PARTNER: g('Heval (hevjîn)', 'Heval (hevjîn)', 'Heval (hevjîn)'),
  FIANCE: g('Dergistî', 'Dergistî', 'Dergistî'),
  STEP_PARENT: g('Zirbav', 'Zirdayik', 'Zirbav/Zirdayik'),
  STEP_CHILD: g('Zirkur', 'Zirkeç', 'Zirzarok'),
  PARENT_IN_LAW: g('Xezûr', 'Xesû', 'Xezûr/Xesû'),
  CHILD_IN_LAW: g('Zava', 'Bûk', 'Zava/Bûk'),
  SIBLING_IN_LAW: g('Bûra/Tî', 'Jinbira/Dişî', 'Xizmê bi zewacê'),
  RELATIVE_BY_MARRIAGE: g('Xizmê bi zewacê', 'Xizma bi zewacê', 'Xizm bi zewacê'),
  NONE: g('Têkiliya malbatî tune', 'Têkiliya malbatî tune', 'Têkiliya malbatî tune'),
};

/** Human label for a derived kinship: "<target> is the <label> of <subject>". */
export function kinshipLabel(k: Kinship, targetGender: Gender, locale: Locale): string {
  const base = baseKinshipLabel(k, targetGender, locale);
  return k.qualifier ? `${base} (${QUAL[locale][k.qualifier]})` : base;
}

function baseKinshipLabel(k: Kinship, gender: Gender, locale: Locale): string {
  const key = k.key === 'SIBLING' && k.half ? 'HALF_SIBLING' : k.key;
  if (locale === 'en') {
    if (key === 'GRANDPARENT' || key === 'GRANDCHILD') return 'Great-'.repeat(k.greats) + lower1(sel(EN[key], gender), k.greats);
    if (key === 'UNCLE_AUNT' || key === 'NEPHEW_NIECE') {
      const s = sel(EN[key], gender);
      if (k.greats === 0) return k.kind === 'IN_LAW' ? `${s} (by marriage)` : s;
      return 'Great-'.repeat(k.greats - 1) + 'Great-' + s.toLowerCase();
    }
    if (key === 'COUSIN') {
      const ord = ORD_EN[k.cousinDegree] ?? `${k.cousinDegree}th`;
      const rem = k.removed === 0 ? '' : k.removed === 1 ? ' once removed' : k.removed === 2 ? ' twice removed' : ` ${k.removed}× removed`;
      return k.kind === 'IN_LAW' ? `${ord} cousin${rem} (by marriage)` : `${ord} cousin${rem}`;
    }
    return sel(EN[key] ?? EN.NONE, gender);
  }
  if (locale === 'de') {
    if (key === 'GRANDPARENT' || key === 'GRANDCHILD') return 'Ur'.repeat(k.greats) + (k.greats ? sel(DE[key], gender).toLowerCase() : sel(DE[key], gender));
    if (key === 'UNCLE_AUNT' || key === 'NEPHEW_NIECE') {
      const s = sel(DE[key], gender);
      if (k.greats === 0) return s;
      return 'Ur'.repeat(k.greats - 1) + (k.greats - 1 ? 'groß' : 'Groß') + s.toLowerCase();
    }
    if (key === 'COUSIN') {
      const s = sel(DE.COUSIN, gender);
      const grade = k.cousinDegree > 1 ? ` ${k.cousinDegree}. Grades` : '';
      const rem = k.removed ? `, ${k.removed}× entfernt` : '';
      return `${s}${grade}${rem}`;
    }
    return sel(DE[key] ?? DE.NONE, gender);
  }
  if (locale === 'ku') return kurmanjiKinship(k, key, gender);
  // Arabic: paternal/maternal distinction matters (عم/عمة vs خال/خالة).
  if (key === 'UNCLE_AUNT') {
    const paternal = k.lineageSide === 'PATERNAL';
    const maternal = k.lineageSide === 'MATERNAL';
    const s =
      gender === 'FEMALE'
        ? paternal ? 'العمة' : maternal ? 'الخالة' : 'العمة/الخالة'
        : gender === 'MALE'
          ? paternal ? 'العم' : maternal ? 'الخال' : 'العم/الخال'
          : paternal ? 'العم/العمة' : maternal ? 'الخال/الخالة' : 'العم/الخال';
    return k.greats > 0 ? `${s} الأكبر${k.greats > 1 ? ` (${k.greats})` : ''}` : s;
  }
  if (key === 'NEPHEW_NIECE') {
    const viaBrother = k.siblingGender === 'MALE';
    const viaSister = k.siblingGender === 'FEMALE';
    const head = gender === 'FEMALE' ? 'ابنة' : gender === 'MALE' ? 'ابن' : 'ابن/ة';
    const tail = viaBrother ? 'الأخ' : viaSister ? 'الأخت' : 'الأخ/الأخت';
    return k.greats > 0 ? `${head} ${tail} (حفيد/ة)` : `${head} ${tail}`;
  }
  if (key === 'COUSIN') {
    const head = gender === 'FEMALE' ? 'ابنة' : gender === 'MALE' ? 'ابن' : 'ابن/ة';
    if (k.cousinDegree === 1 && k.removed === 0) {
      const p = k.lineageSide === 'PATERNAL';
      const m = k.lineageSide === 'MATERNAL';
      const ua = k.uncleAuntGender;
      const tail = p
        ? ua === 'FEMALE' ? 'العمة' : ua === 'MALE' ? 'العم' : 'العم/العمة'
        : m
          ? ua === 'FEMALE' ? 'الخالة' : ua === 'MALE' ? 'الخال' : 'الخال/الخالة'
          : 'العم/الخال';
      return `${head} ${tail}`;
    }
    return `قريب/ة من الدرجة ${k.cousinDegree + 1}${k.removed ? ` (فارق ${k.removed} جيل)` : ''}`;
  }
  if (key === 'GRANDPARENT') return k.greats ? `${sel(AR.GRANDPARENT, gender)} الأكبر${k.greats > 1 ? ` (${k.greats})` : ''}` : sel(AR.GRANDPARENT, gender);
  if (key === 'GRANDCHILD') return k.greats ? `${gender === 'FEMALE' ? 'ابنة' : 'ابن'} ${k.greats > 1 ? `(${k.greats}) ` : ''}الحفيد` : sel(AR.GRANDCHILD, gender);
  return sel(AR[key] ?? AR.NONE, gender);
}

function lower1(s: string, greats: number) {
  return greats ? s.toLowerCase() : s;
}

/** Kurmanji kinship terms (draft). Like Arabic, Kurmanji distinguishes paternal (mam, met) and maternal (xal, xaltî) sides. */
function kurmanjiKinship(k: Kinship, key: string, gender: Gender): string {
  const paternal = k.lineageSide === 'PATERNAL';
  const maternal = k.lineageSide === 'MATERNAL';
  if (key === 'UNCLE_AUNT') {
    const s =
      gender === 'FEMALE'
        ? paternal ? 'Met' : maternal ? 'Xaltî' : 'Met/Xaltî'
        : gender === 'MALE'
          ? paternal ? 'Mam' : maternal ? 'Xal' : 'Mam/Xal'
          : paternal ? 'Mam/Met' : maternal ? 'Xal/Xaltî' : 'Mam/Xal';
    return k.greats > 0 ? `${s} (${k.greats + 1} nifş jor)` : s;
  }
  if (key === 'NEPHEW_NIECE') {
    // brother's child = biraza, sister's child = xwarza (gender-neutral in Kurmanji)
    const base = k.siblingGender === 'MALE' ? 'Biraza' : k.siblingGender === 'FEMALE' ? 'Xwarza' : 'Biraza/Xwarza';
    return k.greats > 0 ? `${base} (${k.greats + 1} nifş jêr)` : base;
  }
  if (key === 'COUSIN') {
    if (k.cousinDegree === 1 && k.removed === 0) {
      const head = gender === 'FEMALE' ? 'Dot' : 'Pis';
      const ua = k.uncleAuntGender;
      const tail = paternal ? (ua === 'FEMALE' ? 'met' : ua === 'MALE' ? 'mam' : 'mam/met') : maternal ? (ua === 'FEMALE' ? 'xaltî' : ua === 'MALE' ? 'xal' : 'xal/xaltî') : 'mam/xal';
      return gender === 'UNSPECIFIED' ? `Pis/Dot${tail}` : `${head}${tail}`;
    }
    return `Xizm (pileya ${k.cousinDegree + 1})${k.removed ? `, ${k.removed} nifş cuda` : ''}`;
  }
  if (key === 'GRANDPARENT') return k.greats ? `${sel(KU.GRANDPARENT, gender)}ê mezin${k.greats > 1 ? ` (${k.greats})` : ''}` : sel(KU.GRANDPARENT, gender);
  if (key === 'GRANDCHILD') return k.greats ? `Nevîçirk${k.greats > 1 ? ` (${k.greats})` : ''}` : sel(KU.GRANDCHILD, gender);
  return sel(KU[key] ?? KU.NONE, gender);
}
