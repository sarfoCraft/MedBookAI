## v2.4 — Pricing, accents, demographic PDF, context menu, backups, migration guide
- **Feature 1:** In-memory $400 Lifetime preview; new providers start a 30-day no-card trial; upgrade is simulation only. Trial-expiry guard covers requested actions and open forms.
- **Feature 2:** Ten accent presets plus color picker and specialty reset; custom accent is saved in localStorage.
- **Feature 3:** Explicit Download Demographics PDF button, with two-column print CSS.
- **Feature 4:** Right-click seeded patient/appointment rows for open in another window, open here, or copy ID; new tabs cannot see records created in other tabs.
- **Feature 5:** Whitelisted synthetic record JSON export and schema-checked restore (max 15 MB; replacement confirmation). No live patient or security claims.
- **Feature 6:** 23-column, two-row demonstration CSV template and mapping instructions; CSV upload/parser is intentionally not implemented.

## v2.3.1 — Signature reliability maintenance

- Signature ink detection checks RGB pixels rather than canvas alpha alone.
- Added error recovery and a re-rendered signature modal for retry; signing takes independent per-encounter and per-provider signature snapshots.
- The signature pad now guards against duplicate listener binding on an existing canvas.
- Confirmed the role switch already contains only one Doctor profile reset.
- Demo-only in-browser signature; not a legally valid electronic signature.

# MedBook AI UI — v2.1 Changes

## v2.3 — SOAP inline snippets, modifier suggestions, demo DX→CPT hints

- Added eight synthetic inline SOAP snippets and custom Create/Edit/Delete. Inserts append to the selected SOAP field; built-ins remain read-only. Signed notes remain locked.
- Added editable PT `GP` / Chiropractic `AT` demo modifier prefill, with a billing-verification disclaimer. These are suggestions, not authoritative coding assignments.
- Added five illustrative DX→CPT mappings, scoped to the active unsigned encounter; suggestions never auto-add and can be dismissed.
- All new state is in-memory only. Do not enter real patient data or use these examples for medical decision-making or billing.

## v2.2 — SOAP templates, e-signature, catalog expansion

- Added 12 built-in specialty-aware SOAP templates (General, PT, Chiropractic, Dermatology), custom create/edit/delete and specialty filters. Applying a template fills only empty SOAP fields.
- Added typed and optional drawn electronic-signature capture. Signed encounters store their own signature snapshot, and the encounter and printable superbills display it. Demo only; no trusted signing certificate or production audit trail.
- Expanded the synthetic ICD-10-CM and CPT lists and added a 16-entry NUCC taxonomy sample list with datalist inputs. Reference codes and statuses are not an authoritative licensed codebook.
- Added diagnostic empty state for appointment doctor selection and made the role/specialty doctor reset explicit.
- Clarified Clinic Owner practice management controls and restricted practice/staff modal messages.
- Test the SOAP template picker, custom template lifecycle, signature capture, DX/CPT autocomplete, provider taxonomy selection, appointment empty state and practice-role messaging.

## v2.1 — Practice Management, Encounters, Demographics and Operational Reporting

1. Added a dedicated **Encounters** navigation screen with patient-wise encounter selection and practice / doctor filters. Opening a row sets the selected patient context before entering the SOAP / DX / CPT workspace.
2. Added **Practice Management** with independent practice profiles, create/edit/view/delete actions, branch mapping, legal and display names, contact, address, website, timezone, organization NPI / Tax ID and practice taxonomy. When records reference a branch, deletion opens a reassignment step that moves doctors, providers, patients and appointments to another practice before removing the profile; branch renames propagate to linked records.
3. Added editable **Provider Taxonomy Code (NUCC)** and practice assignment to each provider profile. Provider credentials and expiry fields are editable; Doctor role preview is limited to the current provider profile.
4. Expanded patient registration and editing to include complete demographics: DOB / calculated age, sex, pronouns, marital status, phone, email, address, city, region, postal code, country, preferred language, occupation, emergency contact and payer details. Synthetic demographic defaults were added to existing sample patients.
5. Added a patient-profile **Demographics PDF** action. The printable form includes the full demographic, emergency contact, provider, practice and insurance/member fields and uses the browser Print / Save as PDF dialog.
6. Added appointment reporting for all appointment details, practice-wise summaries and doctor-wise summaries. Reports support inclusive date filters and practice / doctor selectors and export CSV rows from the appointment state.
7. Added a **Superbill Register** with practice and rendering-doctor filters, filtered CSV export, individual superbill printing and combined print-to-PDF for all filtered patient superbills.
8. Updated the global branch selector to derive its options from practice profiles. Editing a provider can assign that provider to a different configured practice.
9. Added `TEST_SCRIPT_V21.py` for new practice CRUD, provider taxonomy, patient demographics, encounter navigation, filtered superbills and appointment report regression checks.
10. All v2.1 records remain fabricated and browser-memory-only. Print / Save PDF is browser print output; no independent server PDF service, persistent database, live taxonomy verification, claim submission or production access control was added.



