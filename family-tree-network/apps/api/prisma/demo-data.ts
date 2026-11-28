/**
 * DEVELOPMENT DEMO DATA — fictional people, never loaded in production.
 * One central person (Omar) connected to two family branches (Haddad, Nasser),
 * a family he married into (Weber), a former marriage, and social/professional circles.
 */
export const DEMO_PASSWORD = 'demo-password-2026';
export const DEMO_EMAIL_DOMAIN = 'demo.ftn.local';

export interface DemoPerson {
  key: string;
  displayName: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE';
  birthDate?: string;
  deathDate?: string;
  country: string;
  city?: string;
  bio?: string;
  languages?: string[];
  /** No account: profile managed by stewards (child, deceased ancestor). */
  managedBy?: string[];
  isMinor?: boolean;
}

export const DEMO_PEOPLE: DemoPerson[] = [
  { key: 'ibrahim', displayName: 'Ibrahim', fullName: 'Ibrahim Haddad', gender: 'MALE', birthDate: '1931-03-01', deathDate: '2009-11-02', country: 'SY', managedBy: ['khaled', 'mahmoud'], bio: 'Family patriarch.' },
  { key: 'khaled', displayName: 'Khaled', fullName: 'Khaled Haddad', gender: 'MALE', birthDate: '1958-05-10', country: 'DE', city: 'Köln', languages: ['ar', 'de'] },
  { key: 'layla', displayName: 'Layla', fullName: 'Layla Haddad', gender: 'FEMALE', birthDate: '1962-09-21', country: 'DE', city: 'Köln', languages: ['ar', 'de'] },
  { key: 'mahmoud', displayName: 'Mahmoud', fullName: 'Mahmoud Haddad', gender: 'MALE', birthDate: '1961-01-15', country: 'SE', languages: ['ar', 'sv'] },
  { key: 'nadia', displayName: 'Nadia', fullName: 'Nadia Nasser', gender: 'FEMALE', birthDate: '1965-07-07', country: 'JO', languages: ['ar', 'en'] },
  { key: 'omar', displayName: 'Omar', fullName: 'Omar Haddad', gender: 'MALE', birthDate: '1988-04-02', country: 'DE', city: 'Berlin', languages: ['ar', 'de', 'en'], bio: 'Engineer, father of three, collector of family stories.' },
  { key: 'sara', displayName: 'Sara', fullName: 'Sara Haddad', gender: 'FEMALE', birthDate: '1991-12-12', country: 'DE', city: 'Hamburg', languages: ['ar', 'de'] },
  { key: 'karim', displayName: 'Karim', fullName: 'Karim Haddad', gender: 'MALE', birthDate: '1990-02-02', country: 'SE', languages: ['ar', 'sv', 'en'] },
  { key: 'rania', displayName: 'Rania', fullName: 'Rania Nasser', gender: 'FEMALE', birthDate: '1993-03-03', country: 'JO', languages: ['ar', 'en'] },
  { key: 'anna', displayName: 'Anna', fullName: 'Anna Haddad-Weber', gender: 'FEMALE', birthDate: '1990-06-06', country: 'DE', city: 'Berlin', languages: ['de', 'en', 'ar'] },
  { key: 'peter', displayName: 'Peter', fullName: 'Peter Weber', gender: 'MALE', birthDate: '1960-01-01', country: 'DE', city: 'München', languages: ['de'] },
  { key: 'maria', displayName: 'Maria', fullName: 'Maria Weber', gender: 'FEMALE', birthDate: '1962-02-02', country: 'DE', city: 'München', languages: ['de'] },
  { key: 'lina', displayName: 'Lina', fullName: 'Lina Saleh', gender: 'FEMALE', birthDate: '1989-08-08', country: 'AT', languages: ['ar', 'de'] },
  { key: 'zaid', displayName: 'Zaid', fullName: 'Zaid Haddad', gender: 'MALE', birthDate: '2011-05-05', country: 'AT', managedBy: ['omar', 'lina'], isMinor: true },
  { key: 'adam', displayName: 'Adam', fullName: 'Adam Haddad', gender: 'MALE', birthDate: '2016-01-20', country: 'DE', managedBy: ['omar', 'anna'], isMinor: true },
  { key: 'mila', displayName: 'Mila', fullName: 'Mila Haddad', gender: 'FEMALE', birthDate: '2019-10-10', country: 'DE', managedBy: ['omar', 'anna'], isMinor: true },
  { key: 'daniel', displayName: 'Daniel', fullName: 'Daniel Fischer', gender: 'MALE', country: 'DE', city: 'Berlin', languages: ['de', 'en'] },
  { key: 'hassan', displayName: 'Hassan', fullName: 'Hassan Ali', gender: 'MALE', country: 'SY', languages: ['ar'] },
  { key: 'julia', displayName: 'Julia', fullName: 'Julia Becker', gender: 'FEMALE', country: 'DE', city: 'Berlin', languages: ['de', 'en'] },
  { key: 'thomas', displayName: 'Thomas', fullName: 'Thomas Wagner', gender: 'MALE', country: 'DE', languages: ['de', 'en'] },
  { key: 'markus', displayName: 'Markus', fullName: 'Markus Klein', gender: 'MALE', country: 'DE', languages: ['de'] },
  { key: 'elif', displayName: 'Elif', fullName: 'Elif Yılmaz', gender: 'FEMALE', country: 'DE', city: 'Berlin', languages: ['tr', 'de'] },
];

