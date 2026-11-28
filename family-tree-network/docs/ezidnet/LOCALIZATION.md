# EZIDNET — Localization (v1.1)

## 1. Languages
| Code | Language | Script / direction | Status |
|---|---|---|---|
| `ku` | Kurmanji | **Latin (Hawar alphabet)**, LTR — proposal EZ-6 | 🆕 to add |
| `ar` | Arabic | Arabic, RTL | ✅ exists |
| `de` | German | Latin, LTR | ✅ exists |
| `en` | English | Latin, LTR | ✅ exists |

Kurmanji is the heritage language of most Yazidis. It is written mainly in the Latin (Hawar) alphabet; in Iraq it is
also written in Arabic script. **Proposal:** Latin script first (one script to review and maintain on a €5k budget);
an Arabic-script variant (`ku-Arab`, RTL) follows **before public launch** because of readers in Iraq/Syria (EZ-15). The default language is
chosen by the user; no language is assumed from name or location.

### Languages implied by the target countries (2026-11-26)
Kurmanji in **Arabic script** (`ku-Arab`, RTL) gets higher priority for readers in Iraq/Syria (EZ-15). Russian, Armenian,
Georgian and Turkish are planned for Phase 10 (`TARGET_MARKETS.md` §3). The i18n and engine label structure already
supports adding locales; RTL handling exists for Arabic and will be reused for `ku-Arab`.

## 2. Technical approach
* Existing typed dictionaries (`apps/web/lib/i18n.tsx`) get a `ku` entry; the completeness test already fails if any
  key is missing in any language.
* Relationship labels and derived kinship terms get a `ku` locale in the engine (draft vocabulary in
  `RELATIONSHIP_ENGINE.md`).
* Fonts: Inter covers Kurmanji Latin letters (ç, ê, î, ş, û); IBM Plex Sans Arabic for Arabic — both self-hosted.
* `dir` is set per language; all CSS uses logical properties (already the case).
* Dates and numbers formatted with `Intl` per locale.

## 3. Translation workflow
1. Source strings in English.
2. Translation by community volunteers or a translator.
3. **Review by a second native speaker** for Kurmanji and Arabic (cultural and dialect accuracy).
4. Kinship and religious/cultural terms reviewed by the cultural review group (same group as EZID Kids content).
5. Machine translation only as a draft, never published without review.

## 4. EZID Kids specifics
Kurmanji is the learning language; ar/de/en are support languages for explanations. Audio narration recorded by native
speakers (preferred over synthetic voices for pronunciation teaching). Age 3–5 screens rely on icons and audio, not text.

## 5. Tests
Key completeness for 4 languages · RTL layout e2e (exists) · Kurmanji special characters render and sort correctly ·
kinship labels exist for every relationship type in `ku`.
