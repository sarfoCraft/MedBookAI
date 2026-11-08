# MedBook AI v2.6 changelog

## Appointment lifecycle and billing

- Added `no_show` and `rescheduled` appointment states, including legacy `no-show` normalization.
- Scheduled appointments with a date earlier than the current clinic date are displayed as No-Show unless they were explicitly completed, cancelled or rescheduled.
- Added an explicit Mark No-Show action for overdue same-day bookings.
- Added a reschedule workflow that retains the original appointment as `rescheduled` and creates a linked new booking.
- Added `actual_date_of_service` to appointments, appointment-specific encounters and invoices.
- The actual DOS is set when an `in-consultation` appointment is completed; check-out preserves it.
- Invoices and superbills require a completed appointment with an actual DOS. No-show and rescheduled records are not billable.
- Encounter records are now appointment-specific while preserving the first legacy patient-level draft for compatibility.

## Doctor analytics

- Added a Doctor Dashboard with Total New Bookings, Visited / Completed and No-Shows cards.
- Added separate tables for new bookings, completed visits (showing actual DOS), and missed appointments.
- Added 7-day, 30-day and all-time reporting periods and a doctor selector for the owner account.

## Validation and tests

- Added browser-independent appointment lifecycle helpers and Jest unit tests.
- Added state-schema rules preventing actual DOS on non-completed appointments and enforcing appointment-to-encounter DOS matching.
- Added invoice validation requiring its linked completed appointment and matching actual DOS.
- Added appointment lifecycle, DOS and rescheduling fields to the persisted-state schema.
