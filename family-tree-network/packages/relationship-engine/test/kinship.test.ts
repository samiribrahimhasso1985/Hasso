import { describe, expect, it } from 'vitest';
import { GraphIndex, deriveKinship, edgeLabel, generations, kinshipLabel, type Locale } from '../src';
import { demoNetwork, person, rel } from './fixtures';

const label = (g: GraphIndex, from: string, to: string, locale: Locale = 'en') =>
  kinshipLabel(deriveKinship(g, from, to), g.person(to)!.gender, locale);

describe('kinship derivation (only from confirmed facts)', () => {
  const g = demoNetwork();

  it('direct family', () => {
    expect(label(g, 'omar', 'khaled')).toBe('Father');
    expect(label(g, 'omar', 'layla')).toBe('Mother');
    expect(label(g, 'khaled', 'omar')).toBe('Son');
    expect(label(g, 'omar', 'sara')).toBe('Sister');
    expect(label(g, 'omar', 'anna')).toBe('Wife');
    expect(label(g, 'omar', 'lina')).toBe('Former wife');
  });

  it('extended family is derived, never stored', () => {
    expect(label(g, 'omar', 'ibrahim')).toBe('Grandfather');
    expect(label(g, 'ibrahim', 'omar')).toBe('Grandson');
    expect(label(g, 'ibrahim', 'adam')).toBe('Great-grandson');
    expect(label(g, 'omar', 'mahmoud')).toBe('Uncle');
    expect(label(g, 'omar', 'nadia')).toBe('Aunt');
    expect(label(g, 'mahmoud', 'omar')).toBe('Nephew');
    expect(label(g, 'omar', 'karim')).toBe('First cousin');
    expect(label(g, 'omar', 'rania')).toBe('First cousin');
    expect(label(g, 'karim', 'adam')).toBe('First cousin once removed');
    expect(label(g, 'sara', 'adam')).toBe('Nephew');
  });

  it('children from different marriages are half-siblings', () => {
    expect(label(g, 'adam', 'mila')).toBe('Sister');
    expect(label(g, 'adam', 'zaid')).toBe('Half-brother');
    expect(label(g, 'zaid', 'mila')).toBe('Half-sister');
  });

  it('marrying into another family produces in-law relations on both sides', () => {
    expect(label(g, 'anna', 'khaled')).toBe('Father-in-law');
    expect(label(g, 'omar', 'peter')).toBe('Father-in-law');
    expect(label(g, 'peter', 'omar')).toBe('Son-in-law');
    expect(label(g, 'sara', 'anna')).toBe('Sister-in-law');
    expect(label(g, 'anna', 'sara')).toBe('Sister-in-law');
    expect(label(g, 'zaid', 'anna')).toBe('Stepmother');
    expect(label(g, 'anna', 'zaid')).toBe('Stepson');
    expect(label(g, 'peter', 'adam')).toBe('Grandson'); // Anna's side is blood family of Adam
    expect(deriveKinship(g, 'peter', 'khaled').key).toBe('NONE'); // co-parents-in-law: no invented label
  });

  it('a divorced spouse does not create in-law relations', () => {
    expect(deriveKinship(g, 'lina', 'khaled').key).toBe('NONE');
  });

  it('social and professional ties are not kinship', () => {
    expect(deriveKinship(g, 'omar', 'julia').key).toBe('NONE');
  });

  it('pending or disputed claims never produce a derived relationship', () => {
    const h = new GraphIndex([person('a', 'MALE'), person('b', 'MALE'), person('c', 'MALE')]);
    rel(h, 'b', 'FATHER', 'a');
    rel(h, 'c', 'FATHER', 'b', { status: 'PENDING' });
    expect(deriveKinship(h, 'c', 'a').key).toBe('NONE');
  });

  it('German labels', () => {
    expect(label(g, 'omar', 'khaled', 'de')).toBe('Vater');
    expect(label(g, 'omar', 'rania', 'de')).toBe('Cousine');
    expect(label(g, 'omar', 'ibrahim', 'de')).toBe('Großvater');
    expect(label(g, 'adam', 'ibrahim', 'de')).toBe('Urgroßvater');
    expect(label(g, 'anna', 'sara', 'de')).toBe('Schwägerin');
    expect(label(g, 'adam', 'zaid', 'de')).toBe('Halbbruder');
  });

  it('Arabic distinguishes paternal and maternal relatives', () => {
    expect(label(g, 'omar', 'mahmoud', 'ar')).toBe('العم');
    expect(label(g, 'omar', 'nadia', 'ar')).toBe('الخالة');
    expect(label(g, 'omar', 'karim', 'ar')).toBe('ابن العم');
    expect(label(g, 'omar', 'rania', 'ar')).toBe('ابنة الخالة');
    expect(label(g, 'mahmoud', 'omar', 'ar')).toBe('ابن الأخ');
    expect(label(g, 'nadia', 'sara', 'ar')).toBe('ابنة الأخت');
    expect(label(g, 'omar', 'anna', 'ar')).toBe('الزوجة');
    expect(label(g, 'peter', 'omar', 'ar')).toBe('الصهر');
  });

  it('declared extended relations work when intermediates are unknown', () => {
    const h = new GraphIndex([person('x', 'MALE'), person('u', 'MALE'), person('c', 'FEMALE')]);
    rel(h, 'x', 'UNCLE', 'u', { attributes: { lineageSide: 'MATERNAL' } });
    rel(h, 'x', 'COUSIN', 'c');
    expect(label(h, 'x', 'u')).toBe('Uncle');
    expect(label(h, 'x', 'u', 'ar')).toBe('الخال');
    expect(label(h, 'x', 'c')).toBe('First cousin');
    expect(label(h, 'u', 'x')).toBe('Nephew');
  });

  it('adoptive links are labelled as such', () => {
    const h = new GraphIndex([person('kid', 'FEMALE'), person('mom', 'FEMALE'), person('step', 'MALE')]);
    rel(h, 'kid', 'MOTHER', 'mom', { attributes: { parentSubtype: 'ADOPTIVE' } });
    rel(h, 'kid', 'FATHER', 'step', { attributes: { parentSubtype: 'STEP' } });
    expect(label(h, 'kid', 'mom')).toBe('Mother (adoptive)');
    expect(label(h, 'kid', 'step')).toBe('Stepfather');
  });

  it('computes generations relative to the centre', () => {
    const gen = generations(g, 'omar');
    expect(gen.get('ibrahim')).toBe(-2);
    expect(gen.get('khaled')).toBe(-1);
    expect(gen.get('anna')).toBe(0);
    expect(gen.get('karim')).toBe(0);
    expect(gen.get('adam')).toBe(1);
    expect(gen.get('peter')).toBe(-1);
    expect(gen.has('julia')).toBe(false); // colleagues are not in the generational axis
  });
});

describe('edgeLabel', () => {
  const g = demoNetwork();
  const e = g.edgesBetween('omar', 'layla')[0];
  it('labels the other person from the subject perspective', () => {
    expect(edgeLabel(e, 'omar', 'FEMALE', 'en')).toBe('Mother');
    expect(edgeLabel(e, 'layla', 'MALE', 'en')).toBe('Son');
    expect(edgeLabel(e, 'omar', 'FEMALE', 'de')).toBe('Mutter');
    expect(edgeLabel(e, 'omar', 'FEMALE', 'ar')).toBe('الأم');
    const m = g.edgesBetween('omar', 'thomas')[0];
    expect(edgeLabel(m, 'omar', 'MALE', 'en')).toBe('Manager');
    expect(edgeLabel(m, 'thomas', 'MALE', 'en')).toBe('Employee');
    const ex = g.edgesBetween('omar', 'lina')[0];
    expect(edgeLabel(ex, 'omar', 'FEMALE', 'en')).toBe('Former wife');
  });
});
