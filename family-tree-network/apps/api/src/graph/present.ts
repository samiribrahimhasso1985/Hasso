import type { Profile } from '@prisma/client';
import {
  CATEGORY_COLORS,
  effectiveCategory,
  edgeLabel,
  getType,
  type GraphIndex,
  type Locale,
  type RelationshipEdge,
  type ViewerContext,
} from '@ftn/relationship-engine';

/** Public-safe person summary used in graphs and lists. No dates, no locations, no contact data. */
export function personSummary(p: Pick<Profile, 'id' | 'displayName' | 'gender' | 'avatarUrl' | 'isMinor' | 'userId' | 'deathDate'>) {
  return {
    id: p.id,
    displayName: p.displayName,
    gender: p.gender,
    avatarUrl: p.avatarUrl,
    isMinor: p.isMinor,
    claimed: Boolean(p.userId),
    deceased: Boolean(p.deathDate),
  };
}

export function edgeDto(e: RelationshipEdge, index: GraphIndex, locale: Locale) {
  const category = effectiveCategory(e);
  const def = getType(e.typeKey);
  const fromGender = index.person(e.fromId)?.gender ?? 'UNSPECIFIED';
  const toGender = index.person(e.toId)?.gender ?? 'UNSPECIFIED';
  return {
    id: e.id,
    typeKey: e.typeKey,
    category,
    color: CATEGORY_COLORS[category],
    status: e.status,
    visibility: e.visibility,
    source: e.fromId,
    target: e.toId,
    directed: def.directionality === 'DIRECTED',
    sensitive: def.sensitive,
    /** What the source person is to the target person (e.g. "Mother"). */
    label: edgeLabel(e, e.toId, fromGender, locale),
    /** What the target person is to the source person (e.g. "Son"). */
    inverseLabel: edgeLabel(e, e.fromId, toGender, locale),
    attributes: e.attributes ?? {},
  };
}

/** Can this viewer see that a person exists at all? */
export function canSeePerson(ctx: ViewerContext, p: Pick<Profile, 'id' | 'isMinor' | 'searchable'> & { stewardUserIds?: string[]; userId: string | null }): boolean {
  if (ctx.blockedPersonIds.has(p.id)) return false;
  if (p.id === ctx.personId) return true;
  if (ctx.userId && (p.userId === ctx.userId || p.stewardUserIds?.includes(ctx.userId))) return true;
  if (p.isMinor) return ctx.familyPersonIds.has(p.id);
  return p.searchable || ctx.networkPersonIds.has(p.id) || ctx.familyPersonIds.has(p.id);
}
