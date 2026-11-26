# EZID Kids — Safety & Child Data Protection (v1.1)

Status: **proposal**; must be reviewed by a lawyer before Phase 7 launch.

## 1. Legal frame (to be confirmed per target country)
* **GDPR Art. 8:** information-society services to children need parental consent below the national age
  (Germany: 16). EZID Kids treats every user under 16 as requiring guardian consent everywhere.
* **GDPR Art. 9:** cultural/religious learning content combined with a child's profile is sensitive — minimise data.
* **GDPR Art. 25 / data protection by design**, children's-design codes where applicable (e.g. UK Age Appropriate
  Design Code if serving UK users), **DSA Art. 28** (protection of minors on online platforms), **COPPA** if US
  children are targeted.

## 2. Safety principles
1. **No contact with strangers:** no messaging, comments, chat, friend lists, follows or public profiles for children.
2. **No exposure:** children never appear in search, directories, maps, public pages or other people's views; family
   graph visibility limited to the family audience (already enforced for minors).
3. **No advertising, no profiling, no tracking:** no ads, sponsorships, third-party analytics or tracking pixels in the
   Kids area; children's data never used for recommendations outside learning progress.
4. **Data minimisation:** first name/nickname, birth year, age group, settings and progress only. No email, phone,
   photos of the child, voice recordings or precise location unless a specific, separately consented feature needs it.
5. **Guardian in control:** every feature can be switched off; consents are granular and revocable; reports and exports
   available to guardians.
6. **No dark patterns:** no streak pressure, no loot boxes, no purchases, no endless feeds, no autoplay chains; rewards
   are for learning, not time spent.
7. **Healthy use:** screen-time limits, allowed hours, bedtime mode, gentle break reminders.
8. **Age-appropriate content only:** published content passed cultural and safety review; no graphic or traumatic
   material for young children; sensitive history only for 13–16 with guidance notes for guardians.

## 3. Kids AI safety (optional feature)
* Off by default; guardian enables per child; age 6+ only.
* Answers generated only from the **approved knowledge base** (retrieval from reviewed content); refuses everything
  else with a friendly "ask your family" message.
* Never asks for personal information; filters personal data in questions; no links, no web browsing.
* Topic guardrails: no violence/trauma details, no religious rulings or disputes presented as fact, no medical,
  legal or relationship advice.
* Logs: category and source only by default; question text kept only with guardian consent, 30-day retention;
  never used for model training.
* Provider processing in the EU or with adequate safeguards; DPA in place.
* Human review of reported answers; ability to disable globally.

## 4. Creations (drawings, projects)
Stored privately, visible only to linked guardians; downloadable by guardians; never shared publicly; deletable.

## 5. Moderation & incidents
Report button for guardians; "tell a grown-up" for children (notifies guardian, no free text from young children);
admin review within a defined time; content can be retired immediately; incident log; breach response including
guardian notification.

## 6. Security
Child-scoped access tokens (future app) with minimal permissions; Kids area served without third-party scripts;
Content Security Policy; RLS policies tested for every child-facing table; regular review of permissions.

## 7. Checklist before Kids launch
☐ Legal review of consent model and texts (4 languages) ☐ DPIA including children ☐ safety test suite green
☐ reviewer group in place ☐ no third-party requests in Kids area (verified) ☐ guardian documentation
☐ incident process tested.
