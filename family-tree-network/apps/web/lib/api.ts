import type { Locale } from './i18n';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export type Category = 'FAMILY' | 'UNION' | 'FRIENDSHIP' | 'PROFESSIONAL' | 'SOCIAL' | 'CUSTOM';
export type Status = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'DISPUTED';
export type Visibility = 'PUBLIC' | 'NETWORK' | 'FAMILY' | 'PRIVATE';
export type Gender = 'MALE' | 'FEMALE' | 'UNSPECIFIED';

export interface PersonSummary {
  id: string;
  displayName: string;
  gender: Gender;
  avatarUrl: string | null;
  isMinor: boolean;
  claimed: boolean;
  deceased: boolean;
}

export interface GraphNode extends PersonSummary {
  depth: number;
  generation: number | null;
  hiddenNeighbours: number;
  kinship: { key: string; kind: string; label: string } | null;
  isViewer: boolean;
}

export interface GraphEdge {
  id: string;
  typeKey: string;
  category: Category;
  color: string;
  status: Status;
  visibility: Visibility;
  source: string;
  target: string;
  directed: boolean;
  sensitive: boolean;
  label: string;
  inverseLabel: string;
  attributes: Record<string, string | null | undefined>;
}

export interface EgoGraph {
  centerId: string;
  focusId: string;
  truncated: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  legend: Record<Category, string>;
}

export type PathResult =
  | { found: false; message: string }
  | {
      found: true;
      fullyVerified: boolean;
      people: PersonSummary[];
      steps: { edgeId: string; typeKey: string; category: Category; status: Status; color: string; fromPersonId: string; toPersonId: string; label: string }[];
      kinship: { label: string } | null;
    };

export interface RelationshipDetail extends GraphEdge {
  from: PersonSummary;
  to: PersonSummary;
  createdAt: string;
  createdByMe: boolean;
  verifications: { side: 'A' | 'B'; decision: string; comment: string | null; at: string; by: string | null }[];
  awaitingSides: ('A' | 'B')[];
  mySides: ('A' | 'B')[];
}

export interface ProfileDetail extends PersonSummary {
  fullName: string | null;
  birthDate: string | null;
  deathDate: string | null;
  country: string | null;
  city: string | null;
  bio: string | null;
  languages: string[];
  canManage: boolean;
}

export interface Session {
  accessToken: string;
  userId: string;
  profileId: string;
  displayName: string;
  email: string;
}

export interface RelationshipTypeInfo {
  key: string;
  category: Category;
  directionality: 'SYMMETRIC' | 'DIRECTED';
  sensitive: boolean;
  label: { neutral: string; male?: string; female?: string } | null;
  inverseLabel: { neutral: string; male?: string; female?: string } | null;
}

export interface IdentityMe {
  ezidId: string;
  displayName: string;
  qrEnabled: boolean;
  discoverable: boolean;
  qr: { token: string; createdAt: string; expiresAt: string | null } | null;
}

export interface QrResolution {
  person: PersonSummary;
  ezidId: string | null;
  isSelf: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body: unknown,
  ) {
    super(message);
  }
}

export class Api {
  constructor(
    private token: string | null,
    private locale: Locale,
  ) {}

  async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(`${API_URL}${path}${sep}locale=${this.locale}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, json.code ?? 'ERROR', json.message ?? res.statusText, json);
    return json as T;
  }

  login(email: string, password: string) {
    return this.req<Session>('POST', '/auth/login', { email, password });
  }
  register(body: { email: string; password: string; displayName: string; gender: Gender; locale: Locale }) {
    return this.req<Session>('POST', '/auth/register', body);
  }
  ego(params: { center?: string; depth?: number; categories?: Category[]; relativeTo?: string }) {
    const q = new URLSearchParams();
    if (params.center) q.set('center', params.center);
    if (params.depth) q.set('depth', String(params.depth));
    if (params.categories?.length) q.set('categories', params.categories.join(','));
    if (params.relativeTo) q.set('relativeTo', params.relativeTo);
    return this.req<EgoGraph>('GET', `/graph/ego?${q}`);
  }
  path(from: string, to: string, includePending: boolean) {
    return this.req<PathResult>('GET', `/graph/path?from=${from}&to=${to}&includePending=${includePending}`);
  }
  profile(id: string) {
    return this.req<ProfileDetail>('GET', `/profiles/${id}`);
  }
  search(q: string) {
    return this.req<(PersonSummary & { inMyFamily: boolean; connected: boolean })[]>('GET', `/profiles/search?q=${encodeURIComponent(q)}`);
  }
  managed() {
    return this.req<PersonSummary[]>('GET', '/profiles/managed');
  }
  createProfile(body: { displayName: string; gender: Gender; birthDate?: string; isMinor?: boolean }) {
    return this.req<ProfileDetail>('POST', '/profiles', body);
  }
  types() {
    return this.req<RelationshipTypeInfo[]>('GET', '/relationship-types');
  }
  relationship(id: string) {
    return this.req<RelationshipDetail>('GET', `/relationships/${id}`);
  }
  createRelationship(body: { personId: string; relatedPersonId: string; type: string; visibility?: Visibility; attributes?: Record<string, string> }) {
    return this.req<RelationshipDetail>('POST', '/relationships', body);
  }
  decide(id: string, decision: 'CONFIRM' | 'REJECT' | 'DISPUTE') {
    return this.req<RelationshipDetail>('POST', `/relationships/${id}/decision`, { decision });
  }
  updateRelationship(id: string, body: { visibility?: Visibility }) {
    return this.req<RelationshipDetail>('PATCH', `/relationships/${id}`, body);
  }
  deleteRelationship(id: string) {
    return this.req<{ deleted: boolean }>('DELETE', `/relationships/${id}`);
  }
  awaiting() {
    return this.req<RelationshipDetail[]>('GET', '/relationships/awaiting-me');
  }
  identityMe() {
    return this.req<IdentityMe>('GET', '/identity/me');
  }
  createQr(kind: 'PERSONAL' | 'TEMPORARY' = 'PERSONAL') {
    return this.req<{ token: string }>('POST', '/identity/qr', { kind });
  }
  revokeQr() {
    return this.req<{ revoked: number }>('DELETE', '/identity/qr');
  }
  identitySettings(body: { qrEnabled?: boolean; discoverable?: boolean }) {
    return this.req<IdentityMe>('PATCH', '/identity/settings', body);
  }
  resolveQr(token: string) {
    return this.req<QrResolution>('GET', `/qr/${encodeURIComponent(token)}`);
  }
}
