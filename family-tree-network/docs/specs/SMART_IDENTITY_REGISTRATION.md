# Smart Identity Registration & Automatic Account Creation

> Source: product owner (titled "24"; stored as CLAUDE.md §28 to avoid clashing with the existing §24 QR section, which it extends).

## 24.1 Product objective
An intelligent, secure, international registration system. The user registers by scanning an official identity document with the smartphone camera. The system extracts permitted identity fields, verifies the phone number, suggests a platform email address, creates a unique Family ID, and generates a personal profile URL and QR code. Multiple countries and document types are supported.

## 24.2 Registration flow

**Step 1 — Country selection.** Country of residence · Nationality (optional, separate from residence) · Document issuing country · Available document types. Configurable country-specific document rules. Types: National Identity Card · Passport · Residence Permit · Other officially accepted identity document. Do not assume every country uses the same format.

**Step 2 — Camera identity capture.** Open the camera from the registration screen: permission request · document positioning frame · automatic edge detection · image quality detection · blur detection · lighting guidance · front-side capture · back-side capture when applicable · passport information-page capture · retake · secure upload. Gallery upload is not the default when the configured policy requires camera capture. Provide an accessible alternative for users who cannot use the camera.

**Step 3 — OCR identity extraction.** Via an identity verification provider or secure OCR service. Extract only: legal full name · date of birth · document type · issuing country · document number (only where required for verification) · document expiry date (where applicable). Support Latin, Arabic, German characters and country-specific scripts where supported. Show extracted data for review; the user must confirm before proceeding. **OCR extraction alone is NOT identity verification.**

**Step 4 — Identity verification.** Configurable provider. May include: authenticity checks · validity checks · expiry checks · duplicate identity detection · optional selfie · optional liveness · manual review for suspicious cases. Statuses: Not Started · Pending · Processing · Verified · Rejected · Requires Review · Expired. Never display document images or numbers publicly.

**Step 5 — Phone verification (mandatory).** Country calling code · phone number · SMS OTP. E.164 format · OTP expiration · resend cooldown · rate limiting · abuse protection · phone change verification · account recovery workflow. Phone not publicly visible by default.

**Step 6 — Automatic email generation.** Propose an address from the verified legal name or approved display name, e.g. `ibrahim.hasso@familynetwork.com`, else `ibrahim.hasso01@…`. Normalize safely · support Arabic and international names · transliterate where appropriate · remove unsafe characters · global uniqueness · user chooses among alternatives · reserve transactionally · never expose another user's private email · verify ownership/activation according to the mail architecture.
The platform must own and configure its email domain. An address is not a mailbox unless hosting, receiving, sending, DNS, SPF, DKIM and DMARC are configured. **Initial release: platform email identity + verified contact email; a full mailbox product is a later module.**

**Step 7 — Automatic profile URL.** From the approved username, e.g. `familynetwork.com/@ibrahim.hasso`; alternatives `@ibrahim.hasso01`, `@ibrahim.hasso82`. Username changes under controlled rules. Permanent internal user ID stays separate from the public URL.

**Step 8 — Family ID creation.** Unique, permanent, e.g. `FN-829471`. Unique DB constraint · non-sequential / unpredictable · never government ID numbers · reveals no private information · safe to share.

**Step 9 — Digital identity generation.** Family ID · public profile URL · QR code · digital identity card · phone verification status · identity verification status. QR contains a secure random token or protected URL; regeneration, revocation, expiration, server-side validation, abuse detection. Scanning creates a relationship request, never an automatic connection.

## 24.3 Registration screens
1 Registration Welcome · 2 Country Selection · 3 Document Type Selection · 4 Camera Permission · 5 Front ID Capture · 6 Back ID Capture · 7 Passport Capture · 8 Image Quality Review · 9 OCR Processing · 10 Extracted Data Review · 11 Identity Verification · 12 Selfie and Liveness (if required) · 13 Phone Number Entry · 14 SMS OTP · 15 Automatic Email Suggestion · 16 Username Selection · 17 Profile URL Preview · 18 Family ID Generation · 19 Digital Identity Preview · 20 Registration Success.

Owner's condensed flow (Arabic): extract and review identity data → add personal photo (live capture or upload from phone/computer) → verify identity and photo per the approved mechanism → enter and confirm phone via SMS → suggest email and username → create Family ID, account URL and QR → show digital identity card and complete registration.

## 24.4 Database
- **identity_documents:** id · user_id · issuing_country · document_type · verification_provider · verification_reference · verification_status · expiry_date · created_at · deleted_at. No raw images or full document numbers unless strictly necessary and legally justified.
- **identity_verifications:** id · user_id · provider_reference · verification_status · verification_method · review_reason · verified_at · created_at
- **phone_verifications:** id · user_id · phone_number · verification_status · verified_at · created_at
- **user_identifiers:** id · user_id · family_id · username · public_profile_url · platform_email · email_status · created_at
- **registration_audit_logs:** id · user_id · action · status · timestamp · security_metadata

Unique constraints and indexes as appropriate. Never store OTP values in plain text.

## 24.5 Security & GDPR
Identity documents and phone numbers are highly sensitive. Mandatory: explicit informed consent · data minimization · encryption in transit and at rest · strict role-based access · limited document retention · secure deletion · access audit logs · data export and deletion · breach response procedures · provider DPAs · GDPR legal basis and privacy notices · age verification and parental consent where applicable.
No permanent storage of complete document images by default; prefer a provider returning result + reference. Do not expose document details to family, friends, administrators without authorized justified purpose, or the public.
**Identity verification and relationship verification are separate systems. A verified identity does not prove a claimed family relationship.**

## 24.6 Admin dashboard — Identity Verification Management
View status · review provider results · handle failures · request additional verification · manage suspicious registrations · view audit records. No unrestricted access to raw identity documents.

## 24.7 Acceptance tests
1 Country selection · 2 Country-specific document support · 3 Camera capture · 4 Front and back capture · 5 OCR accuracy and manual correction · 6 Identity verification result · 7 International phone verification · 8 OTP expiration and rate limiting · 9 Email uniqueness · 10 Username uniqueness · 11 Profile URL generation · 12 Family ID uniqueness · 13 QR creation and revocation · 14 Unauthorized access prevention · 15 Data retention and deletion · 16 Arabic, German and English registration · 17 RTL and LTR interfaces.

## 24.8 Implementation order
A Country & document configuration · B Camera capture & secure OCR integration · C Identity verification provider integration · D Phone OTP · E Automatic email & username · F Family ID & profile URL · G Digital identity & QR · H Security audit & acceptance testing.

Do not implement identity verification with a simple OCR-only mechanism. Do not claim a person is verified merely because the camera captured a document.
