# EZIDINET AI Ecosystem (v1.2)

Status: **proposal** · built late (after core, community and heritage content exist) · supersedes the "FAMILY AI"
naming for EZIDINET while keeping its rules (FAMILY NETWORK §13).

## 1. Services and consolidation
| v1.2 service | Consolidated as | Notes |
|---|---|---|
| AI Assistant | **EZIDINET Assistant** (general help, navigation, natural-language search within what the user may see) | permissions applied before retrieval |
| AI Cultural Researcher + AI Heritage Research | **Heritage Research** (one service, two modes: researcher Q&A and research-assist for reviewers) | answers only from reviewed heritage items, with citations and knowledge status |
| AI Cultural Translator | **Translator** | ku/ar/de/en; cultural terms glossary reviewed by the cultural review group; marked "machine translation" |
| AI Voice Archive | **Voice tools** for Sound Heritage: transcription, translation drafts, search in transcripts | **no voice cloning or synthetic voices of real people** |
| AI Event Organizer | **Event helper** (draft agenda, checklist, reminders text) | organizer approves everything; never sends invitations by itself |
| AI Learning Path | **Learning Path** (adults: language/heritage courses; kids: suggestions to guardians) | for children: suggestions go to the guardian, not directly to the child |

## 2. Rules for every AI service
1. Multilingual (ku, ar, de, en); quality notes per language; Kurmanji output reviewed before any publication.
2. Reliable sources: retrieval from EZIDINET's reviewed content with citations; general model knowledge marked as such.
3. **Human review for sensitive historical and cultural claims** — AI output never becomes heritage content directly.
4. **No autonomous high-impact decisions:** AI never confirms relationships, identity, verification badges, moderation
   bans, emergency handling or permissions; it only suggests to a human.
5. Consent and rights: only content whose licence and consent allow AI indexing is used; private family data and
   messages are never used for training; no training on children's data.
6. No inference of religion/ethnicity or other special categories about users.
7. Transparency: every AI answer labelled; feedback/report button; logs with retention limits.

## 3. Heritage Research (detail)
Answers cite heritage item IDs; shows the knowledge status of each source (documented / oral tradition / contested);
says "not found in reviewed sources" instead of inventing; reviewers can use research-assist to find related items.

## 4. Providers and cost (budget €5,000)
Pay-per-use API with spending cap set by the owner; EU data-processing agreement; no data retention for training at the
provider; feature flags per service. Start with Translator + Assistant search (cheapest, most useful); Heritage Research
after enough reviewed content exists.

## 5. Kids AI
Covered in `EZIDINET_KIDS_SPECIFICATION.md` §4 and `EZIDINET_KIDS_SAFETY.md`: guardian opt-in, approved knowledge base,
age-appropriate behaviour, no data collection, safety escalation to guardians.

## 6. Tests
Permission filter before retrieval (a user never gets content they could not open) · citation present for heritage
answers · refusal on identity/relationship confirmation requests · no special-category inference · spending cap stops
calls · kids mode refuses off-topic and personal questions.
