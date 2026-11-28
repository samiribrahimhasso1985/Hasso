# Relationship Engine

Package: `packages/relationship-engine` (`@ftn/relationship-engine`). Pure TypeScript, no I/O, 53 unit tests.
It is the single source of truth for relationship semantics; the API and the UI never re-implement these rules.

## 1. Model

* **Person node** (`PersonNode`): id, display name, gender (`MALE | FEMALE | UNSPECIFIED`), optional birth/death date,
  `userId` (if claimed), `stewardUserIds` (if managed), `isMinor`.
* **Relationship edge** (`RelationshipEdge`): `typeKey`, `fromId` (A), `toId` (B), `status`, `visibility`,
  `createdByUserId`, typed `attributes`.
* Unlimited edges per person, any mix of categories. The same pair may hold several *different* ties
  (e.g. cousin **and** colleague) but only one family-kinship fact.

## 2. Type catalog (`catalog.ts`)

| Category (colour) | Canonical types | Direction | Sensitive |
|---|---|---|---|
| FAMILY (blue `#25A9FF`) | `PARENT` (from = parent) · `SIBLING` · `GRANDPARENT` · `UNCLE_AUNT` (from = uncle/aunt) · `COUSIN` | directed / symmetric | yes |
| UNION (pink `#FF4D91`) | `SPOUSE` · `PARTNER` · `FIANCE` | symmetric | yes |
| FRIENDSHIP (gold `#E8B94F`) | `FRIEND` · `CLOSE_FRIEND` · `CHILDHOOD_FRIEND` · `SCHOOL_FRIEND` · `TRAVEL_FRIEND` | symmetric | no |
| SOCIAL (green `#43D99A`) | `NEIGHBOR` · `ACQUAINTANCE` | symmetric | no |
| PROFESSIONAL (purple `#A56BFF`) | `COLLEAGUE` · `FORMER_COLLEAGUE` · `BUSINESS_PARTNER` · `PROFESSIONAL_CONTACT` · `MANAGES` (from = manager) | — | no |
| CUSTOM (grey) | `CUSTOM` + `customLabel` (≤ 60 chars) + chosen display category | symmetric | no |

Each type carries labels and inverse labels in **ar / de / en** with male/female/neutral forms, a default visibility and
(for family types) a *kinship move* `{up, down}` used by derivation.

The catalog seeds the `relationship_types` table; the table decides at runtime which types are **enabled**.

### Typed attributes

| Attribute | Applies to | Values |
|---|---|---|
| `parentSubtype` | PARENT | BIOLOGICAL (default) · ADOPTIVE · STEP · FOSTER · GUARDIAN |
| `siblingSubtype` | SIBLING | FULL · HALF · STEP · ADOPTIVE · UNSPECIFIED |
| `lineageSide` | declared GRANDPARENT / UNCLE_AUNT | PATERNAL · MATERNAL — drives Arabic عم/خال |
| `startDate`, `endDate`, `endReason` | unions | DIVORCE · DEATH · SEPARATION · ANNULMENT |
| `customLabel`, `customCategory` | CUSTOM | — |
| `note` | all | ≤ 500 chars |

## 3. Normalisation (`normalize.ts`)

Humans say “*Layla is the MOTHER of Omar*”. The API receives `{ personId: omar, relatedPersonId: layla, type: "MOTHER" }`
(“related is the TYPE of person”). Aliases map words to canonical form:

| Word | Stored as | Implied gender (validated) |
|---|---|---|
| FATHER / MOTHER / PARENT | `PARENT related → person` | M / F / — |
| SON / DAUGHTER / CHILD | `PARENT person → related` | M / F / — |
| BROTHER / SISTER / SIBLING | `SIBLING` (ordered pair) | M / F / — |
| GRANDFATHER … GRANDDAUGHTER | `GRANDPARENT` | |
| UNCLE / AUNT / NEPHEW / NIECE | `UNCLE_AUNT` | |
| HUSBAND / WIFE / SPOUSE | `SPOUSE` | |
| FORMER_SPOUSE | `SPOUSE` with `endReason = DIVORCE` | |
| MANAGER / EMPLOYEE | `MANAGES` | |

**Symmetric edges are stored with `fromId < toId`** so each pair has one stable key (enforced again by a DB trigger).

## 4. Structural validation (`validate.ts`)

