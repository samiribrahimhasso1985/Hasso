# Celebrity Interviews, Verified Accounts & Live Streaming

> Source: product owner (sections 27, 27.17, 27.18; stored as CLAUDE.md §30).

## 27.1 Product objective
A professional celebrity and live broadcasting platform: verified public figures · celebrity interviews · scheduled online interviews · live video broadcasting · multi-person live sessions · audience interaction · moderation and reporting · recording and publishing approved broadcasts. Integrates with the existing **Public Videos** section. Do not create a separate personal video archive or Friends Videos section.

## 27.2 Verified accounts
Categories: actors and actresses · singers and musicians · athletes · journalists · media personalities · public officials · academics and experts · content creators · other public figures.
Requirements: identity verification · authenticity checks · account ownership checks · impersonation risk assessment · manual review when necessary · re-verification when ownership changes.
Badge: verified badge next to the name · verification status on public profile · category where appropriate. Never granted automatically for follower count or payment. Appeal process for rejections. Identity verification status stays separate from popularity and subscription status.

## 27.3 Celebrity profiles
Profile picture · display name · verified badge · biography · professional category · public videos · upcoming interviews · live status · followers · public contact or booking options where enabled. Private identity documents never appear publicly.

## 27.4 Celebrity interviews
Request an interview · invite a celebrity · accept/reject · schedule date and time · title and description · host and guests · multiple participants · private waiting room · camera/mic test · host manages participants · audience questions with approval before display · public or restricted interviews.
Workflow: REQUESTED → ACCEPTED → SCHEDULED → WAITING_ROOM → LIVE → COMPLETED; also CANCELLED, REJECTED, REPORTED.

## 27.5 Live streaming
For eligible, authorized accounts. Devices: Android · iOS · desktop browsers · professional software via RTMP/RTMPS ingest.
Features: start/end · camera switching · microphone selection · audio controls · quality selection · viewer count · live chat · reactions · moderator controls · guest invitations · multi-guest · connection quality indicators · interruption recovery · optional recording.

## 27.6 Live audience
Audience: watch · follow broadcaster · live notifications · comments · permitted reactions · questions · report · block · hide/report comments.
Broadcaster: disable comments · restrict comments to eligible audiences · appoint moderators · remove viewers where appropriate · block abusive users · pause or end.

## 27.7 Live recording
Inform all participants before recording · legally required consent · visible recording indicator · host can disable recording · retention periods · deletion per law · publish only when authorized · selected audience permissions apply to the recording. A public live stream never automatically becomes a permanent public video.

## 27.8 Live streaming rules
Policy engine covering: illegal content · harassment and threats · hate speech · sexual exploitation · child safety · non-consensual intimate content · dangerous activities · copyright · impersonation and fraud · privacy violations · misleading or harmful broadcasts — adapted to local law.
Provide: Community Guidelines · Live Streaming Terms · reporting workflow · moderation escalation · emergency stream termination · account suspension · appeals · moderator audit logs. Do not rely exclusively on automated AI moderation for serious decisions.

## 27.9 Live eligibility
LEVEL 1 standard user — no live permission by default · LEVEL 2 eligible creator — limited live access · LEVEL 3 verified public figure — expanded capabilities · LEVEL 4 approved professional broadcaster — advanced multi-guest and professional tools. Based on safety, verification, account status and legal requirements. Verification does not exempt anyone from moderation.

## 27.10 Admin Live Control Center
Active broadcasts · broadcaster identity & verification status · viewer counts · reports · moderation queue · broadcast health · warnings · temporary restrictions · emergency termination · incident history · appeals. Only specifically authorized staff can terminate broadcasts. Every moderation action is audited.

## 27.11 Notifications
Upcoming celebrity interviews · accepted interview requests · new live broadcasts from followed accounts · interview invitations · schedule changes · cancellations. User-controlled preferences.

## 27.12 Suggested data models
- **verified_accounts:** id · user_id · verification_category · verification_status · verification_provider · reviewed_at · reviewer_id · created_at · updated_at
- **interview_requests:** id · requester_id · celebrity_user_id · title · description · preferred_datetime · status · created_at · updated_at
- **interviews:** id · host_id · title · description · scheduled_at · status · visibility · recording_enabled · created_at
- **interview_participants:** id · interview_id · user_id · participant_role · invitation_status
- **live_streams:** id · broadcaster_id · title · description · stream_status · visibility · started_at · ended_at · recording_status · created_at
- **live_stream_participants:** id · stream_id · user_id · participant_role · joined_at · left_at
- **live_moderators:** id · stream_id · moderator_user_id · assigned_by · created_at
- **live_reports:** id · stream_id · reporter_id · reason · details · status · created_at
- **live_chat_messages:** id · stream_id · sender_id · message · moderation_status · created_at
- **live_moderation_actions:** id · stream_id · moderator_id · action_type · reason · created_at

## 27.13 Technical architecture
Evaluate: WebRTC for interactive interviews and multi-guest · RTMPS ingest for professionals · HLS delivery · adaptive bitrate · CDN · secure stream tokens · chat WebSockets · background recording and transcoding · rate limiting and abuse prevention. Do not build custom global video infrastructure unnecessarily; evaluate reliable providers first; keep providers replaceable.

