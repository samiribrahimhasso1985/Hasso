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
  /** Only for the owner: who may see the photo. */
  photoVisibility?: PhotoVisibility | null;
}

export type PhotoVisibility = 'PUBLIC' | 'NETWORK' | 'FAMILY' | 'PRIVATE';

/** Photo links from the API are relative to the API base (signed, valid ~1–2 hours). */
export const photoSrc = (path: string | null | undefined) => (path ? `${API_URL}${path}` : null);

export interface Session {
  accessToken: string;
  userId: string;
  profileId: string;
  displayName: string;
  email: string;
  emailVerified?: boolean;
  /** 'developer' when e-mails are shown in the local developer mailbox instead of being sent. */
  mailbox?: 'developer' | null;
}

export interface RegisterBody {
  email: string;
  password: string;
  displayName: string;
  gender: Gender;
  locale: Locale;
  country?: string;
  acceptTerms: boolean;
  consentSensitiveData: boolean;
  confirmMinimumAge: boolean;
}

export interface OutboxMessage {
  id: number;
  to: string;
  subject: string;
  text: string;
  link: string;
  createdAt: string;
}

/** Fired when the server says the session has ended (logout elsewhere, password reset, expiry). */
export const SESSION_ENDED_EVENT = 'ezidinet:session-ended';

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

// ── EZIDINET CONNECT (Phase 1) ──
export type Audience = 'EVERYONE' | 'FRIENDS_OF_FRIENDS' | 'FRIENDS' | 'NOBODY' | 'ONLY_ME';
export type PresenceStatus = 'ONLINE' | 'BUSY' | 'AWAY' | 'INVISIBLE' | 'OFFLINE';
export type StatusMode = 'ONLINE' | 'BUSY' | 'AWAY' | 'INVISIBLE';
export type FriendState = 'SELF' | 'NONE' | 'FRIENDS' | 'REQUEST_SENT' | 'REQUEST_RECEIVED' | 'DECLINED' | 'BLOCKED';
export interface Presence {
  status: PresenceStatus;
  lastSeen: string | null;
}
export interface ConnectPerson extends PersonSummary {
  presence: Presence | null;
}
export interface ConnectCard {
  person: PersonSummary;
  friendship: { state: FriendState; requestId: string | null };
  following: boolean;
  followsMe: boolean;
  followers: number;
  mutualFriends: { count: number; people: ConnectPerson[] };
  presence: Presence | null;
  can: { sendRequest: boolean; follow: boolean; unfollow: boolean; viewFriends: boolean };
}
export interface FriendRequest {
  id: string;
  state: 'PENDING';
  createdAt: string;
  person: ConnectPerson;
  mutualFriends: number;
}
export interface Suggestion extends ConnectPerson {
  reasons: { mutualFriends: number; sharedLanguages: string[] };
}
export interface ConnectSettings {
  friendRequestsFrom: Audience;
  followsFrom: Audience;
  presenceVisibleTo: Audience;
  friendListVisibleTo: Audience;
  showLastSeen: boolean;
  statusMode: StatusMode;
  options: Record<'friendRequestsFrom' | 'followsFrom' | 'presenceVisibleTo' | 'friendListVisibleTo', Audience[]>;
}
export interface Paged<T> {
  total: number;
  page: number;
  items: T[];
}

// ── Notifications (unified service) ──
export type NotificationCategory = 'RELATIONSHIPS' | 'FRIENDS' | 'FOLLOWS' | 'MESSAGES' | 'CALLS' | 'GROUPS' | 'EVENTS' | 'INVITATIONS' | 'LEARNING' | 'CREATORS' | 'COLLABORATION' | 'COMMUNITY' | 'SAFETY';
export interface AppNotification {
  id: string;
  category: NotificationCategory;
  type: string;
  entityType: string | null;
  entityId: string | null;
  data: Record<string, unknown> | null;
  silent: boolean;
  read: boolean;
  createdAt: string;
  actor: PersonSummary | null;
}
export interface NotificationPrefs {
  mutedCategories: NotificationCategory[];
  pushEnabled: boolean;
  quietStart: number | null;
  quietEnd: number | null;
  timeZone: string;
  dndUntil: string | null;
  categories: NotificationCategory[];
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
    if (!res.ok) {
      if (res.status === 401 && this.token && typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
      throw new ApiError(res.status, json.code ?? 'ERROR', json.message ?? res.statusText, json);
    }
    return json as T;
  }

