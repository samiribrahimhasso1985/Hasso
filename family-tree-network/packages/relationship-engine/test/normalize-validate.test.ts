import { describe, expect, it } from 'vitest';
import { ALIASES, EngineError, GraphIndex, RELATIONSHIP_TYPES, normalizeRelationship, validateNewRelationship } from '../src';
import { demoNetwork, person, rel } from './fixtures';

const codes = (g: GraphIndex, subject: string, type: string, related: string, attributes = {}) =>
  validateNewRelationship(g, normalizeRelationship({ personId: subject, relatedPersonId: related, type, attributes })).map(
    (v) => v.code,
  );

describe('catalog', () => {
  it('covers every relationship category required by the specification', () => {
    const cats = new Set(RELATIONSHIP_TYPES.map((t) => t.category));
    expect([...cats].sort()).toEqual(['CUSTOM', 'FAMILY', 'FRIENDSHIP', 'PROFESSIONAL', 'SOCIAL', 'UNION']);
    for (const word of [
      'FATHER', 'MOTHER', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER', 'GRANDFATHER', 'GRANDMOTHER', 'GRANDSON',
      'GRANDDAUGHTER', 'UNCLE', 'AUNT', 'COUSIN', 'NEPHEW', 'NIECE', 'HUSBAND', 'WIFE', 'SPOUSE', 'PARTNER',
      'FORMER_SPOUSE', 'FRIEND', 'CLOSE_FRIEND', 'CHILDHOOD_FRIEND', 'SCHOOL_FRIEND', 'NEIGHBOR', 'ACQUAINTANCE',
      'TRAVEL_FRIEND', 'COLLEAGUE', 'MANAGER', 'EMPLOYEE', 'BUSINESS_PARTNER', 'FORMER_COLLEAGUE',
      'PROFESSIONAL_CONTACT', 'CUSTOM',
    ]) {
      expect(ALIASES[word], word).toBeDefined();
    }
  });

  it('every type has labels in all three languages', () => {
    for (const t of RELATIONSHIP_TYPES) {
      for (const l of ['en', 'de', 'ar'] as const) {
        expect(t.labels[l].neutral).toBeTruthy();
        expect(t.inverseLabels[l].neutral).toBeTruthy();
      }
    }
  });
});

describe('normalizeRelationship', () => {
  it('stores "Layla is the MOTHER of Omar" as PARENT layla → omar', () => {
    const n = normalizeRelationship({ personId: 'omar', relatedPersonId: 'layla', type: 'mother' });
    expect(n).toMatchObject({ typeKey: 'PARENT', fromId: 'layla', toId: 'omar', impliedGender: 'FEMALE' });
    expect(n.attributes.parentSubtype).toBe('BIOLOGICAL');
  });

  it('stores children and employees in the same canonical direction', () => {
    expect(normalizeRelationship({ personId: 'omar', relatedPersonId: 'adam', type: 'SON' })).toMatchObject({
      typeKey: 'PARENT', fromId: 'omar', toId: 'adam',
    });
    expect(normalizeRelationship({ personId: 'thomas', relatedPersonId: 'omar', type: 'EMPLOYEE' })).toMatchObject({
      typeKey: 'MANAGES', fromId: 'thomas', toId: 'omar',
    });
  });

  it('orders symmetric pairs so each pair has one stable key', () => {
    const a = normalizeRelationship({ personId: 'zed', relatedPersonId: 'amy', type: 'FRIEND' });
    const b = normalizeRelationship({ personId: 'amy', relatedPersonId: 'zed', type: 'FRIEND' });
    expect([a.fromId, a.toId]).toEqual(['amy', 'zed']);
    expect([b.fromId, b.toId]).toEqual(['amy', 'zed']);
  });

  it('FORMER_SPOUSE becomes an ended SPOUSE union', () => {
    const n = normalizeRelationship({ personId: 'a', relatedPersonId: 'b', type: 'FORMER_SPOUSE' });
    expect(n.typeKey).toBe('SPOUSE');
    expect(n.attributes.endReason).toBe('DIVORCE');
  });

  it('rejects self relationships, unknown types and unlabeled custom types', () => {
    expect(() => normalizeRelationship({ personId: 'a', relatedPersonId: 'a', type: 'FRIEND' })).toThrow(EngineError);
    expect(() => normalizeRelationship({ personId: 'a', relatedPersonId: 'b', type: 'ARCH_ENEMY' })).toThrow(/Unknown/);
    expect(() => normalizeRelationship({ personId: 'a', relatedPersonId: 'b', type: 'CUSTOM' })).toThrow(/label/);
    const c = normalizeRelationship({
      personId: 'a', relatedPersonId: 'b', type: 'CUSTOM', attributes: { customLabel: '  Godfather ', customCategory: 'SOCIAL' },
    });
    expect(c.attributes.customLabel).toBe('Godfather');
  });
});

