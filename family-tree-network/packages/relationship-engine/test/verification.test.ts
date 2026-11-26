import { describe, expect, it } from 'vitest';
import {
  applyDecision,
  assertCanCreate,
  computeStatus,
  confirmersOf,
  creatorDecisions,
  pendingSides,
  type PersonNode,
  type RelationshipEdge,
  type VerificationDecision,
} from '../src';
import { person } from './fixtures';

const T = (n: number) => `2026-01-01T00:00:0${n}Z`;
const edge = (typeKey: string, fromId: string, toId: string): RelationshipEdge => ({
  id: 'x', typeKey, fromId, toId, status: 'PENDING', visibility: 'FAMILY', createdByUserId: 'u',
});

describe('verification', () => {
  const omar = person('omar', 'MALE');
  const julia = person('julia', 'FEMALE');
  const adam: PersonNode = person('adam', 'MALE', { userId: null, stewardUserIds: ['u_omar', 'u_anna'], isMinor: true });
  const ibrahim: PersonNode = person('ibrahim', 'MALE', { userId: null, stewardUserIds: ['u_omar'] });

  it('a claimed profile is represented only by its own account', () => {
    expect(confirmersOf(omar)).toEqual(['u_omar']);
    expect(confirmersOf(adam)).toEqual(['u_omar', 'u_anna']);
  });

  it('a request stays PENDING until the other person confirms', () => {
    const e = edge('COLLEAGUE', 'julia', 'omar');
    const d = creatorDecisions(julia, omar, 'u_omar', T(1));
    expect(d).toEqual([{ side: 'B', userId: 'u_omar', decision: 'CONFIRM', at: T(1) }]);
    expect(computeStatus(e, julia, omar, d)).toBe('PENDING');
    const r = applyDecision(e, julia, omar, d, 'u_julia', 'CONFIRM', T(2));
    expect(r.status).toBe('CONFIRMED');
  });

  it('the other person can reject; rejected requests are closed', () => {
    const e = edge('FRIEND', 'julia', 'omar');
    const d = creatorDecisions(julia, omar, 'u_omar', T(1));
    const r = applyDecision(e, julia, omar, d, 'u_julia', 'REJECT', T(2));
    expect(r.status).toBe('REJECTED');
    expect(() => applyDecision({ ...e, status: 'REJECTED' }, julia, omar, [...d, ...r.added], 'u_julia', 'CONFIRM', T(3))).toThrow(
      /rejected/,
    );
  });

  it('a confirmed relationship can be disputed and the dispute withdrawn', () => {
    const e = edge('SIBLING', 'julia', 'omar');
    let d: VerificationDecision[] = [
      { side: 'A', userId: 'u_julia', decision: 'CONFIRM', at: T(1) },
      { side: 'B', userId: 'u_omar', decision: 'CONFIRM', at: T(2) },
    ];
    expect(computeStatus(e, julia, omar, d)).toBe('CONFIRMED');
    d = [...d, { side: 'B', userId: 'u_omar', decision: 'DISPUTE', at: T(3) }];
    expect(computeStatus(e, julia, omar, d)).toBe('DISPUTED');
    d = [...d, { side: 'B', userId: 'u_omar', decision: 'CONFIRM', at: T(4) }];
    expect(computeStatus(e, julia, omar, d)).toBe('CONFIRMED');
  });

  it('sensitive family facts are never verified by a single person, even a steward of both sides', () => {
    // Omar manages his grandfather's profile and declares the parent link himself.
    const e = edge('PARENT', 'ibrahim', 'omar');
    const d = creatorDecisions(ibrahim, omar, 'u_omar', T(1));
    expect(d).toHaveLength(2); // he speaks for both sides…
    expect(computeStatus(e, ibrahim, omar, d)).toBe('PENDING'); // …but that is not verification.
  });

  it('a second, independent steward completes verification of a sensitive fact', () => {
    const e = edge('PARENT', 'omar', 'adam');
    const d = creatorDecisions(omar, adam, 'u_omar', T(1));
    expect(computeStatus(e, omar, adam, d)).toBe('PENDING');
    expect(pendingSides(e, omar, adam, d)).toEqual(['B']);
    const r = applyDecision(e, omar, adam, d, 'u_anna', 'CONFIRM', T(2));
    expect(r.status).toBe('CONFIRMED');
  });

  it('non-sensitive ties between two managed profiles can be confirmed by one steward', () => {
    const mila = person('mila', 'FEMALE', { userId: null, stewardUserIds: ['u_omar', 'u_anna'] });
    const e = edge('FRIEND', 'adam', 'mila');
    expect(computeStatus(e, adam, mila, creatorDecisions(adam, mila, 'u_anna', T(1)))).toBe('CONFIRMED');
  });

  it('decisions from people who cannot speak for a side are ignored or refused', () => {
    const e = edge('FRIEND', 'julia', 'omar');
    expect(() => applyDecision(e, julia, omar, [], 'u_stranger', 'CONFIRM', T(1))).toThrow(/cannot decide/);
    const forged: VerificationDecision[] = [
      { side: 'A', userId: 'u_stranger', decision: 'CONFIRM', at: T(1) },
      { side: 'B', userId: 'u_omar', decision: 'CONFIRM', at: T(1) },
    ];
    expect(computeStatus(e, julia, omar, forged)).toBe('PENDING');
  });

  it('only a party (or a steward of one) may create a relationship', () => {
    expect(() => assertCanCreate(julia, omar, 'u_stranger')).toThrow(/yourself/);
    expect(() => assertCanCreate(julia, omar, 'u_julia')).not.toThrow();
    expect(() => assertCanCreate(adam, julia, 'u_anna')).not.toThrow();
  });
});
