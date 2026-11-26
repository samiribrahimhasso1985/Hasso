import { EngineError, getType } from './catalog';
import type { Decision, PersonNode, RelationshipEdge, Side, VerificationDecision, VerificationStatus } from './types';

/**
 * Who may speak for a person in verification:
 *  – the person's own account, if the profile is claimed;
 *  – otherwise the profile's stewards (e.g. parents of a young child,
 *    relatives curating a deceased ancestor).
 * A claimed profile is never confirmed by anyone else.
 */
export function confirmersOf(person: PersonNode): string[] {
  if (person.userId) return [person.userId];
  return [...new Set(person.stewardUserIds ?? [])];
}

export function sidesUserCanDecide(edge: RelationshipEdge, from: PersonNode, to: PersonNode, userId: string): Side[] {
  const sides: Side[] = [];
  if (confirmersOf(from).includes(userId)) sides.push('A');
  if (confirmersOf(to).includes(userId)) sides.push('B');
  return sides;
}

/**
 * Only people who speak for at least one side may create a relationship.
 * This stops strangers from attaching claims to someone's profile.
 */
export function assertCanCreate(from: PersonNode, to: PersonNode, userId: string): void {
  if (!confirmersOf(from).includes(userId) && !confirmersOf(to).includes(userId)) {
    throw new EngineError(
      'NOT_A_PARTY',
      'You can only create relationships for yourself or for profiles you manage',
    );
  }
}

/** Latest decision per (side, user). */
function latestDecisions(decisions: VerificationDecision[]): VerificationDecision[] {
  const map = new Map<string, VerificationDecision>();
  for (const d of [...decisions].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0))) {
    map.set(`${d.side}:${d.userId}`, d);
  }
  return [...map.values()];
}

/**
 * Computes the verification status from the decision log.
 *
 * Precedence: REJECTED > DISPUTED > CONFIRMED > PENDING.
 * CONFIRMED requires each side to be confirmed by one of its confirmers.
 * For SENSITIVE types (parentage, siblings, unions, extended family) the two
 * sides must be confirmed by two *different* users: a single person can never
 * verify a family fact alone, even when they manage both profiles.
 */
export function computeStatus(
  edge: Pick<RelationshipEdge, 'typeKey'>,
  from: PersonNode,
  to: PersonNode,
  decisions: VerificationDecision[],
): VerificationStatus {
  const sensitive = getType(edge.typeKey).sensitive;
  const valid = latestDecisions(decisions).filter((d) =>
    (d.side === 'A' ? confirmersOf(from) : confirmersOf(to)).includes(d.userId),
  );
  if (valid.some((d) => d.decision === 'REJECT')) return 'REJECTED';
  if (valid.some((d) => d.decision === 'DISPUTE')) return 'DISPUTED';

  const confA = valid.filter((d) => d.side === 'A' && d.decision === 'CONFIRM').map((d) => d.userId);
  const confB = valid.filter((d) => d.side === 'B' && d.decision === 'CONFIRM').map((d) => d.userId);
  if (!confA.length || !confB.length) return 'PENDING';
  if (!sensitive) return 'CONFIRMED';
  const distinct = confA.some((a) => confB.some((b) => a !== b));
  return distinct ? 'CONFIRMED' : 'PENDING';
}

/** Decisions automatically recorded for the creator at creation time. */
export function creatorDecisions(
  from: PersonNode,
  to: PersonNode,
  creatorUserId: string,
  at: string,
): VerificationDecision[] {
  const out: VerificationDecision[] = [];
  if (confirmersOf(from).includes(creatorUserId)) out.push({ side: 'A', userId: creatorUserId, decision: 'CONFIRM', at });
  if (confirmersOf(to).includes(creatorUserId)) out.push({ side: 'B', userId: creatorUserId, decision: 'CONFIRM', at });
  return out;
}

/**
 * Validates and records a decision. Returns the decisions to append
 * (one per side the user can speak for) and the resulting status.
 */
export function applyDecision(
  edge: RelationshipEdge,
  from: PersonNode,
  to: PersonNode,
  existing: VerificationDecision[],
  userId: string,
  decision: Decision,
  at: string,
): { added: VerificationDecision[]; status: VerificationStatus } {
  if (edge.status === 'REJECTED') {
    throw new EngineError('ALREADY_REJECTED', 'A rejected relationship is closed; create a new request instead');
  }
  const sides = sidesUserCanDecide(edge, from, to, userId);
  if (!sides.length) throw new EngineError('NOT_A_CONFIRMER', 'You cannot decide on this relationship');
  const added = sides.map((side) => ({ side, userId, decision, at }));
  return { added, status: computeStatus(edge, from, to, [...existing, ...added]) };
}

/** Sides that still need a confirmation from someone (for "awaiting your confirmation" lists). */
export function pendingSides(
  edge: RelationshipEdge,
  from: PersonNode,
  to: PersonNode,
  decisions: VerificationDecision[],
): Side[] {
  const latest = latestDecisions(decisions);
  const confirmed = (side: Side, people: string[]) =>
    latest.some((d) => d.side === side && d.decision === 'CONFIRM' && people.includes(d.userId));
  const sides: Side[] = [];
  if (!confirmed('A', confirmersOf(from))) sides.push('A');
  if (!confirmed('B', confirmersOf(to))) sides.push('B');
  if (!sides.length && computeStatus(edge, from, to, decisions) === 'PENDING') {
    // Sensitive edge confirmed on both sides by the same single user:
    // any side that has another possible confirmer is still waiting for them.
    const confirmedBy = new Set(latest.filter((d) => d.decision === 'CONFIRM').map((d) => d.userId));
    if (confirmersOf(from).some((u) => !confirmedBy.has(u))) sides.push('A');
    if (confirmersOf(to).some((u) => !confirmedBy.has(u))) sides.push('B');
  }
  return sides;
}
