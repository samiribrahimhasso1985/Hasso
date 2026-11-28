# Personal Profile Photo Capture & Upload System

> Source: product owner (titled "25"; stored as CLAUDE.md §29).

## Objective
Every account must have a personal profile photograph during registration, via (1) capturing a new photo with a camera or (2) uploading an existing photo from phone, tablet or computer — on Android, iOS and Web.

## 25.1 Registration screen
Title **"Add Your Personal Photo"** — "Add a clear photograph of yourself to complete your digital identity."

**Option A — Take a Photo:** open camera · request permission · front and rear cameras on mobile · desktop webcam · live preview · capture · retake · crop · position · preview final result.

**Option B — Upload Photo:** Android gallery · iOS photo library · desktop file picker · drag and drop on desktop · file selection on mobile. Formats: JPG, JPEG, PNG, WEBP. Validate type, size, dimensions, integrity, upload security. Do not trust file extensions alone.

## 25.2 Photo editor
Circular profile preview · square crop · zoom · reposition · rotate · retake · replace · confirm. Keep the original only when necessary and per retention rules.

## 25.3 Photo verification
Where identity verification is required: compare the profile photo with the document portrait via an approved provider · optional selfie/liveness · an uploaded photo alone is not proof of identity · no automatic approval from OCR · manual review on failure · never expose biometric templates or comparison results.

**Three different images must never be confused:** the profile photograph (user-provided account image), the identity-document portrait (image inside an official document), and the live selfie (separate verification input).

## 25.4 Profile image management
Change · upload new · capture new · remove/replace · preview public profile · control who can see the photo. Record security events without unnecessarily retaining old photos.

## 25.5 Database — `profile_photos`
id · user_id · storage_key · mime_type · file_size · image_width · image_height · upload_method · moderation_status · is_current · created_at · updated_at.
No raw images in PostgreSQL; secure object storage with access-controlled URLs. Identity-document images live in a separate, stricter storage system.

## 25.6 Acceptance criteria
1 Capture with phone camera · 2 Capture with desktop webcam · 3 Upload from Android · 4 Upload from iOS · 5 Upload from computer · 6 Crop and preview · 7 Replace · 8 Invalid files rejected safely · 9 Final image appears on the profile · 10 Private images not reachable through public storage URLs · 11 Profile photo and identity verification statuses remain separate.

## 25.7 User experience
Simple and accessible; follows the FAMILY NETWORK design system: warm ivory backgrounds, soft stone cards, muted neutral colors, elegant typography, minimal icons, clear camera and upload actions. Not visually crowded.
