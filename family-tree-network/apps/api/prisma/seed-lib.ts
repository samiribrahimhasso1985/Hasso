import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  RELATIONSHIP_TYPES,
  computeStatus,
  confirmersOf,
  defaultVisibility,
  normalizeRelationship,
  type PersonNode,
  type VerificationDecision,
} from '@ftn/relationship-engine';
import { DEMO_COMMUNITIES, DEMO_EMAIL_DOMAIN, DEMO_PASSWORD, DEMO_PEOPLE, DEMO_RELATIONS } from './demo-data';
import { assignEzidId } from '../src/identity/ezid';

/** Seeds the relationship type catalog from the engine (idempotent; safe in every environment). */
export async function seedRelationshipTypes(prisma: PrismaClient) {
  for (const t of RELATIONSHIP_TYPES) {
    const data = {
      category: t.category,
      directionality: t.directionality,
      sensitive: t.sensitive,
      isUnion: Boolean(t.isUnion),
      kinshipUp: t.kinshipMove?.up ?? null,
      kinshipDown: t.kinshipMove?.down ?? null,
      defaultVisibility: t.defaultVisibility,
      labels: t.labels as object,
      inverseLabels: t.inverseLabels as object,
      sortOrder: t.sortOrder,
    };
    await prisma.relationshipType.upsert({ where: { key: t.key }, create: { key: t.key, ...data }, update: data });
  }
}

/** DEVELOPMENT ONLY: fictional demo network. Refuses to run in production. */
export async function seedDemo(prisma: PrismaClient, opts: { bcryptRounds?: number } = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo data must never be seeded in production');
  const hash = await bcrypt.hash(DEMO_PASSWORD, opts.bcryptRounds ?? 10);
  const userIds = new Map<string, string>();
  const profileIds = new Map<string, string>();

  const accounts = DEMO_PEOPLE.filter((p) => !p.managedBy);
  for (const p of accounts) {
    const u = await prisma.user.create({ data: { email: `${p.key}@${DEMO_EMAIL_DOMAIN}`, passwordHash: hash, locale: p.languages?.[0] === 'ar' ? 'ar' : 'de', emailVerifiedAt: new Date() } });
    userIds.set(p.key, u.id);
  }
  for (const p of DEMO_PEOPLE) {
    const prof = await prisma.profile.create({
      data: {
        userId: p.managedBy ? null : userIds.get(p.key),
        displayName: p.displayName,
        fullName: p.fullName,
        gender: p.gender,
        birthDate: p.birthDate ? new Date(`${p.birthDate}T00:00:00Z`) : null,
        deathDate: p.deathDate ? new Date(`${p.deathDate}T00:00:00Z`) : null,
        isMinor: Boolean(p.isMinor),
        searchable: !p.isMinor,
        country: p.country,
        city: p.city,
        bio: p.bio,
        languages: p.languages ?? [],
        createdById: userIds.get(p.managedBy?.[0] ?? p.key),
        stewards: p.managedBy
          ? { create: p.managedBy.map((k) => ({ userId: userIds.get(k)!, role: p.isMinor ? ('GUARDIAN' as const) : ('CURATOR' as const) })) }
          : undefined,
      },
    });
    profileIds.set(p.key, prof.id);
    if (!p.managedBy) await assignEzidId(prisma, prof.id); // account holders get an EZID ID
  }

  const node = (key: string): PersonNode => {
    const p = DEMO_PEOPLE.find((x) => x.key === key)!;
    return {
      id: profileIds.get(key)!,
      displayName: p.displayName,
      gender: p.gender,
      userId: p.managedBy ? null : userIds.get(key),
      stewardUserIds: (p.managedBy ?? []).map((k) => userIds.get(k)!),
      isMinor: p.isMinor,
    };
  };

  let t = Date.parse('2026-01-01T10:00:00Z');
  for (const r of DEMO_RELATIONS) {
    const n = normalizeRelationship({ personId: profileIds.get(r.subject)!, relatedPersonId: profileIds.get(r.related)!, type: r.type, attributes: r.attributes });
    const from = n.fromId === profileIds.get(r.subject) ? node(r.subject) : node(r.related);
    const to = from.id === n.fromId && from.id === profileIds.get(r.subject) ? node(r.related) : node(r.subject);
    const creator = userIds.get(r.subject) ?? confirmersOf(node(r.subject))[0];
    const decisions: VerificationDecision[] = [];
    const at = () => new Date((t += 60_000)).toISOString();
    for (const [side, person] of [['A', from], ['B', to]] as const) {
      const confirmers = confirmersOf(person);
      if (r.outcome === 'PENDING' && !confirmers.includes(creator)) continue;
      if (r.outcome === 'REJECTED' && !confirmers.includes(creator)) {
        decisions.push({ side, userId: confirmers[0], decision: 'REJECT', at: at() });
        continue;
      }
      for (const u of confirmers) decisions.push({ side, userId: u, decision: 'CONFIRM', at: at() });
    }
    const status = computeStatus({ typeKey: n.typeKey }, from, to, decisions);
    if (status !== (r.outcome ?? 'CONFIRMED')) throw new Error(`Seed inconsistency for ${r.subject} ${r.type} ${r.related}: ${status}`);
    const a = n.attributes;
    await prisma.relationship.create({
      data: {
        typeKey: n.typeKey,
        fromProfileId: n.fromId,
        toProfileId: n.toId,
        status,
        visibility: r.visibility ?? defaultVisibility(n.typeKey),
        createdById: creator,
        parentSubtype: a.parentSubtype,
        startDate: a.startDate ? new Date(`${a.startDate}T00:00:00Z`) : null,
        endDate: a.endDate ? new Date(`${a.endDate}T00:00:00Z`) : null,
        endReason: a.endReason ?? null,
        verifications: { create: decisions.map((d) => ({ side: d.side, userId: d.userId, decision: d.decision, createdAt: new Date(d.at) })) },
      },
    });
  }

  for (const c of DEMO_COMMUNITIES) {
    await prisma.community.create({
      data: {
        kind: c.kind,
        name: c.name,
        createdById: userIds.get(c.admins[0])!,
        memberships: {
          create: c.members.map((m) => ({ profileId: profileIds.get(m)!, role: c.admins.includes(m) ? ('ADMIN' as const) : ('MEMBER' as const) })),
        },
      },
    });
  }
  return { userIds, profileIds };
}

export async function wipe(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(
    'TRUNCATE "notifications", "notification_preferences", "follows", "connect_settings", "user_presence", "profile_photos", "login_throttles", "sessions", "auth_tokens", "consents", "qr_scan_events", "qr_tokens", "user_identifiers", "audit_logs", "blocks", "community_memberships", "communities", "relationship_verifications", "relationships", "privacy_settings", "profile_stewards", "profiles", "users" RESTART IDENTITY CASCADE',
  );
}
