# Professional Identity & Personal Roles System (الهوية المهنية والأدوار الشخصية)

> Source: product owner, section 32. Stored as CLAUDE.md §32.

**Owner's summary (Arabic, condensed):** every person can describe themselves by their work, activity or specialty — not necessarily as an employee (employee, doctor, engineer, content creator, activist, journalist, artist, business owner, freelancer). One account can hold several roles at once (e.g. accounting employee + content creator + social activist), editable and removable. Employees choose their department; creators add their field, channels and work links; activists add their field and initiatives; several current/previous jobs; skills, certificates, experience; a role can link to an organization on FAMILY NETWORK, which may confirm the affiliation if it agrees. A self-written role is never automatically verified. The professional verification label is separate from the personal FAMILY NETWORK VERIFIED BADGE.

## 1. Objective
A flexible system for occupation, activities, expertise, social roles and public identity. Multiple simultaneous roles (employee in accounting, content creator, social activist, journalist, entrepreneur, doctor, engineer, researcher, artist, freelancer, volunteer, student, teacher, public figure). Integrated into the existing profile; never a separate account per role.

## 2. Multiple roles per user
Each role: category · custom role title · professional title · description · organization/company · department · industry · employment type · start date · end date · current/previous status · location (optional) · skills · professional website · portfolio links · social links · supporting documents (optional) · verification status · visibility. Several current and historical roles.

## 3. Role categories (configurable; admins manage the directory)
- **Employment:** Employee · Manager · Department Head · Director · Executive · Government Employee · Public Sector Employee · Private Sector Employee
- **Content & media:** Content Creator · Video Creator · Streamer · Podcaster · Journalist · Photographer · Media Producer · Blogger
- **Activism & community:** Social Activist · Human Rights Activist · Environmental Activist · Community Organizer · Volunteer · Charity Worker · NGO Member
- **Business:** Entrepreneur · Business Owner · Founder · Co-Founder · Investor · Consultant · Freelancer · Self-Employed
- **Professional:** Doctor · Nurse · Engineer · Lawyer · Teacher · Researcher · Scientist · Accountant · Architect · Designer · Developer · Technician · Skilled Tradesperson
- **Creative:** Artist · Musician · Writer · Actor · Director · Designer · Performer
- **Education:** Student · University Student · Academic · Professor · Instructor · Researcher
- **Custom:** user-defined when nothing fits.

## 4. Employment profile
Company · organization · department · job title · employment type · workplace country · workplace city · start/end date · currently working here · job description · skills · optional professional contact.
Departments (custom allowed): Accounting · Human Resources · Finance · Administration · Sales · Marketing · IT · Engineering · Production · Logistics · Customer Service · Management · Research and Development · Operations.
Employment types: Full-Time · Part-Time · Temporary · Internship · Apprenticeship · Freelance · Contract · Self-Employed · Volunteer. Disclosing the employer is never required.

## 5. Content creator profile
Content category · creator description · platforms · channel URLs · website · portfolio · topics · languages · optional audience statistics · public content links.
Categories: Education · Entertainment · History · Technology · Science · Travel · Gaming · News · Culture · Lifestyle · Documentary · Art · Other. **Never fabricate follower counts or engagement statistics.**

## 6. Activist and community profile
Categories: Human Rights · Social Justice · Environment · Education · Community Development · Humanitarian Support · Cultural Heritage · Youth Activities · Animal Welfare · Other.
Organization affiliation · voluntary initiatives · projects · public campaigns · languages · public links · activity description. **Never require sensitive political, religious or personal affiliation disclosures.**

## 7. Skills and experience
Skills · experience · qualifications · certificates · education · languages · projects · achievements · portfolio links. User controls what is public. Supporting documents have restricted access and are never exposed through public profile URLs.

## 8. Organization connection
1 User selects an organization → 2 submits an affiliation request → 3 organization administrators are notified → 4 an authorized representative reviews → 5 confirms or rejects → 6 role status updates.
Statuses: SELF_DECLARED · PENDING_CONFIRMATION · ORGANIZATION_CONFIRMED · REJECTED · EXPIRED · DISPUTED. Organization confirmation confirms only that affiliation, nothing else in the profile.

## 9. Verification types (kept separate)
A **Personal identity verified** (FAMILY NETWORK administration) · B **Organization affiliation confirmed** (authorized organization representative) · C **Professional qualification verified** (only after checking an authoritative document/source) · D **Self-declared role** (no independent confirmation).
Never display a verified status for an unverified claim. Paid subscriptions are never proof of qualifications.

## 10. Profile display — "PROFESSIONAL IDENTITY & ROLES"
Role cards: title · category · organization · department · current/previous · verification label where applicable · short description. User chooses which roles are public; ordering; a primary role (display preference only, not a claim or verification).

## 11. Privacy
Per role: Public · Connections · Family · Selected People · Only Me. Employer, department, dates and professional links can be hidden independently. Never reveal private employment details, workplace location, documents or contact data without permission.

## 12. Database (suggested)
- **professional_roles:** id · user_id · category_id · custom_category · title · description · organization_id · department · industry · employment_type · start_date · end_date · is_current · is_primary · verification_status · visibility · created_at · updated_at
- **professional_categories:** id · name · localized_names · category_group · is_active · created_at
- **professional_skills:** id · role_id · skill_name · proficiency_level · created_at
- **professional_links:** id · role_id · link_type · url · visibility · created_at
- **professional_verifications:** id · role_id · verification_type · status · submitted_by · reviewed_by · evidence_reference · decision_reason · reviewed_at · created_at
- **organization_affiliations:** id · role_id · organization_id · status · requested_at · reviewed_by · reviewed_at
Foreign keys, indexes, migrations. Documents in secure object storage, never in PostgreSQL.

## 13. UI screens
1 Professional Identity Overview · 2 Add New Role · 3 Select Role Category · 4 Employment Details · 5 Content Creator Details · 6 Activist Profile · 7 Skills and Qualifications · 8 Add Portfolio Links · 9 Organization Connection · 10 Verification Requests · 11 Role Privacy Settings · 12 Edit Role · 13 Role History. Arabic RTL, German/English LTR.

## 14. Admin dashboard
Professional category management · organization affiliation requests · qualification verification requests · reports and disputes · audit history · verification decisions. Role-based permissions.

## 15. Acceptance tests
Multiple roles per user · multiple current jobs · employee + creator combined · activist + volunteer · custom categories · custom departments · previous employment kept in history · individual roles hideable · affiliation needs authorized confirmation · self-declared never shown as verified · personal identity verification separate · qualification verification separate · private documents not publicly accessible · Arabic, German, English.

## 16. Final rule
WHO I AM · WHAT I DO · WHERE I WORK · WHAT I CREATE · WHAT I CONTRIBUTE · WHAT I KNOW. One person · one account · multiple roles · one connected identity.
