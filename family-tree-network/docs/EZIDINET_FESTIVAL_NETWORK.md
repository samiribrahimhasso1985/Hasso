# EZIDINET Festival Network (v1.2)

Status: **proposal** · Phase C · builds on Events & Calendar (FAMILY NETWORK §11).

## Purpose
Global cultural festivals, celebrations and event management — one calendar for the worldwide community.

## Functions
* **Cultural calendar:** recurring festivals and holy days with dates per year (lunar/solar calculations verified by the
  cultural review group; displayed with the note "dates confirmed by …").
* **Event management:** create event (any member — ordinary events need no prior approval, like Open Community
  projects), co-hosts, ticket-free RSVP, capacity, waiting list, reminders, updates, photo album after the event
  (visibility chosen by the organizer; private family photos never become public automatically).
* **Special review** for high-risk events or events requiring permits, and for events aimed at children.
* **Event locations:** venue address visible only to confirmed attendees if the organizer chooses "private address".
* **Live / video:** event videos only in the two video sections (Public Videos, Family Videos); no other video sections.
* Tickets and paid events: later, through Module 34 payment architecture.

## Screens
Festival calendar · Festival page (history & meaning — heritage content with knowledge status) · Event list/map
(events only, no members) · Event page · Create/manage event · My events.

## Data (planning)
`events`, `event_hosts`, `event_attendees`, `event_updates`, `festival_definitions`, `festival_dates`.

## Tests
Private address hidden from non-attendees · special-review events not visible before approval · reminders respect
notification preferences · RTL calendar rendering.