Returns *all* violations; the API answers `409 VALIDATION_FAILED` with the list.

| Code | Rule |
|---|---|
| `GENDER_MISMATCH` | The word implies a gender that contradicts the profile (UNSPECIFIED never conflicts). |
| `DUPLICATE_RELATIONSHIP` | Same active fact already exists. Ended unions don't block remarriage; rejected requests don't block new ones. |
| `CONFLICTING_FAMILY_RELATIONSHIP` | A pair can hold only one family-kinship fact (not both PARENT and SIBLING). |
| `ANCESTRY_CYCLE` | Nobody can become an ancestor of their own ancestor. |
| `TOO_MANY_BIOLOGICAL_PARENTS` | Max two biological parents; adoptive/step/foster/guardian parents are unlimited. |
| `ANCESTOR_YOUNGER_THAN_DESCENDANT` | For direct lines only (an uncle may be younger than his nephew). |
| `INVALID_DATE_RANGE` | Union end before start. |
| `UNION_WITH_ANCESTOR` | No union between an ancestor and a descendant. |
| `MINOR_UNION` | No unions on protected minor profiles. |

Nothing here hardcodes a family shape: multiple marriages, polygamous/plural unions, adoption, blended families,
same-gender couples and unknown parents are all valid.

## 5. Verification (`verification.ts`)

Statuses: `PENDING`, `CONFIRMED`, `REJECTED`, `DISPUTED`.

* **Who speaks for a person (`confirmersOf`)**: the person's own account if claimed; otherwise the profile's stewards.
  A claimed profile is never confirmed by anyone else.
* **Who may create**: only someone who speaks for at least one side (`NOT_A_PARTY` otherwise). Strangers cannot attach
  claims to other people's profiles.
* **Decision log**: every decision is appended (`side`, `userId`, `decision`, time). The creator's confirmations are
  recorded automatically for the sides they speak for. The latest decision per (side, user) counts.
* **Status computation** (precedence REJECTED > DISPUTED > CONFIRMED > PENDING):
  * CONFIRMED needs a confirmation for **side A and side B**.
  * For **sensitive** types (all family and union types) the two sides must be confirmed by **two different users**.
    → *A single person can never verify a family fact alone*, even when they steward both profiles
    (e.g. a father adding his newborn: the co-parent, added as co-steward, completes verification).
  * REJECT by a confirmer closes the request permanently (a new request is possible).
  * DISPUTE can be raised on a confirmed edge; disputed edges are excluded from verified paths and kinship.
    Confirming again withdraws one's own dispute.

## 6. Kinship derivation (`kinship.ts`)

Only **CONFIRMED** edges are used — a derived relation is never more certain than its weakest stored fact.

Every family edge is a *move* of (up, down) generations when walked from one end to the other:

| Edge walked | Move |
|---|---|
| child → parent | (1, 0) |
| parent → child | (0, 1) |
| sibling ↔ sibling | (1, 1) |
| grandchild → grandparent (declared) | (2, 0) |
| nephew → uncle (declared) | (2, 1) |
| cousin ↔ cousin (declared) | (2, 2) |

A **blood walk** goes only up, then only down (going down-then-up would pass through a co-parent, not a common ancestor).
Uniform-cost search finds the minimal `(up, down)`:

| (up, down) | Relation |
|---|---|
| (0,0) | self |
| (n,0) | parent (n=1), grandparent (n=2), great-…grandparent (n−2 greats) |
| (0,n) | child, grandchild, great-…grandchild |
| (1,1) | sibling — **half** if exactly one shared parent while another parent is known, or subtype HALF |
| (n,1), n≥2 | uncle/aunt (n−2 greats) |
| (1,n), n≥2 | nephew/niece |
| (a,b), a,b≥2 | cousin of degree `min(a,b)−1`, removed `|a−b|` |

If no blood walk exists, **one active union hop** is tried (ended unions do not create in-laws):

* *target is the spouse of my relative R*: parent → **step-parent**, child → **child-in-law**, sibling → **sibling-in-law**,
  uncle/aunt → uncle/aunt (by marriage), else relative by marriage;
* *target is a relative of my spouse S*: parent → **parent-in-law**, child → **step-child**, sibling → **sibling-in-law**,
  else relative by marriage.

