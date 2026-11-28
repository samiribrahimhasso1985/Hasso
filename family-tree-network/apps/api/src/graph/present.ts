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
import { parseMarker, photoPath } from '../photos/photo-url';

/**
 * Public-safe person summary used in graphs and lists. No dates, no locations, no contact data.
 * Only called for people the viewer may see; the photo is a signed link that expires within 2 hours.
 */
type SummaryProfile = Pick<Profile, 'id' | 'displayName' | 'gender' | 'avatarUrl' | 'isMinor' | 'userId' | 'deathDate'>;

/**
 * May this viewer see the person's photo? Owner always; otherwise the photo's own setting
 * (default NETWORK), minors never beyond FAMILY. Without a viewer context only PUBLIC photos are shown.
 */
export function photoAllowed(p: SummaryProfile, ctx?: ViewerContext | null, own = false): boolean {
  const m = parseMarker(p.avatarUrl);
  if (!m) return false;
  if (own || (ctx && (ctx.personId === p.id || (p.userId && ctx.userId === p.userId)))) return true;
  let vis = m.visibility;
  if (p.isMinor && (vis === 'PUBLIC' || vis === 'NETWORK')) vis = 'FAMILY';
  switch (vis) {
    case 'PUBLIC':
      return true;
    case 'NETWORK':
      return Boolean(ctx && (ctx.networkPersonIds.has(p.id) || ctx.familyPersonIds.has(p.id)));
    case 'FAMILY':
      return Boolean(ctx && ctx.familyPersonIds.has(p.id));
    default:
      return false;
  }
}

export function personSummary(p: SummaryProfile, ctx?: ViewerContext | null, own = false) {
  return {
    id: p.id,
    displayName: p.displayName,
    gender: p.gender,
    avatarUrl: photoAllowed(p, ctx, own) ? photoPath(p.id, p.avatarUrl) : null,
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
