import { getType } from './catalog';
import type { GraphIndex } from './graph';
import { isEndedUnion, type NormalizedRelationship } from './normalize';

export interface Violation {
  code: string;
  message: string;
}

const isLive = (status: string) => status !== 'REJECTED';

/**
 * Structural integrity rules for a new relationship.
 * Returns every violation found (empty array = valid). Nothing here is a
 * hardcoded family shape: the rules only protect logical consistency
 * (no self-ancestry, no duplicate facts, plausible dates, child protection).
 */
export function validateNewRelationship(index: GraphIndex, rel: NormalizedRelationship): Violation[] {
  const v: Violation[] = [];
  const def = getType(rel.typeKey);
  const from = index.person(rel.fromId);
  const to = index.person(rel.toId);
  if (!from || !to) {
    v.push({ code: 'PERSON_NOT_FOUND', message: 'Both people must exist' });
    return v;
  }

  // 1. Gender implied by the word must not contradict the profile.
  if (rel.impliedGender && rel.impliedGenderPersonId) {
    const p = index.person(rel.impliedGenderPersonId);
    if (p && p.gender !== 'UNSPECIFIED' && p.gender !== rel.impliedGender) {
      v.push({
        code: 'GENDER_MISMATCH',
        message: `The chosen word implies ${rel.impliedGender.toLowerCase()}, but the profile says ${p.gender.toLowerCase()}`,
      });
    }
  }

  const between = index.edgesBetween(rel.fromId, rel.toId).filter((e) => isLive(e.status));

  // 2. Duplicates. Unions may repeat over time (remarriage) once the earlier one ended.
  const dup = between.find((e) => {
    if (e.typeKey !== rel.typeKey) return false;
    if (def.directionality === 'DIRECTED' && e.fromId !== rel.fromId) return false;
    if (def.isUnion) return !isEndedUnion(e.attributes);
    if (def.key === 'CUSTOM') return e.attributes?.customLabel === rel.attributes.customLabel;
    return true;
  });
  if (dup) v.push({ code: 'DUPLICATE_RELATIONSHIP', message: 'This relationship already exists' });

  // 3. A pair can hold only one family-kinship fact (e.g. not both PARENT and SIBLING).
  if (def.category === 'FAMILY') {
    const conflict = between.find(
      (e) =>
        getType(e.typeKey).category === 'FAMILY' &&
        !(e.typeKey === rel.typeKey && (def.directionality === 'SYMMETRIC' || e.fromId === rel.fromId)),
    );
    if (conflict) {
      v.push({
        code: 'CONFLICTING_FAMILY_RELATIONSHIP',
        message: `These people already have a ${conflict.typeKey} relationship`,
      });
    }
  }

  // 4. Parent edges must not create ancestry cycles.
  if (rel.typeKey === 'PARENT' || rel.typeKey === 'GRANDPARENT') {
    if (index.isAncestor(rel.toId, rel.fromId)) {
      v.push({ code: 'ANCESTRY_CYCLE', message: 'A descendant cannot become an ancestor of their own ancestor' });
    }
  }

  // 5. At most two biological parents.
  if (rel.typeKey === 'PARENT' && rel.attributes.parentSubtype === 'BIOLOGICAL') {
    const bio = index
      .parentsOf(rel.toId, false)
      .filter((e) => isLive(e.status) && (e.attributes?.parentSubtype ?? 'BIOLOGICAL') === 'BIOLOGICAL');
    if (bio.length >= 2) {
      v.push({ code: 'TOO_MANY_BIOLOGICAL_PARENTS', message: 'A person can have at most two biological parents' });
    }
  }

  // 6. Plausible birth order for ancestor relationships.
  // (Only for direct lines — an uncle can legitimately be younger than his nephew.)
  if (def.kinshipMove && def.kinshipMove.up > 0 && def.kinshipMove.down === 0) {
    if (from.birthDate && to.birthDate && from.birthDate >= to.birthDate) {
      v.push({ code: 'ANCESTOR_YOUNGER_THAN_DESCENDANT', message: 'An ancestor must be born before the descendant' });
    }
  }

  // 7. Unions: dates, ancestry, minors.
  if (def.category === 'UNION') {
    const { startDate, endDate } = rel.attributes;
    if (startDate && endDate && endDate < startDate) {
      v.push({ code: 'INVALID_DATE_RANGE', message: 'End date is before start date' });
    }
    if (index.isAncestor(rel.fromId, rel.toId) || index.isAncestor(rel.toId, rel.fromId)) {
      v.push({ code: 'UNION_WITH_ANCESTOR', message: 'A union between an ancestor and a descendant is not allowed' });
    }
    if (from.isMinor || to.isMinor) {
      v.push({ code: 'MINOR_UNION', message: 'Unions cannot be recorded for protected minor profiles' });
    }
  }

  return v;
}
