/**
 * Core domain types of the relationship engine.
 *
 * The engine is deliberately framework-free: it receives plain data
 * (people, relationship edges, verification decisions) and returns plain data.
 * Persistence (PostgreSQL/Prisma), HTTP (NestJS) and rendering (Cytoscape)
 * are adapters around it.
 */

export type Locale = 'en' | 'de' | 'ar';

export type Gender = 'MALE' | 'FEMALE' | 'UNSPECIFIED';

/** Visual + semantic grouping. Drives colours in the graph. */
export type RelationshipCategory =
  | 'FAMILY'
  | 'UNION'
  | 'FRIENDSHIP'
  | 'PROFESSIONAL'
  | 'SOCIAL'
  | 'CUSTOM';

export type Directionality = 'SYMMETRIC' | 'DIRECTED';

export type VerificationStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'DISPUTED';

export type Decision = 'CONFIRM' | 'REJECT' | 'DISPUTE';

export type RelationshipVisibility = 'PUBLIC' | 'NETWORK' | 'FAMILY' | 'PRIVATE';

/** Side of a stored (canonical) edge. A = fromPerson, B = toPerson. */
export type Side = 'A' | 'B';

export type ParentSubtype = 'BIOLOGICAL' | 'ADOPTIVE' | 'STEP' | 'FOSTER' | 'GUARDIAN';
export type SiblingSubtype = 'FULL' | 'HALF' | 'STEP' | 'ADOPTIVE' | 'UNSPECIFIED';
export type LineageSide = 'PATERNAL' | 'MATERNAL' | 'UNSPECIFIED';
export type UnionEndReason = 'DIVORCE' | 'DEATH' | 'SEPARATION' | 'ANNULMENT';

/** A person node. One person = one node, with or without a user account. */
export interface PersonNode {
  id: string;
  displayName: string;
  gender: Gender;
  birthDate?: string | null; // ISO date
  deathDate?: string | null;
  /** User account that owns (has claimed) this person, if any. */
  userId?: string | null;
  /**
   * Users who manage this person's profile when it is not claimed
   * (e.g. a deceased ancestor or a young child managed by a parent).
   */
  stewardUserIds?: string[];
  /** Minor (child) profiles are protected: never public, never searchable by default. */
  isMinor?: boolean;
}

/** Optional typed attributes on an edge. */
export interface EdgeAttributes {
  parentSubtype?: ParentSubtype;
  siblingSubtype?: SiblingSubtype;
  lineageSide?: LineageSide;
  startDate?: string | null;
  endDate?: string | null;
  endReason?: UnionEndReason | null;
  customLabel?: string | null;
  customCategory?: Exclude<RelationshipCategory, 'CUSTOM' | 'UNION'> | null;
  note?: string | null;
}

/** A stored relationship in canonical form. */
export interface RelationshipEdge {
  id: string;
  typeKey: string; // canonical key from the catalog (e.g. PARENT)
  fromId: string; // person A
  toId: string; // person B
  status: VerificationStatus;
  visibility: RelationshipVisibility;
  createdByUserId: string;
  createdAt?: string;
  attributes?: EdgeAttributes;
}

export interface VerificationDecision {
  side: Side;
  userId: string;
  decision: Decision;
  at: string; // ISO timestamp
}

export interface LocalizedLabel {
  neutral: string;
  male?: string;
  female?: string;
}

export type LabelSet = Record<Locale, LocalizedLabel>;