## 27.14 Privacy and security
Protected private rooms · expiring stream access tokens · restricted recording access · secure media storage · role-based permissions · protected participant contact information · GDPR and applicable law · account and media deletion · additional child-safety protections · never expose identity documents through streaming services.

## 27.15 Acceptance tests
Apply for verification · approve and reject · badge display · request interview · accept and schedule · join waiting room · start broadcast · watch broadcast · invite guest · moderate comments · report content · terminate violating broadcast · record with consent · restrict private broadcasts · Android, iOS and desktop · network interruptions · notification preferences · moderation audit logs · appeals · age and regional restrictions.

## 27.16 Implementation priority
PHASE 1: verified accounts · celebrity profiles · interview requests · scheduled video interviews. PHASE 2: live streaming · audience chat · moderators · notifications. PHASE 3: multi-guest professional broadcasts · RTMPS · recording and publishing · advanced moderation dashboard.
Build incrementally. **Do not launch public live streaming until moderation, reporting, emergency controls, privacy and legal compliance are operational.**

---

## 27.17 Request an Interview system
**UI:** a "Request an Interview" button on every eligible verified public figure profile.
**Form:** title · topic · purpose · preferred date · preferred time · proposed duration · format (private video interview / public live interview / recorded interview) · additional message · optional supporting links.
**Celebrity dashboard (Interview Requests inbox):** accept · reject · propose alternative date · request more information · block future requests from a user · set availability · min/max duration · enable/disable requests.
**Workflow:** PENDING → ACCEPTED → SCHEDULED → COMPLETED; alternatives REJECTED · ALTERNATIVE_PROPOSED · CANCELLED · EXPIRED.
**Scheduling:** store UTC · display in each participant's timezone · prevent conflicts · confirmations · configurable reminders · rescheduling and cancellation.
**Interview room:** secure private video room · waiting room · camera/mic tests · host and guest controls · optional audience admission · recording consent · end-interview controls.
**Public live interview:** a private interview never becomes public automatically; switching to public live needs explicit approval from the relevant participants and compliance with live eligibility rules.
**Notifications to both parties:** submitted · accepted · alternative proposed · rejected · scheduled · changed or cancelled · about to begin.
**Security:** only the intended celebrity accesses their incoming requests · only authorized participants enter private rooms · protect contact information · anti-spam and rate limits · blocking and reporting · admin actions audited.
**Acceptance:** full workflow from submission to completion incl. rejection, alternative scheduling, cancellation, timezone conversion, private-room authorization and recording consent.

---

## 27.18 Admin-controlled verified identity system
**Core principle:** every verified badge is approved manually by the FAMILY NETWORK administration team; never automatic. Verification confirms the account genuinely belongs to the real person or an authorized representative.
**Application ("REQUEST ACCOUNT VERIFICATION"):** legal full name · public account name · category · country · official identity document · profile ownership evidence · official website or social links where available · additional documents when necessary. Organizations/representatives: proof of legal authorization · organization documentation · evidence of authority to manage the account.
**Statuses:** NOT_REQUESTED · PENDING · UNDER_REVIEW · ADDITIONAL_INFORMATION_REQUIRED · APPROVED · REJECTED · SUSPENDED · REVOKED. Only authorized verification administrators approve or revoke.
**Manual review checklist:** applicant identity · authenticity and validity of documents · applicant is the represented person · applicant controls the account · representative authorization valid · impersonation or fraud risk. OCR/AI may assist but never independently approve.
**Verification Center (admin):** pending · under review · approved · rejected · suspended/revoked · search by account and application ID · secure document review · internal reviewer notes · request more information · approve/reject · history · appeals.
**On approval:** status VERIFIED · official badge displayed · reviewer ID · approval timestamp · category. **On rejection:** no badge · decision and reason stored internally · appeal option · confidential reviewer notes never exposed.
**Badge integrity:** backend-controlled · users cannot upload/activate badges · prevent fake badge graphics being read as official · recheck on ownership change · admins can suspend/revoke · all badge changes in an immutable audit log.
**Security & privacy:** documents stored separately from public profile data · encrypted at rest and in transit · access limited to authorized verification personnel · every document access logged · retention and deletion policies · GDPR and local law · never expose government ID numbers or images · no biometric matching without clear legal basis and safeguards.
**Database:**
- **verification_applications:** id · user_id · application_category · legal_name · country · status · submitted_at · reviewed_at · reviewer_id · decision_reason
- **verification_documents:** id · application_id · document_type · secure_storage_key · verification_status · uploaded_at · retention_expires_at
- **verification_audit_logs:** id · application_id · administrator_id · action · reason · created_at
**Acceptance:** new application · secure document submission · admin review · additional information request · manual approval · manual rejection · appeal · badge activation · suspension · revocation · unauthorized approval prevention · document access audit · deletion after retention expiry.

**IMPORTANT:** A verified badge means the platform has checked identity and account authenticity. It does not mean FAMILY NETWORK endorses the person's opinions, statements or activities.