Landmarks recorded on the path feed precise labels: first parent's gender → **paternal/maternal side**
(Arabic عم/عمة vs خال/خالة, ابن العم vs ابن الخال), sibling's gender (ابن الأخ vs ابن الأخت),
non-biological parent links (“Mother (adoptive)”, Stepfather).

`generations(index, focus)` assigns −1 to parents, +1 to children, 0 to siblings/spouses/cousins; social contacts get none.

## 7. “How Are We Connected?” (`path.ts`)

* Breadth-first search for the fewest hops; deterministic tie-breaks; at equal length **family/union edges are preferred**.
* Default: **CONFIRMED edges only**. `includePending` adds pending edges but the result is then flagged
  `fullyVerified: false` and each step carries its status.
* Category filter (e.g. family + union only), viewer visibility filter, `maxHops` (API: 8).
* No path → `null`; the API returns `{ found: false, message: "No verified connection found" }` (localised).
  **The engine never invents a connection.**
* Each step returns the edge type, category, colour, status and a label “*B is the X of A*”; the API also returns the
  derived kinship between both ends when one exists.

Example (seeded demo): Karim → Peter = Karim → Daniel (travel friend) → Omar (close friend) → Anna (wife) → Peter (father).
Restricted to family/union: Karim → Mahmoud → Ibrahim → Khaled → Omar → Anna → Peter.

## 8. Visibility (`visibility.ts`)

Edge visibility levels: `PUBLIC`, `NETWORK`, `FAMILY`, `PRIVATE`.

| Rule | Effect |
|---|---|
| Blocks (either direction) | Edge and person hidden. |
| Parties (confirmers of either side) | Always see their own edges, including pending/rejected. |
| Not CONFIRMED | Visible to parties only. |
| PUBLIC | Everyone (authenticated). |
| NETWORK | Viewer is directly connected to, or family of, either party. |
| FAMILY | Viewer is within 4 confirmed family/union hops of either party. |
| PRIVATE | Parties only. |
| Minor involved | Capped at FAMILY — children's ties are never public. |

The API applies these rules **before** running ego/path/kinship algorithms, so hidden edges cannot influence results
(tested: a distant relative gets “No verified connection found” where a closer relative sees the path).

## 9. Ego network & progressive loading (`egonet.ts`)

`egoNetwork(index, center, {depth, categories, includePending, maxNodes})` returns nodes with `depth`, `generation`
and `hiddenNeighbours` (> 0 ⇒ the UI offers “expand”). The UI starts from the viewer and expands branches on demand
(`GET /graph/ego?center=X&depth=1&relativeTo=focus` keeps kinship labels relative to the focus person).

## 10. Notification tiers (`notifications.ts`) — prepared for Phase 3

Tier 1: parents, spouse/partner, children, siblings, step-parents/children ·
Tier 2: grandparents, grandchildren, uncles/aunts, nephews/nieces, first cousins, in-laws ·
Tier 3: friends, close friends, professional contacts · none: acquaintances, neighbours, former spouses.
The notification service must still apply preferences, mutes, blocks, quiet hours and rate limits.

## 11. API surface (Phase 2)

| Method & path | Purpose |
|---|---|
| `GET /api/relationship-types` | Enabled types with localised labels |
| `POST /api/relationships` | Create (normalise → authorise → validate → verify) |
| `GET /api/relationships/:id` | Details, verification log, `mySides`, `awaitingSides` |
| `POST /api/relationships/:id/decision` | `CONFIRM` / `REJECT` / `DISPUTE` |
| `PATCH /api/relationships/:id` | Visibility, note, union dates/end (parties only) |
| `DELETE /api/relationships/:id` | Remove (parties only, audited) |
| `GET /api/relationships/awaiting-me` | Requests waiting for my decision (as person or steward) |
| `GET /api/graph/ego?center&depth&categories&includePending&relativeTo` | Visible ego network |
| `GET /api/graph/path?from&to&categories&includePending` | How Are We Connected? |

All responses accept `?locale=ar|de|en` (or `Accept-Language`).

## 12. Limits of the prototype

* Path search loads ≤ 4 hops around each endpoint (≤ 8 hops total). Longer chains are reported as not found.
* Family visibility horizon is 4 hops (configurable in code).
* Kinship naming beyond second cousins / great-great relations uses generic forms in Arabic.
* Twins, surrogacy, donor conception and gender-neutral words beyond “parent/sibling/partner” are not yet modelled as
  explicit subtypes (they are representable with notes/custom labels).
