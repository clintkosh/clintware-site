# Clintware Google OAuth Verification

Updated: 2026-09-28

## Scope

This verification track is for the core Clintware Google connection used by Clintware identity, scheduling, and outbound Gmail delivery. It is intentionally separate from LandThePlane's browser-direct Gmail evidence feature.

Production URLs:

- Homepage: https://www.clintware.com/
- Privacy: https://www.clintware.com/privacy/
- Terms: https://www.clintware.com/terms/
- OAuth broker: https://auth.clintware.com/
- Delegated Google disclosure: https://auth.clintware.com/delegated/google/start
- Primary scheduling feature: https://meet.clintware.com/

## Requested scopes

Core identity:

- `openid`
- `email`
- `profile`

Google Workspace:

- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/calendar.freebusy`
- `https://www.googleapis.com/auth/calendar.events`

The core delegated grant must not request `gmail.readonly` or `calendar.readonly`. Those scopes are not needed for the demonstrated scheduler/outbound-mail flow.

## Scope justifications

### gmail.send

Clintware uses this scope to send user-requested or workflow-requested outbound messages from the connected Google account, such as scheduling confirmations and related notifications. The core delegated connection does not read Gmail inbox contents. A read scope is not required for this functionality.

### calendar.freebusy

Clintware uses this scope only to query busy intervals so the scheduling interface can avoid offering times that conflict with the connected calendar. The application does not need full read access to calendar contents for availability checks.

### calendar.events

Clintware uses this scope to create the scheduled meeting, retrieve the synchronized event when needed for the user-facing workflow, update/reschedule that event, and cancel/delete it when the booking is canceled. This is narrower than full Calendar access and directly matches the scheduling functionality shown in the application.

## Demo video requirements

The production recorder is:

- QQ task: `record-google-oauth-verification`
- Target device: `DRIZNET`
- Output: `C:\Users\batman\Downloads\Clintware-Google-OAuth-Verification-Demo.mp4`

The final recording must visibly show:

1. Clintware homepage and branding.
2. Clintware's Google-data access disclosure with Privacy and Terms links.
3. The complete Google OAuth consent flow in English.
4. The requested scopes matching this document.
5. Calendar free/busy being used to render available scheduling times.
6. Calendar event creation.
7. Gmail send use for the requested confirmation.
8. Calendar event update/reschedule.
9. Calendar event cancellation/deletion.

The recorder may advance unambiguous Google account/consent controls after explicit authorization. It must never type a password, OTP, passkey, recovery code, or other authentication secret.

## Data handling represented to Google

- Delegated Google connection data is limited to the authorized account identity and encrypted refresh credential required to maintain the connection.
- Short-lived Google access tokens are obtained on demand and are not intentionally persisted as long-term application records.
- Core delegated Gmail access is send-only.
- Free/busy results are used for availability decisions rather than retained as mailbox-style history.
- Google user data is not sold, used for targeted advertising, provided to data brokers, or used to train generalized/non-personalized AI or ML models.
- Users can revoke Clintware through their Google Account and can request deletion of stored connection data using the contact published in the Privacy Policy.

## Submission sequence

1. Confirm Branding is published and the app audience is In production.
2. Confirm `clintware.com` domain ownership is verified in Google Search Console by a Google Cloud project Owner/Editor.
3. In Google Auth Platform Data Access, retain only the scopes listed above for this verification track.
4. Record and review the final demo video.
5. Upload the video to an accessible location accepted by Google (YouTube, Google Drive, or another accessible file link).
6. Open Verification Center / Prepare for verification.
7. Enter the scope justifications from this document.
8. Add the demo-video link.
9. Review the configured homepage, privacy policy, terms, developer contact, authorized domains, and scope list.
10. Submit for verification.
11. Preserve the submission state and review correspondence. Do not claim Google approval until Google marks the review approved.

## Separation rule

LandThePlane's optional browser-direct Gmail evidence scan is a separate feature and is not part of the core scheduler/send verification recording. Its restricted Gmail-read authorization must not be silently bundled into this core verification track.