## v2.0 — Synthetic Coding, RCM, Clinical Documentation and Financial Clearance

1. Added mock `state.icd10Codes`, `state.cptCodes`, `state.deletedCptCodes` and `state.expiringDx`; searchable Coding Reference page, dashboard code-expiry banner, explicit fictional CPT Code Updates alert, and state-level blocking of deleted CPT demonstration items. The valid-looking CPT `99213` remains active in mock examples; invented `DEMO-CPT-OLD` is marked deleted to avoid presenting false real-world code updates.
2. Added `state.encounters` with per-patient editable SOAP templates, draft save, in-memory signature flag, code/charge capture, DX duplication checks, multiple CPT charge lines, modifiers, units, and total calculation. Signed encounters block editing or charge changes (UI only, not legal signing).
3. Added superbill CSV (patient name, synthetic DOB/member, date of service, rendering provider, DX and CPT codes, modifier, units, charge, total) and a dedicated printable superbill. Browser Print / Save PDF does not generate an independent binary PDF or transmit a payer claim.
4. Extended synthetic patients with `payerType`, `insuranceStatus`, `vobStatus`, `memberId`, `groupNumber`, `copay`, `deductibleRemaining`, `careType`, and sample DOB. Patient drawer now shows Insurance & Eligibility, 2-second fake VOB, member-card Front/Back and visual-only Replace Card, plus print-preview ABN specimen.
5. Added Workers Comp / Auto / Personal Injury conditional **Claim Details** patient-drawer tab with adjuster/injury/attorney/arbitration demo fields and a mock print form clearly labeled not an official CMS-1500.
6. Added conditional Hospice Care sidebar/page, mock election/certification/attending physician/terminal diagnosis, and a printable hospice certification sample.
7. Added `state.providers` with intentionally invalid DEMO-prefixed NPI/Tax ID/DEA/CAQH/license identifiers, license/DEA expiry checks, Provider Profiles screen and detailed modal. Enriched existing `state.staff` and Team Directory View Profile action.
8. Added DX Expiring, CPT Deleted, License Expiring and VOB Pending notifications with routed navigation. Alerts and audit entries are fake in-memory records, not official notices.
9. Added scoped responsive CSS for coding, SOAP, charge capture, provider lists, member cards and document forms. Form modal stacking now correctly places a print modal above an open patient drawer. New `.document-print-cover` style creates white/black print layouts without altering `.invoice-print-cover`.
10. Added the `--suite v20` Playwright regression section and new UI previews. Older v1.6/v1.7/v1.8/v1.9 suite sections remain intact and passed independently. No framework or new MedBook global JavaScript library was added; SnapText remains iframe-isolated.
11. All mock code statuses, credentials, form templates and financial figures are invented. They are not valid regulatory, clinical, insurance or payment decisions, and are not suitable for patient data or live billing.

## v1.9 — Clinical Utilities (SnapText Studio v1.0 iframe integration)

