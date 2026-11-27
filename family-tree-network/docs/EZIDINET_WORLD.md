# EZIDINET WORLD (v1.2)

Status: **proposal** · Phase C (community) · official name EZIDINET.

## 1. What WORLD is
The global layer of the community: institutions and cultural organizations around the world, community maps, and
international cooperation. It also hosts **Open Community Participation** (owner's specification of 2026-11-27,
`specs/EZIDINET_V1.2_APPROVED_SCOPE.md`).

## 2. World directory of community institutions — scope boundary (needs approval, EZ-19)
v1.2 asks for a "world directory of community institutions and cultural organizations". The owner previously **excluded
"Company Directory"** (must never be built or renamed). Proposed boundary:
* **Included:** non-commercial community institutions — cultural associations, community centres, places of worship
  that choose to be listed, schools/language courses, aid organizations, student unions, heritage institutions.
* **Excluded:** businesses and companies. Businesses appear only through their own storefront
  (`/business/{slug}`, Smart Profile Ads) — never in a browsable directory of companies.
* Listing is opt-in by an authorized representative; institutions verified by human administrators before showing a
  "verified institution" mark. Address shown only at the level the institution chooses (city/country by default).

## 3. Community maps (privacy rules)
* Maps show **institutions and events**, never individual members.
* Aggregated member counts (Community Pulse) only at country level, only above a minimum count (k ≥ 50 proposed), and
  **suppressed for high-risk countries** (Iraq, Syria, Turkey, Russia, … — `ezidnet/TARGET_MARKETS.md`) to avoid
  revealing where community members live.
* No precise coordinates of private persons, ever.

## 4. Open Community Participation (Community Hub)
Owner's decision **supersedes the earlier mandatory pre-approval**:

| Ordinary projects (published directly, no prior admin approval) | Special review before activation |
|---|---|
| cultural, heritage, educational, language, volunteering, youth, scientific, artistic, social, environmental, professional, economic, international cooperation | fundraising & financial collections · emergency/humanitarian assistance · activities involving children · collection/processing of sensitive personal data · high-risk events or activities requiring permits |

Member capabilities: create initiatives/projects · invite members and build teams · accept/manage applications · assign
tasks · publish updates, media, progress reports · milestones · complete/archive/cancel.

Proportionate safety: reporting · moderation · temporary suspension/removal with **transparent reasons** · appeals ·
audit history of admin actions · organizer accountability (organizer = a real EZIDINET account; organizer's EZID ID
visible to project members).

Classification guard: if a project adds a fundraising, emergency, children or sensitive-data feature later, that
feature (not the whole project) is held until special review passes. A heritage claim published in a project is not
heritage content until it passes the Heritage workflow.

Integrations: Community Hub · Ideas · Volunteers · Local · WORLD · Notifications · Admin Dashboard.
(Ideas/Volunteers/Local are views over the same project model: an idea = project in `IDEA` stage; volunteer roles =
project tasks open to applications; Local = projects filtered by region.)

## 5. International cooperation
Partner institutions can co-host projects and events; cross-country projects show participating countries, not members'
locations.

## 6. Data (planning)
`institutions`, `institution_representatives`, `institution_verifications`, `projects`, `project_members`,
`project_applications`, `project_tasks`, `project_milestones`, `project_updates`, `project_reviews` (special review),
`moderation_actions`, `appeals` — `EZIDINET_EXPANSION_PROPOSAL_V1.2.md` §4.

## 7. Tests
Ordinary project publishes without admin approval · fundraising feature blocked until review · children activity
blocked until review · suspension stores reason and is visible to organizer · appeal flow · maps never return member
locations · Pulse suppressed below threshold and in high-risk countries · companies cannot be listed as institutions.
