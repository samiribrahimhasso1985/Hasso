import {
  GraphIndex,
  normalizeRelationship,
  type EdgeAttributes,
  type Gender,
  type PersonNode,
  type RelationshipEdge,
  type RelationshipVisibility,
  type VerificationStatus,
} from '../src';

export function person(id: string, gender: Gender, extra: Partial<PersonNode> = {}): PersonNode {
  return { id, displayName: id, gender, userId: `u_${id}`, ...extra };
}

let seq = 0;
/** Adds "<related> is the <type> of <subject>" as a CONFIRMED edge (unless status given). */
export function rel(
  index: GraphIndex,
  subject: string,
  type: string,
  related: string,
  opts: { status?: VerificationStatus; attributes?: EdgeAttributes; visibility?: RelationshipVisibility } = {},
): RelationshipEdge {
  const n = normalizeRelationship({ personId: subject, relatedPersonId: related, type, attributes: opts.attributes });
  const e: RelationshipEdge = {
    id: `e${String(++seq).padStart(4, '0')}`,
    typeKey: n.typeKey,
    fromId: n.fromId,
    toId: n.toId,
    status: opts.status ?? 'CONFIRMED',
    visibility: opts.visibility ?? 'NETWORK',
    createdByUserId: `u_${subject}`,
    attributes: n.attributes,
  };
  index.addEdge(e);
  return e;
}

/**
 * Demo network (development data only).
 *
 *  Ibrahim ─┬─ (sons) Khaled, Mahmoud
 *  Khaled + Layla ─→ Omar, Sara         Mahmoud ─→ Karim        Layla's sister Nadia ─→ Rania
 *  Omar + Anna (married) ─→ Adam, Mila  Omar + Lina (divorced) ─→ Zaid
 *  Anna's parents: Peter + Maria Weber (another family)
 *  Social: Daniel (close friend), Hassan (childhood friend), Julia (colleague; Anna's school friend),
 *          Thomas (Omar's manager), Markus (acquaintance), Elif (neighbour)
 */
export function demoNetwork(): GraphIndex {
  seq = 0;
  const g = new GraphIndex([
    person('ibrahim', 'MALE', { birthDate: '1930-03-01', userId: null, stewardUserIds: ['u_khaled', 'u_mahmoud'] }),
    person('khaled', 'MALE', { birthDate: '1958-05-10' }),
    person('layla', 'FEMALE', { birthDate: '1962-09-21' }),
    person('mahmoud', 'MALE', { birthDate: '1961-01-15' }),
    person('nadia', 'FEMALE', { birthDate: '1965-07-07' }),
    person('omar', 'MALE', { birthDate: '1988-04-02' }),
    person('sara', 'FEMALE', { birthDate: '1991-12-12' }),
    person('karim', 'MALE', { birthDate: '1990-02-02' }),
    person('rania', 'FEMALE', { birthDate: '1993-03-03' }),
    person('anna', 'FEMALE', { birthDate: '1990-06-06' }),
    person('peter', 'MALE', { birthDate: '1960-01-01' }),
    person('maria', 'FEMALE', { birthDate: '1962-02-02' }),
    person('lina', 'FEMALE', { birthDate: '1989-08-08' }),
    person('zaid', 'MALE', { birthDate: '2011-05-05', isMinor: true, userId: null, stewardUserIds: ['u_omar', 'u_lina'] }),
    person('adam', 'MALE', { birthDate: '2016-01-20', isMinor: true, userId: null, stewardUserIds: ['u_omar', 'u_anna'] }),
    person('mila', 'FEMALE', { birthDate: '2019-10-10', isMinor: true, userId: null, stewardUserIds: ['u_omar', 'u_anna'] }),
    person('daniel', 'MALE'),
    person('hassan', 'MALE'),
    person('julia', 'FEMALE'),
    person('thomas', 'MALE'),
    person('markus', 'MALE'),
    person('elif', 'FEMALE'),
  ]);
  const fam = { visibility: 'FAMILY' as const };
  rel(g, 'khaled', 'FATHER', 'ibrahim', fam);
  rel(g, 'mahmoud', 'FATHER', 'ibrahim', fam);
  rel(g, 'omar', 'FATHER', 'khaled', fam);
  rel(g, 'omar', 'MOTHER', 'layla', fam);
  rel(g, 'sara', 'FATHER', 'khaled', fam);
  rel(g, 'sara', 'MOTHER', 'layla', fam);
  rel(g, 'khaled', 'WIFE', 'layla', { ...fam, attributes: { startDate: '1986-06-01' } });
  rel(g, 'karim', 'FATHER', 'mahmoud', fam);
  rel(g, 'layla', 'SISTER', 'nadia', fam);
  rel(g, 'rania', 'MOTHER', 'nadia', fam);
  rel(g, 'omar', 'WIFE', 'anna', { ...fam, attributes: { startDate: '2015-05-20' } });
  rel(g, 'omar', 'FORMER_SPOUSE', 'lina', { ...fam, attributes: { startDate: '2010-01-01', endDate: '2013-03-01', endReason: 'DIVORCE' } });
  rel(g, 'zaid', 'FATHER', 'omar', fam);
  rel(g, 'zaid', 'MOTHER', 'lina', fam);
  rel(g, 'adam', 'FATHER', 'omar', fam);
  rel(g, 'adam', 'MOTHER', 'anna', fam);
  rel(g, 'mila', 'FATHER', 'omar', fam);
  rel(g, 'mila', 'MOTHER', 'anna', fam);
  rel(g, 'anna', 'FATHER', 'peter', fam);
  rel(g, 'anna', 'MOTHER', 'maria', fam);
  rel(g, 'peter', 'WIFE', 'maria', fam);
  rel(g, 'omar', 'CLOSE_FRIEND', 'daniel');
  rel(g, 'omar', 'CHILDHOOD_FRIEND', 'hassan');
  rel(g, 'omar', 'COLLEAGUE', 'julia');
  rel(g, 'anna', 'SCHOOL_FRIEND', 'julia');
  rel(g, 'omar', 'MANAGER', 'thomas');
  rel(g, 'omar', 'ACQUAINTANCE', 'markus');
  rel(g, 'omar', 'NEIGHBOR', 'elif');
  return g;
}
