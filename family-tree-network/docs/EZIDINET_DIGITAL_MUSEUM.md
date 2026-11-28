# EZIDINET Digital Museum (v1.2)

Status: **proposal** · part of the Heritage module (`EZIDINET_HERITAGE.md`) · Phase H.

## Purpose
Digital collections of photographs, manuscripts, objects and historical materials — curated, credited and rights-safe.

## Screens
Museum home (featured collections) · Collection page · Item page (media viewer with zoom, knowledge status badge,
provenance, sources, credits, licence) · Timeline view · Search & filters (kind, period, region, collection, knowledge
status) · Contribute item (multi-step: media → description → provenance → sources → rights → consent) · My contributions
· Reviewer queue (role) · Corrections / takedown request form.

## Rules
* Contributor credits and source attribution always visible.
* Manuscript images: high-resolution originals stored privately; public viewer uses watermarked derivatives when the
  rights holder asks for it.
* No face recognition or automatic identification of people in historical photos. Tagging people requires consent of
  the person (living) or is limited to names already published in cited sources (deceased).
* Physical objects: owner/holder recorded; never the private address of the holder.
* Partnerships with institutions (museums, archives, universities) recorded as `source institution` with their licence.

## Data
Uses the shared heritage model; museum-specific fields: `object_type`, `material`, `dimensions`, `holder_institution`,
`inventory_reference`.

## Phase-1 scope (budget-friendly)
Photo and document collections with the viewer, credits, knowledge status and review workflow. 3D/360 objects later.