1. **Clinical Utilities sidebar:** Added six native SPA sidebar entries: `ocr`, `pdf-merge`, `pdf-split`, `img-pdf`, `qr-gen` and `doc-crop`. `navGroups`, `titlePage`, and Doctor's UI role scope are updated. For a tool selection, central `navigate()` changes `state.page` to `clinical-tools` and stores the selected whitelisted ID in `state.activeTool`.
2. **Isolated workspace:** Added `clinicalToolsPage()` with MedBook header, current tool/tier information, and a responsive 100%-width, minimum 800px-height iframe. Paths are fixed locally under `snaptext-tools/tools/…/index.html`, so the MedBook app does not import SnapText CSS or JavaScript. All original SnapText assets and pages are included in `snaptext-tools/`.
3. **Freemium UI badges:** The Doctor role sees **FREE** badges on all six utilities, the Clinic Owner sees **PRO**, and both can navigate. The Receptionist preview does not show the module. No production authorization, pricing, subscription billing or tool licensing has been implemented.
4. **Theme bridge:** Added `snaptext-tools/assets/medbook-theme-bridge.js` to each of the six tool documents. It reads parent `data-theme` on the same origin, synchronizes the embedded `<html data-theme>` and reacts to subsequent parent theme changes. Added iframe-only embed CSS, without global SnapText style leakage.
5. **Preserve work while re-theming:** When Clinical Utilities is active, MedBook toggles its theme tokens and top-bar button in place (rather than destroying/recreating the iframe), avoiding loss of an ongoing file selection or tool work.
6. **Performance:** External vendor scripts are loaded only when a tool is opened. Each integrated HTML tool page includes only the required third-party library: Tesseract.js for OCR, pdf-lib for the PDF conversion/merge/split operations, QRCode.js for QR generation, or Cropper.js for document cropping. All libraries continue using the original external CDNs and require internet access; they are not installed as global MedBook dependencies.
7. **Testing:** Extended the single-browser Playwright suite with `--suite v19` to validate the six sidebar routes, source file existence, iframe rendering from the original HTML, role badges, theme bridge, and existing appointment navigation. Direct `file://` and HTTP navigation is blocked in the test environment; a same-origin `srcdoc` test fixture uses the supplied tool HTML. Functional OCR/PDF conversion against third-party libraries was not exercised.
8. **Scope and safety:** The copied SnapText app is still an independent client-side tool; outputs are not written to MedBook `state` and no healthcare records are injected into the tool. **Not suitable for PHI without a separate security/compliance review.** The iframe is not an authorization boundary.

## v1.8 — Availability CSV, NPS Date Filtering, Reset and Print Polish

1. **Document default correction:** Added pure `getExistingDocuments(id)` read helper, used by both `timelineFor()` and the patient drawer. Removed implicit `Insurance_Card.pdf` creation on drawer/timeline reads; `documentFor()` now initializes an empty array only during the explicit Add Demo Document action.
2. **Availability CSV export:** Added `availabilityWeekDays()`, `availabilityDoctors()` and `availabilityCsvRows()` shared by the calendar and export. Owner-scoped `availability-export` calls the existing `triggerCsv()`, with Doctor, Branch, Day, Date, Status and Details columns. Output reflects visible week and branch, leave reasons and shift hours.
3. **NPS date filtering:** `filteredFeedback()` selects inclusive ISO dates and `feedbackMetrics()` computes promoter/passive/detractor percentages and NPS from selected `state.feedback`. Preview and CSV use the same results, including an empty-period state. Fixed static +85 illustration no longer drives metrics.
4. **Reset Demo:** Added Owner-only sidebar Reset Demo action. Removes only `medbook-demo-theme` from `localStorage` and calls `window.location.reload()`, preserving unrelated same-origin storage while restoring the initial in-memory state.
5. **Dark-mode printing:** Print styles force white paper, black invoice text, grey borders and badges, with background transitions disabled. Sidebar, floating controls, toasts and invoice footer remain hidden in print media.
6. **Mobile theme access:** Retained dark-mode toggle visibility at 320–540px and hid low-priority ribbon and branch pill to save space. Existing crumb breakpoint 371/370px is preserved.
7. **Unified regression suite:** Consolidated v1.6, v1.7 and v1.8 tests into one Playwright browser, one `load()` and one `go()` function. Added checks for CSV content, date-filtered NPS and export, reset key removal/reinitialization, print color CSS and mobile theme control. Because direct localhost/file navigation is blocked in this test sandbox, reload is intercepted by a test-only script substitution and state reinitialization is tested separately.
8. **Scope:** All data, leave, feedback and invoices remain simulated. No backend, new frontend dependencies, external calls or production authorization mechanisms are introduced.

## v1.7 — Timeline, Doctor Leave, Feedback, Dark Mode & Modal Toasts

