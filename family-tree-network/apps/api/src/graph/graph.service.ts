import { HttpStatus, Injectable } from '@nestjs/common';
import {
  CATEGORY_COLORS,
  GraphIndex,
  deriveKinship,
  edgeLabel,
  egoNetwork,
  findConnection,
  kinshipLabel,
  type Locale,
  type RelationshipCategory,
} from '@ftn/relationship-engine';
import type { AuthUser } from '../common/auth-user';
import { AppError } from '../common/errors.filter';
import { NO_CONNECTION } from '../common/locale';
import { GraphLoader, type Loaded } from './graph-loader.service';
import { canSeePerson, edgeDto, personSummary } from './present';

const notFound = () => new AppError(HttpStatus.NOT_FOUND, 'PERSON_NOT_FOUND', 'Person not found');

@Injectable()
export class GraphService {
  constructor(private readonly loader: GraphLoader) {}

  private fresh(): Loaded {
    return { index: new GraphIndex(), profiles: new Map() };
  }

  private assertVisible(loaded: Loaded, ctx: Awaited<ReturnType<GraphLoader['viewer']>>, id: string) {
    const p = loaded.profiles.get(id);
    if (!p || !canSeePerson(ctx, { ...p, stewardUserIds: p.stewards.map((s) => s.userId) })) throw notFound();
  }

  private kinshipFor(index: GraphIndex, fromId: string, toId: string, locale: Locale) {
    if (fromId === toId) return null;
    const k = deriveKinship(index, fromId, toId);
    if (k.key === 'NONE') return null;
    return { key: k.key, kind: k.kind, label: kinshipLabel(k, index.person(toId)?.gender ?? 'UNSPECIFIED', locale) };
  }

  /** Ego network around `centerId` as visible to the viewer (unit of progressive loading). */
  async ego(user: AuthUser, centerId: string, opts: { depth: number; categories?: RelationshipCategory[]; includePending: boolean; locale: Locale }) {
    const loaded = this.fresh();
    const ctx = await this.loader.viewer(user, loaded);
    await this.loader.neighbourhood([centerId], opts.depth + 1, { into: loaded, maxNodes: 1500 });
    await this.loader.ancestry([centerId], loaded);
    this.assertVisible(loaded, ctx, centerId);
    const visible = this.loader.visibleIndex(loaded, ctx);
    const ego = egoNetwork(visible, centerId, {
      depth: opts.depth,
      categories: opts.categories,
      includePending: opts.includePending,
      maxNodes: 400,
    });
    return {
      centerId,
      truncated: ego.truncated,
      nodes: ego.nodes.map((n) => {
        const p = loaded.profiles.get(n.id)!;
        return {
          ...personSummary(p),
          depth: n.depth,
          generation: n.generation,
          hiddenNeighbours: n.hiddenNeighbours,
          kinship: this.kinshipFor(visible, centerId, n.id, opts.locale),
          isViewer: n.id === user.profileId,
        };
      }),
      edges: ego.edges.map((e) => edgeDto(e, visible, opts.locale)),
      legend: CATEGORY_COLORS,
    };
  }

  /** "How Are We Connected?" */
  async path(user: AuthUser, fromId: string, toId: string, opts: { categories?: RelationshipCategory[]; includePending: boolean; locale: Locale }) {
    const loaded = this.fresh();
    const ctx = await this.loader.viewer(user, loaded);
    await this.loader.neighbourhood([fromId], 4, { into: loaded, maxNodes: 4000 });
    await this.loader.neighbourhood([toId], 4, { into: loaded, maxNodes: 4000 });
    this.assertVisible(loaded, ctx, fromId);
    this.assertVisible(loaded, ctx, toId);
    const visible = this.loader.visibleIndex(loaded, ctx);
    const p = findConnection(visible, fromId, toId, {
      categories: opts.categories,
      includePending: opts.includePending,
      maxHops: 8,
    });
    if (!p) return { found: false as const, message: NO_CONNECTION[opts.locale] };
    return {
      found: true as const,
      fullyVerified: p.fullyVerified,
      people: p.personIds.map((id) => personSummary(loaded.profiles.get(id)!)),
      steps: p.steps.map((s) => {
        const e = visible.edges.get(s.edgeId)!;
        return {
          ...s,
          color: CATEGORY_COLORS[s.category],
          /** "<toPerson> is the <label> of <fromPerson>" */
          label: edgeLabel(e, s.fromPersonId, visible.person(s.toPersonId)!.gender, opts.locale),
        };
      }),
      kinship: this.kinshipFor(visible, fromId, toId, opts.locale),
    };
  }
}
