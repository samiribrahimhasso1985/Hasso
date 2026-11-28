import type { GraphIndex } from './graph';
import { deriveKinship, type KinshipKey } from './kinship';

/**
 * Notification priority tier of `recipientId` for content published by `authorId`,
 * based on CONFIRMED relationships only. null = not a notification target by relationship.
 *
 * Tier 1: parents, spouse/partner, children, siblings
 * Tier 2: grandparents, grandchildren, uncles/aunts, nephews/nieces, first cousins, in-laws
 * Tier 3: close friends, friends, professional contacts
 *
 * The notification service (Phase 3) must still apply the recipient's own
 * preferences, mutes, blocks, quiet hours and rate limits on top of this.
 */
export type NotificationTier = 1 | 2 | 3;

const TIER1: KinshipKey[] = ['PARENT', 'CHILD', 'SIBLING', 'SPOUSE', 'PARTNER', 'STEP_PARENT', 'STEP_CHILD'];
const TIER2: KinshipKey[] = [
  'GRANDPARENT',
  'GRANDCHILD',
  'UNCLE_AUNT',
  'NEPHEW_NIECE',
  'PARENT_IN_LAW',
  'CHILD_IN_LAW',
  'SIBLING_IN_LAW',
  'FIANCE',
];
const TIER3_TYPES = new Set([
  'CLOSE_FRIEND',
  'FRIEND',
  'CHILDHOOD_FRIEND',
  'SCHOOL_FRIEND',
  'TRAVEL_FRIEND',
  'COLLEAGUE',
  'BUSINESS_PARTNER',
  'PROFESSIONAL_CONTACT',
  'MANAGES',
]);

export function notificationTier(index: GraphIndex, authorId: string, recipientId: string): NotificationTier | null {
  if (authorId === recipientId) return null;
  const k = deriveKinship(index, authorId, recipientId);
  if (TIER1.includes(k.key)) return 1;
  if (TIER2.includes(k.key)) return k.greats > 0 ? null : 2;
  if (k.key === 'COUSIN' && k.cousinDegree === 1 && k.removed === 0) return 2;
  const direct = index.edgesBetween(authorId, recipientId).filter((e) => e.status === 'CONFIRMED');
  if (direct.some((e) => TIER3_TYPES.has(e.typeKey))) return 3;
  return null;
}
