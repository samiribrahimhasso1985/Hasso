# EZIDINET Heritage — umbrella module (v1.2)

Status: **proposal for owner approval** · Phase H (see `EZIDINET_EXPANSION_PROPOSAL_V1.2.md` §5) · official name EZIDINET.

## 1. What this module consolidates
v1.2 §A lists five Culture & Heritage modules. They share one content model, one rights model and one editorial
workflow, so they are built as **one Heritage module with five faces** (no capability removed):

| v1.2 module | Where it lives | Document |
|---|---|---|
| EZIDINET Digital Museum | collections of photographs, manuscripts, objects | `EZIDINET_DIGITAL_MUSEUM.md` |
| EZIDINET Sound Heritage | audio archive: music, songs, oral histories | `EZIDINET_SOUND_HERITAGE.md` |
| EZIDINET 3D Heritage | 3D / 360° exploration of cultural and historical places | this document §4 |
| EZIDINET Cultural Preservation | contribution, rights, consent, editorial review — the shared engine of all heritage content | this document §2–3 |
| EZIDINET AI Cultural Researcher | research assistant over reviewed heritage content | `EZIDINET_AI_ECOSYSTEM.md` §3 |

Earlier plans (v1.1 "Heritage home · Oral History · Historical Timeline · Family History · Family Knowledge · My Legacy
Story") map onto this module: Oral History = Sound Heritage collection type; Historical Timeline = a view over dated
heritage items; Family History / Family Knowledge / My Legacy Story stay **private family features** and never become
public heritage automatically.

## 2. Shared content model (Cultural Preservation)
Every heritage item has:
* **Kind:** photograph · manuscript · object · document · audio · video · 3D/360 scene · place.
* **Provenance:** contributor (EZIDINET account), original creator/author if known, source institution, date (exact,
  approximate or range), place (region-level by default), collection.
* **Knowledge status — mandatory, always visible:**
  `DOCUMENTED` (supported by cited sources) · `ORAL_TRADITION` (as told; attributed to the teller/community) ·
  `CONTESTED` (sources disagree; both shown) · `UNVERIFIED` (submitted, not yet reviewed).
  Oral traditions are respected and preserved, but never presented as documented history, and vice versa.
* **References:** citations (book, archive, interview, URL) attached to claims.
* **Rights:** copyright holder, licence (e.g. all rights reserved / CC BY / CC BY-NC / public domain), permission
  document reference, allowed uses (view · download · educational use in EZIDINET Kids · AI indexing).
* **Consent:** for every identifiable living person in a photo or recording: consent record (who, when, scope,
  withdrawable). Recordings of sacred or restricted ceremonies require the community's explicit permission; items can
  be marked **restricted** (visible only to approved audiences) or **not for publication**.
* **Visibility:** public · members only · restricted group · private draft.

## 3. Editorial workflow (human review — required by v1.2)
1. Contribution (any member) → status `UNVERIFIED`, visible only to the contributor and reviewers.
2. Rights & consent check (reviewer) → missing consent blocks publication.
3. Content review by the **cultural review group** (open question Q-1: who are the reviewers?).
4. Publication with knowledge status and credits; corrections and takedown requests are tracked with history.
5. Withdrawal of consent → item hidden within the published deadline; audit log kept.

Note: this differs from Open Community projects (published without prior approval, `EZIDINET_WORLD.md` §4) because heritage items carry claims about history and rights of third parties.

## 4. EZIDINET 3D Heritage
* Goal: digital exploration of cultural and historical locations.
* **Budget-aware staging:** step 1 = 360° panorama photos and photo galleries with a simple viewer (low cost);
  step 2 = 3D models (photogrammetry) only when donated/partner-produced; no paid 3D production inside the €5,000 budget.
* Locations of sacred or vulnerable sites: shown at region level; precise coordinates of vulnerable sites never
  published (protection against vandalism and targeting).

## 5. Data (planning, not yet migrated)
`heritage_items`, `heritage_collections`, `heritage_media` (→ `media_assets`), `heritage_sources`, `heritage_rights`,
`heritage_consents`, `heritage_reviews`, `heritage_corrections` — see `EZIDINET_EXPANSION_PROPOSAL_V1.2.md` §4.

## 6. Permissions
Contributor · Heritage reviewer (cultural review group) · Rights reviewer · Heritage editor (publishes) · Admin.
Reviewers need MFA. Every publication and takedown is audited.

## 7. Tests (acceptance)
Unreviewed items are not public · knowledge status always rendered · missing consent blocks publication · consent
withdrawal hides the item · restricted items invisible to non-members of the audience · licence prevents download
when not allowed · vulnerable-site coordinates never returned by the API.