describe('validateNewRelationship', () => {
  it('accepts a valid new relationship', () => {
    const g = demoNetwork();
    expect(codes(g, 'sara', 'FRIEND', 'daniel')).toEqual([]);
  });

  it('detects gender contradictions', () => {
    const g = demoNetwork();
    expect(codes(g, 'sara', 'BROTHER', 'rania')).toContain('GENDER_MISMATCH');
  });

  it('rejects duplicates but allows the same pair to have several different social ties', () => {
    const g = demoNetwork();
    expect(codes(g, 'omar', 'CLOSE_FRIEND', 'daniel')).toContain('DUPLICATE_RELATIONSHIP');
    expect(codes(g, 'daniel', 'CLOSE_FRIEND', 'omar')).toContain('DUPLICATE_RELATIONSHIP');
    expect(codes(g, 'omar', 'COLLEAGUE', 'daniel')).toEqual([]);
  });

  it('allows only one family-kinship fact per pair', () => {
    const g = demoNetwork();
    expect(codes(g, 'omar', 'BROTHER', 'khaled')).toEqual(
      expect.arrayContaining(['CONFLICTING_FAMILY_RELATIONSHIP']),
    );
  });

  it('prevents ancestry cycles', () => {
    const g = demoNetwork();
    // Ibrahim cannot be Omar's son: Ibrahim is Omar's grandfather.
    expect(codes(g, 'omar', 'SON', 'ibrahim')).toContain('ANCESTRY_CYCLE');
  });

  it('limits biological parents to two but allows adoptive and step parents', () => {
    const g = demoNetwork();
    g.addPerson(person('fatima', 'FEMALE', { birthDate: '1960-01-01' }));
    expect(codes(g, 'omar', 'MOTHER', 'fatima')).toContain('TOO_MANY_BIOLOGICAL_PARENTS');
    expect(codes(g, 'omar', 'MOTHER', 'fatima', { parentSubtype: 'ADOPTIVE' })).toEqual([]);
  });

  it('checks birth order for direct ancestors only', () => {
    const g = demoNetwork();
    g.addPerson(person('young', 'MALE', { birthDate: '2000-01-01' }));
    expect(codes(g, 'sara', 'GRANDFATHER', 'young')).toContain('ANCESTOR_YOUNGER_THAN_DESCENDANT');
    // a younger uncle is legitimate
    expect(codes(g, 'rania', 'UNCLE', 'young')).not.toContain('ANCESTOR_YOUNGER_THAN_DESCENDANT');
  });

  it('protects unions: no ancestors, no minors, valid dates; remarriage after divorce is allowed', () => {
    const g = demoNetwork();
    expect(codes(g, 'omar', 'SPOUSE', 'layla')).toContain('UNION_WITH_ANCESTOR');
    expect(codes(g, 'zaid', 'SPOUSE', 'markus')).toContain('MINOR_UNION');
    expect(codes(g, 'daniel', 'SPOUSE', 'julia', { startDate: '2020-01-01', endDate: '2019-01-01' })).toContain(
      'INVALID_DATE_RANGE',
    );
    // Omar and Lina are divorced → a new marriage between them is a new, valid union.
    expect(codes(g, 'omar', 'SPOUSE', 'lina', { startDate: '2024-01-01' })).toEqual([]);
    // Omar and Anna are married → a second active marriage record between them is a duplicate.
    expect(codes(g, 'omar', 'SPOUSE', 'anna')).toContain('DUPLICATE_RELATIONSHIP');
  });

  it('rejected edges do not block a new request', () => {
    const g = new GraphIndex([person('a', 'MALE'), person('b', 'FEMALE')]);
    rel(g, 'a', 'FRIEND', 'b', { status: 'REJECTED' });
    expect(codes(g, 'a', 'FRIEND', 'b')).toEqual([]);
  });
});