1. **Modal-safe toasts:** In `render()`, toggle `body.modal-open` whenever `state.modal` is set. New top-anchored toast rules at `20px` (plus the safe-area inset on mobile) prevent footer button overlap. Keep the existing three-toast limit, expiry, reduced-motion support and bottom placement when the modal is closed.
2. **Search invoice printing:** Each authorized invoice search result now exposes a **Print** button, `search-print-invoice:<id>`, as well as the existing clickable result. Both actions open `invoice:<id>` detail after the same role/scope check; the existing footer **Print Invoice** invokes `window.print()`.
3. **Deduplicated action handling:** Confirmed `new-appointment` and `new-invoice` are routed only via guarded branches in `applyAction()`, not in the generic `applyActionBase()` modal list.
4. **Patient Timeline:** Replaced the fixed two-entry demo list with an accessible, scrollable timeline that merges six historical entries in `state.patientTimeline` with patient-scoped appointments, invoices, documents and new prescription draft items. New document entries carry a local date, prescription drafts are associated with their current demo encounter patient, and all displayed content is escaped.
5. **Doctor Availability & Leave:** Added `state.doctorLeave`, week offset and selection state. Clinic Owner → Team & Roles exposes a weekly shift calendar, branch-scoped doctors, green available/orange leave/grey off statuses, and accessible read-only click details.
6. **Feedback & NPS:** Added `feedback` to report definitions; `state.feedbackNps` has an illustrative promoter/passive/detractor distribution, and `state.feedback` contains four fictional comments. A responsive NPS donut, comments, and downloadable example CSV are available through the existing report flow.
7. **Dark Mode:** Added `state.theme`, sun/moon top-bar toggle, `body[data-theme]` tokens for all four specialties, dark surface/typography controls and optional persistence of *only* the theme preference. Print styles remain isolated from dark screen styling.
8. **Regression tests:** Re-ran the previous appointment, invoice, audit, RBAC, insurance, reports and breadcrumb tests. New Playwright checks cover modal toasts, search-to-print, timeline, availability details and week navigation, feedback chart/CSV, dark mode and breakpoints 540/390/370/320px.
9. **Prototype scope:** All sample staff leave, feedback, patient history and invoices are fabricated. No APIs, actual patient records, production security, medication issuance or external data traffic was added.

## v1.6 — Invoice printing and action fixes

1. **Prescription Draft:** Confirmed and explicitly retained `prescription-add` and `prescription-remove:<id>` in `applyAction()`. The handlers check `roleCanView('consultation')`, add/remove synthetic items in `state.prescriptions`, call `render()`, and emit toasts. IDs now increment monotonically rather than being reused after removal.
2. **New Invoice:** Moved `new-invoice` modal dispatch from the generic `applyActionBase()` modal list into a dedicated `applyAction()` branch, preserving the billing role gate. The `[data-action="new-invoice"]` button opens `#form-invoice`.
3. **Print Invoice:** Added `[data-action="print-invoice"]` beside **Close** in invoice detail modal. Handler verifies role and current invoice scope, then invokes native `window.print()`; no API or PDF library is used.
4. **Print layout:** Invoice detail modals have an `invoice-print-cover` class. `@media print` hides the app layout, sidebar, floating settings button, toasts, modal background and actions; invoice heading, details, line items and totals remain printable. Small-screen invoice grid is reset to the standard four columns for printing.
5. **Responsive rules:** Retained 371–540px breadcrumb truncation, ≤370px hide behavior, and mobile toast placement above the settings button. No specialty palette changes.
6. **Docs and tests:** Updated README, test coverage and this changelog for v1.6.

## Preserved from v1.5 and v1.4

- Specialty-driven CSS variables and conditional specialty workspaces.
- Appointment calendar pre-fill, manual 12:30 default, overlap and working-hours validation.
- Synthetic insurance eligibility and patient drawer document actions.
- Audit filters (action, outcome, inclusive UTC date range), event counters and CSV export.
- In-memory invoice creation, payment simulation, correct tax totals and global search.
- RBAC UI preview, sample reports, responsive navigation, mobile breadcrumb and toast stack.

## Limitations

Frontend-only with fictional MedBook records and browser-memory state; embedded SnapText pages can use browser storage and external CDN resources. Role checks are illustrative and cannot secure real records. Printed invoices are mock documents; there is no live billing, payment, prescription transmission or server audit integration.