export interface DemoRelation {
  /** "<related> is the <type> of <subject>" */
  subject: string;
  type: string;
  related: string;
  /** Which demo users have decided (defaults: every confirmer of both sides confirms). */
  outcome?: 'CONFIRMED' | 'PENDING' | 'REJECTED';
  visibility?: 'PUBLIC' | 'NETWORK' | 'FAMILY' | 'PRIVATE';
  attributes?: Record<string, string>;
}

export const DEMO_RELATIONS: DemoRelation[] = [
  // Haddad branch
  { subject: 'khaled', type: 'FATHER', related: 'ibrahim' },
  { subject: 'mahmoud', type: 'FATHER', related: 'ibrahim' },
  { subject: 'omar', type: 'FATHER', related: 'khaled' },
  { subject: 'omar', type: 'MOTHER', related: 'layla' },
  { subject: 'sara', type: 'FATHER', related: 'khaled' },
  { subject: 'sara', type: 'MOTHER', related: 'layla' },
  { subject: 'omar', type: 'SISTER', related: 'sara' },
  { subject: 'khaled', type: 'WIFE', related: 'layla', attributes: { startDate: '1986-06-01' } },
  { subject: 'karim', type: 'FATHER', related: 'mahmoud' },
  // Nasser branch (Layla's side)
  { subject: 'layla', type: 'SISTER', related: 'nadia' },
  { subject: 'rania', type: 'MOTHER', related: 'nadia' },
  // Omar's marriages and children
  { subject: 'omar', type: 'WIFE', related: 'anna', attributes: { startDate: '2015-05-20' } },
  { subject: 'omar', type: 'FORMER_SPOUSE', related: 'lina', attributes: { startDate: '2010-01-01', endDate: '2013-03-01', endReason: 'DIVORCE' } },
  { subject: 'zaid', type: 'FATHER', related: 'omar' },
  { subject: 'zaid', type: 'MOTHER', related: 'lina' },
  { subject: 'adam', type: 'FATHER', related: 'omar' },
  { subject: 'adam', type: 'MOTHER', related: 'anna' },
  { subject: 'mila', type: 'FATHER', related: 'omar' },
  { subject: 'mila', type: 'MOTHER', related: 'anna' },
  // Weber family (Anna's side)
  { subject: 'anna', type: 'FATHER', related: 'peter' },
  { subject: 'anna', type: 'MOTHER', related: 'maria' },
  { subject: 'peter', type: 'WIFE', related: 'maria' },
  // Social & professional circles
  { subject: 'omar', type: 'CLOSE_FRIEND', related: 'daniel', visibility: 'PUBLIC' },
  { subject: 'omar', type: 'CHILDHOOD_FRIEND', related: 'hassan' },
  { subject: 'omar', type: 'COLLEAGUE', related: 'julia' },
  { subject: 'anna', type: 'SCHOOL_FRIEND', related: 'julia' },
  { subject: 'omar', type: 'MANAGER', related: 'thomas' },
  { subject: 'omar', type: 'ACQUAINTANCE', related: 'markus' },
  { subject: 'omar', type: 'NEIGHBOR', related: 'elif' },
  { subject: 'karim', type: 'TRAVEL_FRIEND', related: 'daniel' },
  // Verification states for the demo
  { subject: 'omar', type: 'SCHOOL_FRIEND', related: 'rania', outcome: 'PENDING' },
  { subject: 'omar', type: 'COUSIN', related: 'markus', outcome: 'REJECTED' },
];

export const DEMO_COMMUNITIES = [
  { key: 'haddad', kind: 'FAMILY' as const, name: 'Haddad Family', members: ['ibrahim', 'khaled', 'layla', 'mahmoud', 'omar', 'sara', 'karim', 'anna', 'adam', 'mila', 'zaid'], admins: ['khaled'] },
  { key: 'nasser', kind: 'FAMILY' as const, name: 'Nasser Family', members: ['layla', 'nadia', 'rania'], admins: ['nadia'] },
  { key: 'weber', kind: 'FAMILY' as const, name: 'Familie Weber', members: ['peter', 'maria', 'anna'], admins: ['peter'] },
  { key: 'work', kind: 'WORK' as const, name: 'Nordlicht Engineering Team', members: ['omar', 'julia', 'thomas'], admins: ['thomas'] },
];