  login(email: string, password: string) {
    return this.req<Session>('POST', '/auth/login', { email, password });
  }
  register(body: RegisterBody) {
    return this.req<Session>('POST', '/auth/register', body);
  }
  me() {
    return this.req<Omit<Session, 'accessToken'>>('GET', '/auth/me');
  }
  logout() {
    return this.req<void>('POST', '/auth/logout');
  }
  logoutAll() {
    return this.req<{ endedSessions: number }>('POST', '/auth/logout-all');
  }
  verifyEmail(token: string) {
    return this.req<{ verified: boolean }>('POST', '/auth/verify-email', { token });
  }
  resendVerification() {
    return this.req<{ sent?: boolean; alreadyVerified?: boolean }>('POST', '/auth/resend-verification');
  }
  forgotPassword(email: string) {
    return this.req<{ ok: boolean }>('POST', '/auth/forgot-password', { email, locale: this.locale });
  }
  resetPassword(token: string, password: string) {
    return this.req<{ ok: boolean }>('POST', '/auth/reset-password', { token, password });
  }
  setPhoto(image: string) {
    return this.req<{ avatarUrl: string; visibility: PhotoVisibility }>('PUT', '/profiles/me/photo', { image });
  }
  setPhotoVisibility(visibility: PhotoVisibility) {
    return this.req<{ visibility: PhotoVisibility }>('PATCH', '/profiles/me/photo', { visibility });
  }
  removePhoto() {
    return this.req<{ avatarUrl: null }>('DELETE', '/profiles/me/photo');
  }
  outbox(key?: string) {
    return this.req<{ messages: OutboxMessage[] }>('GET', `/dev/outbox${key ? `?key=${encodeURIComponent(key)}` : ''}`);
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
  // EZIDINET CONNECT
  connectSummary() {
    return this.req<{ incomingRequests: number; followers: number; friends: number }>('GET', '/connect/summary');
  }
  connectPerson(id: string) {
    return this.req<ConnectCard>('GET', `/connect/people/${id}`);
  }
  friends(page = 0) {
    return this.req<Paged<ConnectPerson>>('GET', `/connect/friends?page=${page}`);
  }
  friendsOf(id: string, page = 0) {
    return this.req<Paged<ConnectPerson>>('GET', `/connect/people/${id}/friends?page=${page}`);
  }
  sendFriendRequest(profileId: string) {
    return this.req<ConnectCard>('POST', '/connect/friends/requests', { profileId });
  }
  friendRequests(direction: 'incoming' | 'outgoing') {
    return this.req<FriendRequest[]>('GET', `/connect/friends/requests?direction=${direction}`);
  }
  acceptFriend(requestId: string) {
    return this.req<{ state: string }>('POST', `/connect/friends/requests/${requestId}/accept`);
  }
  rejectFriend(requestId: string) {
    return this.req<{ state: string }>('POST', `/connect/friends/requests/${requestId}/reject`);
  }
  cancelFriendRequest(requestId: string) {
    return this.req<{ state: string }>('DELETE', `/connect/friends/requests/${requestId}`);
  }
  removeFriend(profileId: string) {
    return this.req<{ state: string }>('DELETE', `/connect/friends/${profileId}`);
  }
  follow(profileId: string) {
    return this.req<{ following: boolean }>('POST', `/connect/follows/${profileId}`);
  }
  unfollow(profileId: string) {
    return this.req<{ following: boolean }>('DELETE', `/connect/follows/${profileId}`);
  }
  followers(page = 0) {
    return this.req<Paged<ConnectPerson>>('GET', `/connect/followers?page=${page}`);
  }
  following(page = 0) {
    return this.req<Paged<ConnectPerson>>('GET', `/connect/following?page=${page}`);
  }
  discover(q?: string) {
    return this.req<Suggestion[]>('GET', `/connect/discover${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  }
  connectSettings() {
    return this.req<ConnectSettings>('GET', '/connect/settings');
  }
  updateConnectSettings(body: Partial<Omit<ConnectSettings, 'options'>>) {
    return this.req<ConnectSettings>('PATCH', '/connect/settings', body);
  }
  heartbeat() {
    return this.req<{ status: StatusMode }>('POST', '/connect/presence');
  }
  notifications(before?: string) {
    return this.req<{ items: AppNotification[]; next: string | null; unread: number }>('GET', `/notifications${before ? `?before=${encodeURIComponent(before)}` : ''}`);
  }
  unreadNotifications() {
    return this.req<{ unread: number }>('GET', '/notifications/unread-count');
  }
  readNotification(id: string) {
    return this.req<{ unread: number }>('POST', `/notifications/${id}/read`);
  }
  readAllNotifications() {
    return this.req<{ unread: number }>('POST', '/notifications/read-all');
  }
  notificationPrefs() {
    return this.req<NotificationPrefs>('GET', '/notifications/preferences');
  }
  updateNotificationPrefs(body: { mutedCategories?: NotificationCategory[]; quietStart?: number | null; quietEnd?: number | null; timeZone?: string; dndMinutes?: number | null }) {
    return this.req<NotificationPrefs>('PATCH', '/notifications/preferences', body);
  }
  block(profileId: string) {
    return this.req<{ blocked: boolean }>('POST', '/blocks', { profileId });
  }
  unblock(profileId: string) {
    return this.req<{ blocked: boolean }>('DELETE', `/blocks/${profileId}`);
  }
}
