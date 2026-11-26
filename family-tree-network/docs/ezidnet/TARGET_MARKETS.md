# EZIDNET — Target Countries & Their Consequences (v1.1)

**Owner's answer to Q-2 (2026-11-26):** Europe and Asia — including Iraq, Syria and Turkey — Georgia, Armenia, the
United States, Australia, and every other country where Yazidis live.

> ⚠ This document is an engineering and risk overview, **not legal advice**. Every row marked "verify" must be checked
> by a lawyer qualified for that jurisdiction before EZIDNET accepts users there (decision EZ-10).

## 1. Countries and legal frameworks (to verify)
| Region / country | Main data-protection framework (as known) | Children's age of digital consent | Points to verify |
|---|---|---|---|
| EU (Germany, Sweden, Netherlands, Belgium, France …) | GDPR; religion/ethnicity = special category (Art. 9) | 13–16 depending on member state (Germany 16) | DPIA, Art. 9 explicit consent, DSA duties, national age rules |
| United Kingdom | UK GDPR + Age Appropriate Design Code | 13 | children's code applies to Kids area |
| Turkey | KVKK (Law 6698); religion is special-category data | verify | explicit consent wording, rules for transferring data to EU servers, VERBIS registration duty |
| Iraq (incl. Kurdistan Region) | no comprehensive data-protection law known to us | verify | cybercrime/media laws, government access risk, connectivity |
| Syria | no comprehensive data-protection law known to us | verify | sanctions and payment-provider restrictions (relevant only when payments start) |
| Armenia | Law on Protection of Personal Data (2015) | verify | consent and cross-border transfer rules |
| Georgia | Law on Personal Data Protection (new law 2023, in force 2024) | verify | special-category consent, transfer rules |
| Russia | Federal Law 152-FZ incl. **data-localisation** duty for Russian citizens' data | verify | localisation is incompatible with a single EU database → see decision EZ-14 |
| United States | COPPA (children under 13) + state privacy laws (e.g. California) | 13 (COPPA) | verifiable parental consent for under-13s in EZID Kids |
| Australia | Privacy Act 1988; Online Safety Act incl. social-media minimum age of 16 (from Dec 2025) | 16 for age-restricted social media | whether EZIDNET's social features fall under the minimum-age rule |
| Canada | PIPEDA + provincial laws | verify | consent, cross-border transfer notice |

## 2. Technical consequences
| Consequence | Design response |
|---|---|
| One database in the EU serves every country | data minimisation, strong consent records per country, transfer clauses where required (e.g. Turkey) |
| Different consent ages | `country`-based minimum age configuration; under the local age → guardian-managed (EZID Kids model) |
| Users in high-risk countries (Iraq, Syria, Turkey, Russia …) | not discoverable by default ✅ (done), country-level location only ✅, no identity documents ✅, plus planned: **discreet mode** (neutral app name/icon option for the PWA, quick logout, no notifications previewing content on lock screens), session list and remote logout, login alerts |
| Possible state access requests or blocking | no servers or staff in high-risk countries; transparency on government requests; the PWA keeps working via standard HTTPS; no data localisation in at-risk states |
| Device seizure / shoulder surfing risk | short sessions option, PIN for Kids mode exit ✅ (planned), no sensitive data cached offline |
| Payments (later phases) | sanctions screening and provider coverage per country (Syria and others may be excluded by providers) |

## 3. Languages implied by the target countries
| Language | Why | Proposed phase |
|---|---|---|
| Kurmanji — Latin script | most diaspora and Armenia/Georgia/Turkey readers | ✅ draft done |
| Arabic | Iraq, Syria | ✅ done |
| German, English | diaspora (Germany largest in Europe), USA, Australia | ✅ done |
| **Kurmanji — Arabic script** | widely read in Iraq (Duhok/Sinjar region) | **raise priority** → before public launch (proposal EZ-15) |
| Russian | Yazidis in Russia, Armenia, Georgia | Phase 10 (depends on EZ-14) |
| Armenian, Georgian | local languages of large communities | Phase 10 |
| Turkish | Turkey | Phase 10 |

## 4. Recommended launch sequence (proposal EZ-16)
1. **Soft launch** in the EU (Germany first) — strongest legal clarity, largest diaspora, GDPR process covers the hardest
   requirements; invite-only testers from the community.
2. **Open to diaspora countries** with similar frameworks: UK, USA, Canada, Australia (after age-rule checks).
3. **Armenia and Georgia** after local legal check and Russian/Armenian/Georgian language planning.
4. **Iraq, Syria, Turkey** — users can technically register from the start (the internet is global), but active outreach
   only after the at-risk features (discreet mode, login alerts, remote logout) are live and Turkey's KVKK transfer
   rules are handled.
5. **Russia** — only after a legal decision on data localisation (EZ-14).
