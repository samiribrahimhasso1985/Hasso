# My Identity — هويتي

> Unified Personal, Family, Professional & Social Identity Hub. Source: product owner, section 33. Stored as CLAUDE.md §33.
> Owner's note: a profile tab "My Identity — هويتي" holding personal, family, professional and social identity, so each person shows the aspects they choose without multiple accounts.

## 1. Purpose
One central section combining all aspects of a person's identity within one account and one internal user ID, with multiple identity dimensions. No separate accounts for different roles.

## 2. Identity dimensions
- **A. Personal identity:** full name · profile picture · date of birth (optional display) · country · languages · biography · Family Network ID · personal identity verification status · personal privacy settings.
- **B. Family identity:** family memberships · confirmed family relationships · family communities · family role · family contributions · family history participation · Family Passport. Only what the viewer is authorized to see.
- **C. Professional identity:** current and previous employment · job title · department · company · business ownership · freelance activities · experience · qualifications · skills · portfolio · professional links (module §32).
- **D. Social identity:** social activities · volunteering · community participation · activism categories · cultural activities · public initiatives · associations. No required disclosure of sensitive political, religious or personal affiliations.
- **E. Public identity:** content creator · public figure · journalist/media · artist · celebrity profile · public biography · website · social links · public videos · interview availability. Public visibility is optional.
- **F. Education & skills:** schools and universities · education history · degrees · qualifications · certificates · skills · languages · courses · research · projects.

## 3. Multiple identities and roles
Add, edit, remove roles · set a primary role · reorder · previous roles · connect roles to organizations · request organization confirmation. No user is required to have a professional or public identity.

## 4. Personal identity dashboard
Profile photo · name · Family Network ID · official verification badge where approved · short biography · selected primary roles · family, professional, social, education summaries · navigation to detailed sections.

## 5. Privacy control center
Independent visibility per dimension: Public · Connections · Family · Selected People · Only Me, plus field-level controls (e.g. show job title but hide company; show company but hide department; show skills but hide certificates; show family membership but hide individual relationships; show creator profile but hide personal information). **Enforced by the backend, not only hidden in the UI.**

## 6. Verification separation
Independent: personal identity verified · professional qualification verified · organization affiliation confirmed · celebrity/public figure verification · family relationship confirmed. None is proof of another. The FAMILY NETWORK VERIFIED BADGE stays administration-controlled.

## 7. "View my profile as others see it"
Preview as public visitor · connection · family member · selected audience — reflecting the real backend permission rules.

## 8. Identity completion
Optional indicator over: personal profile · photo · family identity · professional identity · social identity · education & skills · public profile. Never force optional disclosures; never expose sensitive missing information.

## 9. Database and architecture
Integrate with existing user, relationship, professional role, organization and verification tables; no duplicated records; references wherever possible.
- **identity_preferences:** id · user_id · primary_identity_section · public_profile_enabled · profile_display_preferences · created_at · updated_at
- **identity_section_visibility:** id · user_id · section_key · visibility · custom_audience_id · updated_at
Migrations; backward compatibility.

## 10. UI screens
My Identity Overview · Personal Identity · Family Identity · Professional Identity · Social Identity · Public Identity · Education & Skills · Identity Privacy Settings · Public Profile Preview · Identity Completion.

## 11. Design
Modern Luxury / Editorial Minimalism with existing design tokens; Arabic RTL and German/English LTR; clean, not everything on one screen.

## 12. Acceptance tests
One account supports all dimensions · multiple professional and social roles · existing profile data reused without duplication · independent section privacy · field-level visibility · preview respects permissions · verification types separate · optional information not forced · Arabic, German, English · no private data leaks through APIs or search.

**Final principle:** MY IDENTITY IS THE CENTRAL PLACE WHERE EACH PERSON DEFINES WHO THEY ARE, WHAT THEY DO, WHAT THEY CONTRIBUTE AND WHAT THEY CHOOSE TO SHARE. ONE PERSON. ONE ACCOUNT. ONE DIGITAL IDENTITY. MULTIPLE DIMENSIONS.
