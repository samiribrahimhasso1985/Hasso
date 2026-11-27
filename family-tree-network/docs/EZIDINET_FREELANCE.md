# EZIDINET Freelance (v1.2)

Status: **proposal** · Economic Opportunities · builds on Professional Identity (FAMILY NETWORK §32) and Smart Profile Ads.

## Functions
* **Skills profile:** the existing professional roles/skills of My Identity — no second profile. Freelance mode is a
  setting on the same account ("available for work", services, rates optional).
* **Opportunities:** members and businesses post freelance jobs/projects (title, skills, budget range, remote/region,
  deadline).
* **Discovery:** clients find providers by skill, language, region (country/city level), availability — only members who
  opted into freelance discovery appear (consistent with "not discoverable by default").
* **Collaboration:** proposal → acceptance → project space (tasks, files, messages, milestones) — reuses the Open
  Community project model.
* **Portfolio:** public portfolio items on the profile (`/profile/{slug}`), with per-item visibility.
* **Reviews:** only after a completed engagement between the two accounts; one review per engagement; moderation.
* **Payments:** later phase via licensed provider (Module 34); until then EZIDINET does not handle money between
  members and says so clearly.

## Boundaries
Not a company directory (excluded) — businesses appear through their storefronts only. Minors cannot offer paid
services. No requirement to disclose employer, religion or political views.

## Data (planning)
Reuses `profiles`, professional roles/skills; adds `freelance_settings`, `freelance_services`, `freelance_jobs`,
`freelance_proposals`, `engagements`, `engagement_reviews`, `portfolio_items`.

## Tests
Opt-in discovery · reviews only after completed engagement · minors blocked from paid services · portfolio visibility
enforced.
