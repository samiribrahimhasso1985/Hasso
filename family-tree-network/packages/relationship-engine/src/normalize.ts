import { ALIASES, EngineError, getType } from './catalog';
import type { EdgeAttributes, Gender } from './types';

/**
 * A relationship request as a human expresses it:
 * "<relatedPersonId> is the <type> of <personId>", e.g. "Layla is the MOTHER of Omar".
 */
export interface RelationshipInput {
  personId: string;
  relatedPersonId: string;
  type: string; // canonical key or alias (FATHER, WIFE, EMPLOYEE, …)
  attributes?: EdgeAttributes;
}

export interface NormalizedRelationship {
  typeKey: string;
  fromId: string;
  toId: string;
  attributes: EdgeAttributes;
  /** Gender implied by the word used; checked against the related person's profile. */
  impliedGender?: Exclude<Gender, 'UNSPECIFIED'>;
  impliedGenderPersonId?: string;
}

/**
 * Converts a human-phrased request into the canonical stored form.
 * Symmetric edges are ordered (fromId < toId) so that each pair has one stable key,
 * which is what the database uniqueness constraint relies on.
 */
export function normalizeRelationship(input: RelationshipInput): NormalizedRelationship {
  const key = input.type.trim().toUpperCase();
  const alias = ALIASES[key];
  if (!alias) throw new EngineError('UNKNOWN_TYPE', `Unknown relationship type: ${input.type}`);
  if (input.personId === input.relatedPersonId) {
    throw new EngineError('SELF_RELATIONSHIP', 'A person cannot have a relationship with themselves');
  }
  const def = getType(alias.canonical);
  const attributes: EdgeAttributes = { ...(input.attributes ?? {}) };

  let fromId: string;
  let toId: string;
  if (def.directionality === 'DIRECTED') {
    if (alias.relatedIs === 'from') {
      fromId = input.relatedPersonId;
      toId = input.personId;
    } else {
      fromId = input.personId;
      toId = input.relatedPersonId;
    }
  } else {
    [fromId, toId] = [input.personId, input.relatedPersonId].sort();
  }

  if (alias.ended) {
    if (!attributes.endReason) attributes.endReason = 'DIVORCE';
  }
  if (def.key === 'CUSTOM') {
    const label = attributes.customLabel?.trim();
    if (!label) throw new EngineError('CUSTOM_LABEL_REQUIRED', 'Custom relationships need a label');
    if (label.length > 60) throw new EngineError('CUSTOM_LABEL_TOO_LONG', 'Custom label is limited to 60 characters');
    attributes.customLabel = label;
  }
  if (def.key === 'PARENT' && !attributes.parentSubtype) attributes.parentSubtype = 'BIOLOGICAL';

  return {
    typeKey: def.key,
    fromId,
    toId,
    attributes,
    impliedGender: alias.gender,
    impliedGenderPersonId: alias.gender ? input.relatedPersonId : undefined,
  };
}

/** True if a union edge is finished (divorce, death, separation …). */
export function isEndedUnion(attributes?: EdgeAttributes): boolean {
  return Boolean(attributes?.endDate || attributes?.endReason);
}
