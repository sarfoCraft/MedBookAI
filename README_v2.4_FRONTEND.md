# MedBook AI v2.4 — Six Frontend Demo Features
Adds an in-memory 30-day free trial and mock $400 one-time Lifetime tier (no payment processing), optional localStorage accent selection, patient demographics print-to-PDF, right-click patient-row menu, JSON backup/restore, and synthetic CSV mapping template/instructions. **No backend or real account entitlements exist.** All clinical and billing records are fictional and reset on refresh; the accent override and pre-existing theme preference are the only app settings saved locally. **Never paste or import real patient data.** JSON Restore accepts only MedBook demo JSON backups and cannot import CSV. Browser Save as PDF is used for demographics, not server-side PDF creation. New windows start from seeded data, so tab-only edited records do not transfer.

# MedBook AI v2.1 — Multi-Specialty EHR + Practice Management + Encounters + RCM Demo

A **frontend-only, browser-memory prototype** built with vanilla JavaScript (ES6), CSS variables, and HTML. It extends the existing v1.3 architecture and maintains the Sage Green, Ocean Blue, Orange/Teal, and Purple/Rose specialty palettes.

## Run

Extract the entire ZIP **without changing the directory structure**, including the `snaptext-tools/` folder. For reliable iframe paths and OCR/PDF libraries, run the project with a **local static-file server** (no backend application or API is required):

```bash
cd MedBook_AI_v2_1_RCM_Practice_Encounters_Demo
python -m http.server 8000
```

Open **http://localhost:8000/** in Chrome, Edge or Firefox. The MedBook UI uses only local `app.js` and `styles.css`; SnapText's embedded tool pages independently fetch their **pinned third-party libraries** (e.g., OCR language packs and vendor JS) from the original public CDNs when visited, so an internet connection is needed for full document-tool functionality. Opening `index.html` via `file://` may work for some basic screens but can fail for iframe file access, OCR workers, clipboard functions and downloads under browser policies.

The app starts as Clinic Owner / General Medicine. Use **Active Specialty** and **View as Role** in the top bar. EHR/appointment/invoice changes reset on reload; only the MedBook light/dark preference is optionally saved. SnapText itself can use browser local storage/IndexedDB for its own tools independently. No data is passed automatically between MedBook and an embedded tool.

## Key Features

- **Inline SOAP Text Patterns:** eight built-in synthetic snippets plus custom Create/Edit/Delete; click Insert demo snippet beside a SOAP field.
- **Demo Specialty Modifier Hints:** PT `GP` and chiropractic `AT` suggested, editable and not a payer validation.
- **Non-blocking DX→CPT Demo Suggestions:** selected ICD-10 examples show optional CPT chips; nothing is added until explicitly clicked.


- **SOAP Note Templates (v2.2)** — Specialty-aware seeded and custom templates; empty-only application to SOAP draft fields.
- **Electronic Signature (v2.2, demo only)** — Typed and optional drawn signature stored on the signed encounter and included on superbill printouts; no legally valid e-signature.
- **Searchable DX/CPT/Taxonomy (v2.2)** — Demo catalogs with input/datalist lookup and exact code validation.

- **Multi-Practice Management (v2.1)** — Independent editable practice profiles with add / delete controls, branch mapping, contact and address fields, organization identifiers, and practice taxonomy. Linked doctors, patients and appointments are reassigned to another practice before deletion.
- **Dedicated Encounters (v2.1)** — A separate Encounters screen lists patient encounters by practice and doctor, opens the selected patient in the SOAP workspace, and supports DX/CPT charge capture.
- **Provider Taxonomy & Individual Profiles (v2.1)** — Provider profiles now show an editable NUCC taxonomy code, credential fields and assigned practice. Doctor-role preview is limited to the signed-in demo provider profile.
- **Complete Patient Demographics (v2.1)** — Registration and patient profiles include DOB/age, sex, pronouns, marital status, phone, email, address, city/state/postal/country, language, occupation, emergency contact and payer details. Profiles can be edited independently.
- **Patient Demographics PDF (v2.1)** — The Patient Profile offers a print-ready demographics / registration form. Use the browser Print dialog and choose Save as PDF; the PDF includes all populated demographics and payer fields.
- **Appointment Reporting (v2.1)** — Date-filtered all-appointment detail CSV plus practice-wise and doctor-wise appointment summaries, with practice and doctor filters.
- **Practice / Doctor Superbill Register (v2.1)** — Filter superbills by practice and rendering doctor, export a filtered register CSV, print one encounter, or print all filtered superbills into a combined PDF.

- **Multi-Specialty Dynamic Theming** — General Medicine, Physical Therapy, Chiropractic, and Dermatology use CSS-variable themes driven by `body[data-specialty]`.
- **RBAC UI Preview** — Switch between Clinic Owner, Doctor and Receptionist to inspect role-scoped navigation (illustrative only, not access enforcement).
- **Appointment Conflict Detection** — Calendar slot selection pre-fills doctor/date/time; new manual appointments start today at 12:30. The demo rejects overlaps and out-of-shift bookings.
- **Insurance Eligibility Mock** — Fictional payer data, simulated eligibility status changes, and document notifications without external connections.
- **In-memory Audit Logging** — Synthetic access/activity events, action/outcome/UTC date-range filtering and CSV export; not immutable or compliant auditing.
- **Responsive Design** — Fluid panels, small-screen navigation, 371–540px breadcrumb truncation, and modal-aware toasts that avoid mobile footer controls.
- **Prescription Draft** — Role-scoped Add Draft Item / Remove controls change synthetic items in browser memory only, re-render and display feedback toasts.
- **Print Invoice** — Open a synthetic invoice from Billing or global search, then use Print Invoice for a dedicated print layout without app chrome.
- **Patient Timeline / Visit History** — Scroll through historical synthetic events and live in-memory patient appointments, prescriptions, invoices and document entries.
- **Doctor Availability & Leave** — Team & Roles → Availability offers a Monday–Sunday calendar with shift hours, leave/off status, click-to-view details, and a branch/week-specific CSV export.
- **Patient Feedback & NPS** — A report with a date-filtered, dynamically computed NPS donut and comments; CSV exports include only the selected period.
- **Dark Mode** — A sun/moon top-bar toggle remains visible on mobile and changes `body[data-theme]`; all four specialty palettes have corresponding dark tokens. Print Invoice uses black text on white regardless of screen theme.
- **Coding Reference and Alerts (v2.0)** — Search mock ICD-10-CM and CPT items; see synthetic 30-day expiry alerts and a discontinued procedure test case. Deleted CPT demo items are rejected by encounter charge capture. **Not an official or licensed codebook.**
- **Encounter SOAP & Superbill (v2.0)** — Use editable SOAP fields, save a browser-memory draft, sign to lock, add multiple DX/CPT codes and modifiers, export a biller-oriented CSV, and print a sample superbill via the browser’s Print / Save PDF dialog.
- **Patient Insurance & Financials (v2.0)** — Mock payer type/coverage, member IDs, group numbers, copays, deductibles, and an asynchronous simulated verification of benefits (VOB); visual front/back member cards; printable ABN specimen.
- **Specialized Claims and Hospice (v2.0)** — Workers Comp/Auto/Personal Injury claim-detail tab, fictional adjuster/attorney data and a CMS-1500-*style* preview; hospice certification/election demonstration forms.
- **Provider/Staff Profiles (v2.0)** — Fictional NPI, Tax ID, DEA, CAQH, license numbers and expiration warnings, plus staff contact and certification summaries. Prefixes `DEMO-` are intentionally invalid identifiers.
- **Clinical Utilities (v1.9)** — Six lazy-mounted SnapText Studio tools inside a styled iframe: Image to Text (OCR), Merge PDFs, Split PDF, Images to PDF, QR Code Generator and Scanner with Crop. The Doctor preview displays **FREE** badges; Clinic Owner displays **PRO** badges. Tool themes synchronize with MedBook, while imported tool CSS and heavyweight dependencies stay outside the MedBook page.

## New in v2.1 — Practice Management, Encounters and Complete Demographics

The v2.1 update adds a separate Encounters route, editable practice profiles, provider taxonomy, complete patient demographics and print-ready demographics forms. Reports now include all appointment details and practice-wise / doctor-wise summaries. The Superbill Register filters by practice and doctor and supports individual or combined print-to-PDF output.

All additions remain in-memory frontend demo features; no server-side database, live payer connection, electronic signature, credential verification or production authorization was added.

## New in v2.0 — Medical Billing, Coding and Documentation

**Scope:** Everything below uses fabricated data, lives only in the page's central `state`, and is a UI/UX preview. No claim is transmitted, no payer is queried, no prescription is issued, and no clinical note is legally signed. Real ICD-10/CPT validity and RVUs depend on code edition, payer, jurisdiction and (for CPT terminology) licensing; the sample status/expiry fields are **not live regulatory updates**.

### Modules and what they do

- **Coding Reference** (Insights & Operations): searchable ICD-10-CM DX and CPT mock lists (`state.icd10Codes`, `state.cptCodes`), invented deleted-code/expiration training arrays, a dashboard warning and bell notifications. `99213` is **active** in the sample; the deliberately deleted example is `DEMO-CPT-OLD`, not a claim about a real code.
- **Consultation → SOAP Notes / Encounter & Charges**: the current scope-selected patient has an encounter object in `state.encounters` with SOAP narrative, service date, rendering provider, status, diagnosis codes, and priced CPT line items. Add/remove multiple codes. A deleted CPT is blocked with a toast and audit preview. **Save Encounter Draft** keeps the draft in tab memory; **Sign Encounter** sets the status to Signed and locks SOAP fields/charge changes until reset. This is not cryptographic or legal signing.
- **Superbill CSV / print-to-PDF**: use **Download Superbill CSV** to export patient name, synthetic DOB/member ID, service date, rendering provider, DX codes, CPT codes, modifiers, units, charges and total. **Print / Save PDF** opens a document modal and calls `window.print()`; choose **Save as PDF** in your browser's print dialog. No external PDF library is added.
- **Patient Records → Patient Drawer**: open a patient to inspect payer type, status, group number, copay/deductible and synthetic VOB. **Run VOB** simulates a ~2-second verification and never calls a payer. **Member Card** flips between Front and Back; **Replace Card** displays a file chooser and discards the selection (no upload/storage). **Generate ABN** opens an ink-friendly, prominently labeled **unofficial sample**, not a CMS-compliant notice.
- **Workers Comp, Auto and Personal Injury**: fictional patients with those payer types gain a **Claim Details** drawer tab containing claim/adjuster/injury/attorney/mediation contacts and a **Print Required Forms** action. The printable layout is explicitly **CMS-1500-style**, not the actual CMS-1500 or a submit-ready form.
- **Hospice Care**: appears in the sidebar when a synthetic hospice patient exists. Displays example certification/election date, attending physician and terminal diagnosis field, with a printable sample certification. The patient drawer shows the same fields when applicable.
- **Management → Provider Profiles** and **Team & Roles → View Profile**: synthetic provider credential directory (including NPI/Tax ID/DEA/CAQH/license and near-term expiry warnings) plus staff contact and certifications.
- **Notifications**: new example types DX Expiring, CPT Deleted, License Expiring and VOB Pending. Navigation from the alert opens the matching mock page or patient drawer.

### Design and state notes

- The code uses the original `render()`, single delegated `applyAction()` handler, central `state` and existing specialty/dark-mode CSS tokens.
- Print rules are scoped to `.invoice-print-cover` and `.document-print-cover`, leaving unrelated screens hidden while printing and forcing white paper/black text even in dark mode.
- The SnapText Studio iframes, their local folders, their theme bridge, and their original external vendor loading behavior are unchanged.
- Security, access rules, payer eligibility, signatures, official ABNs, hospice conditions, coding updates, RVUs, privacy, financial reconciliation and submission formats require production services and independent professional review.

### How to test v2.0 manually

1. Run the static server described above. Open **Coding Reference**, search `M54.50`, and review the fictional expiry and `DEMO-CPT-OLD` deleted-code warnings.
2. Go to **Consultation** (select **Physical Therapy** for the sample active encounter). Enter Subjective and Objective text, add DX `M54.50`, select CPT `DEMO-CPT-OLD` and confirm the deletion toast. Add active CPT `99213`, optionally set modifier `25` and units, then export CSV.
3. Click **Print / Save PDF** for the Superbill; verify only the specimen form prints. Then click **Sign Encounter**. Confirm SOAP is read-only and charge changes are blocked.
4. Open **Patient Records** for a PT patient, inspect **Insurance & Eligibility**, **Run VOB**, flip the **Member Card**, and open the sample ABN. Toggle dark mode and confirm printing still uses a white background.
5. Open the **Workers Comp** patient (`PT-1044`) and switch the patient drawer to **Claim Details**. Open the printable claim preview. Check **Hospice Care** for `PT-1047` and its certification form.
6. Open **Provider Profiles** and **Team & Roles → View Profile**, then open the bell to view DX, CPT, VOB and license alerts.
7. Recheck **Clinical Utilities** OCR/PDF iframe paths and dark-mode synchronization, invoice printing, appointments, audit logs and reports.
8. For automated tests, install Playwright for testing only: `python -m pip install playwright` and `python -m playwright install chromium`. Run `python TEST_SCRIPT.py --suite v20` for the new features, or `--suite v16`, `v17`, `v18`, `v19` for legacy functionality. The test suite uses local HTML injection due to sandbox navigation limitations, so it does not validate external OCR engines, a real printer, insurers, claims gateways or healthcare compliance.

## New in v1.9 — Clinical Utilities integration

- **Six new navigation items:** Open **Clinical Utilities** in the sidebar and choose OCR, PDF Merge, PDF Split, Images to PDF, QR Generator or Scanner with Crop. `navigate(toolId)` sets `state.page = 'clinical-tools'` and `state.activeTool = toolId`; `clinicalToolsPage()` renders the selected whitelisted local route.
- **Embedded isolation:** Each selected tool runs in `snaptext-tools/tools/<route>/index.html` and keeps its own `snaptext-tools/assets/app.css`, JavaScript and local workspace. **Do not import its CSS into MedBook.** Only the active iframe is loaded; none of SnapText's libraries are requested by MedBook on initial load.
- **Performance:** The six integrated tool pages load **only the single third-party library they need** instead of all seven vendor libraries originally included in each SnapText page (plus the Cropper stylesheet only on the crop page). The original full SnapText site pages and shared scripts are also present in the copied folder.
- **Theme sync:** `snaptext-tools/assets/medbook-theme-bridge.js` reads the same-origin parent's `body[data-theme]` and updates the tool's `<html data-theme>`, using `MutationObserver` to follow changes. A small iframe-only CSS file removes duplicate SnapText navigation/advertising chrome. Changing MedBook's theme while using a tool avoids replacing the iframe so in-progress input is not discarded.
- **Role badges:** Clinic Owner sees **PRO**, Doctor sees **FREE**; both can open tools. Receptionist does not see Clinical Utilities in the UI role preview. These are **illustrative tiers**, with **no payment enforcement** or actual licensing.
- **Privacy / integration limits:** MedBook does not send patient records to SnapText and does not auto-import tool results. SnapText uses third-party script/CDN resources and browser-local document processing; it has **not been assessed for clinical data compliance or PHI**. Use only fabricated/test documents and avoid personally identifiable information in QR codes. An iframe is a visual/stylesheet boundary, **not** an authorization or security boundary.

## New in v1.8 — Reporting and usability fixes

- **Non-mutating documents:** `getExistingDocuments(patientId)` reads `state.documents[patientId] || []`. The timeline and drawer no longer fabricate an Insurance Card on view. Only clicking **Add Demo Document** initializes and appends a fictional file entry.
- **Availability CSV:** As Owner, go to Team & Roles → Availability → **Export CSV**. The export contains `Doctor, Branch, Day, Date, Status, Details` for the visible Mon–Sun week and selected branch, including leave reasons and shift hours. Use the week arrows and change branches to alter the export.
- **Accurate date-filtered NPS:** Start/End in Reports now filter `state.feedback` inclusively, the donut and comments are calculated from the filtered responses, and exported CSV uses the same selected records. **5 stars = promoter; 4 = passive; 1–3 = detractor.** Score = (promoters − detractors) ÷ responses × 100, rounded. The seeded default seven-day window contains three entries and scores **+67** (67% promoters, 33% passives); widening to 12 days includes all four sample comments and scores **+25**. Empty periods show **NPS —** with a no-feedback message.
- **Reset Demo:** An Owner-only sidebar button removes the demo's `medbook-demo-theme` storage key and calls `window.location.reload()`, returning to the original in-memory demo on reload. Other apps' same-origin storage is not modified.
- **Light printing in dark mode:** Invoice print rules force black text, white page background, grey badge outlines and no animated background transition. The page navigation and modal footer remain hidden.
- **Mobile dark toggle:** The moon/sun button is kept visible at narrow widths. The ribbon and branch selector are hidden when space is limited; the breadcrumb remains visible/truncated from 371–540px and hidden at ≤370px.
- **Unified test suite:** `TEST_SCRIPT.py` has one Playwright browser, one `load()` and one `go()`; the prior regression scenarios and v1.8 tests are run together. Tests simulate reload in a restricted browser sandbox; the production action uses native reload.

## New in v1.7 — Enterprise UI polish

- **Modal-aware toasts:** `render()` toggles `body.modal-open`. While an invoice or other modal is open, `#toast-root` anchors at the top (20px plus mobile safe-area inset); outside a modal, toasts retain their floating-settings-safe bottom position. The stack stays capped at three and animates down from the top, respecting reduced-motion settings.
- **Invoice global search:** Search results for invoices show a separate **Print** affordance next to the invoice entry; both controls open the authorized invoice detail modal, where **Print Invoice** calls the native browser print dialog. Neither search nor printing writes patient data.
- **No duplicate modal routing:** New Appointment and New Invoice are explicitly handled by `applyAction()` with existing UI role guards. The generic `applyActionBase()` modal list contains neither action.
- **Patient Timeline:** The drawer shows a capped-height, scrollable vertical list. It merges six seeded historical events for PT-1041 with the selected patient’s in-memory visits (past/current only), documents, invoices and consultation drafts. Newly added demo document and prescription entries appear without a page reload.
- **Doctor Availability:** Clinic Owner → Team & Roles → Availability shows a scrollable Monday–Sunday grid for each doctor in the selected branch. Green marks shift availability, orange marks mock leave, and grey indicates weekends/off days. Select a day to see a contextual status panel, or move between weeks. No editing or backend scheduling is implied.
- **Feedback & NPS:** Reports → Patient Feedback & NPS contains a conic-gradient donut and four seeded star-rated comments. In v1.8, the NPS and visible comments are recalculated from the chosen report dates, overriding the former fixed +85 illustration. **Generate** prepares a synthetic CSV with the breakdown and comment rows; nothing is surveyed or submitted.
- **Dark Mode:** Top-bar moon/sun icon toggles `state.theme` between `light` and `dark`; `themeEngine.apply()` maintains `data-theme` and `data-specialty` together. The browser can remember the visual preference in `localStorage` (if available); all patient/clinic data stays in memory.
- **Responsive guarantees:** The `.crumb` remains ellipsized at 371–540px and hidden at ≤370px. Invoice print CSS remains scoped to `.invoice-print-cover` and unaffected by screen-only dark colors.

## Final feature update (v1.6)

- **Prescription Draft actions:** `prescription-add` and `prescription-remove:<id>` are handled by `applyAction()`, gated by `roleCanView('consultation')`, with state changes, re-render and toast messages. Mock item IDs are not reused during the session.
- **New Invoice:** `[data-action="new-invoice"]` explicitly sets `state.modal = 'new-invoice'` in `applyAction()`, opening `#form-invoice` for a billing-authorized role.
- **Print Invoice:** The detail modal for `invoice:<id>` has a `[data-action="print-invoice"]` button beside Close. It calls `window.print()` after an in-memory role/invoice-scope check. Print-only CSS isolates the invoice and restores four-column line-item layout on small screens.
- **Responsive breadcrumb:** 371–540px still shows a truncated breadcrumb; 370px and narrower hides it. The mobile toast stack remains above the floating settings control.
- No real invoices, medicine prescriptions, payment processing, pharmacy services or PHI handling are implemented.

## Previous feature update (v1.5)

- Doctor availability `free-slot` buttons now open the booking modal with the selected doctor, date and time. The standard **New Appointment** action clears any prior draft and uses today's date at **12:30**.
- Consultation **Prescription Draft** now maintains a visible list of mock items in `state.prescriptions`, with **Add Draft Item** and **Remove** controls.
- Audit Log accepts optional **From (UTC)** and **To (UTC)** dates (inclusive UTC calendar days), combined with the existing Action Type and Outcome filters. The counter shows matching events against all in-memory events.
- Mobile breadcrumbs remain truncated between **371–540px** and hidden at **370px or below**; toasts stay above the floating settings button.
- All updates remain client-side, dependency-free and reset when reloaded.

## Added in v1.4

- Breadcrumb stays visible at widths **371–540px**, with compact truncation; hidden at **370px and below**.
- Doctor-role appointment empty states show the currently selected doctor, e.g. “No appointments for Dr. Bilal Shah on the selected date.”
- Audit log timestamps display `YYYY-MM-DD HH:MM:SS UTC`. Filter by **Action type** and **Outcome (All/Success/Denied)**; exported audit CSV uses the same UTC display format. A fictional denied event illustrates the filter.
- Invoice modal uses a more legible two-column detail layout on narrow mobile screens.
- Patient drawer **Add Demo Document** adds a new fictional `Pending` document record to `state.documents[patientId]`, plus a browser-memory demo audit event. It does **not** open, read, store, or upload real files.
- Toasts stack (maximum 3), expire after ~3.5 seconds and are placed above the floating settings button on mobile.
- Intake automatically shows the calculated age as soon as Date of Birth changes, without discarding other entered form values.
- Billing list and global invoice search render a canonical **Total** calculated from line items plus example tax; old sample `amount` fields are normalized on init.
- Replaces stale Billing information placeholder with a real **New Demo Invoice** form that creates local sample invoice state. Removes obsolete `billing-info`/`new-patient` placeholder modal text.
- All previously implemented scheduling conflict, specialist/doctor filtering, demo role navigation, alerts, insurance, reporting, integrations and specialty widgets are retained.

## How to test

### New in v1.9 — Clinical Utilities

1. **Start the app:** Use `python -m http.server 8000` from the extracted project root, then open `http://localhost:8000/` so nested static paths and OCR workers use a normal HTTP origin.
2. **Navigation and iframe:** As **Clinic Owner**, locate **Clinical Utilities** in the sidebar, select **Image to Text (OCR)**, and verify the header reads **Clinical Utility: Image to Text (OCR)** and the embedded SnapText OCR UI appears. Click the remaining five tools and confirm their respective page loads in the same workspace.
3. **Tier badges and RBAC preview:** All six sidebar items display **PRO** for Clinic Owner, **FREE** for Doctor; both can access the pages. Switch to **Receptionist** and verify the section disappears. These badges do not unlock paid features or protect actual data.
4. **Theme sync / session preservation:** While a tool is open, choose Dark Mode from MedBook's top bar. Verify both the MedBook and the embedded tool use dark colors without losing the current tool's content. Switch back to light. Check another specialty, and verify the existing specialty accent remains intact.
5. **Responsive tools:** At desktop and 390px viewport widths, ensure the iframe fills the available workspace without a horizontal MedBook scrollbar, and that tool content can scroll inside the frame. External QR/OCR libraries require an internet connection and may not operate when offline.
6. **Automated test:** Install Playwright only for testing (`python -m pip install playwright` and `python -m playwright install chromium`), then run `python TEST_SCRIPT.py --suite v20` (new RCM), or `--suite v19` (SnapText). This sandbox blocks direct local navigation, so the test loads the real SnapText HTML into a same-origin `srcdoc` iframe, validates each package path, role badge and theme bridge, but does **not** execute third-party OCR/PDF conversion libraries. Earlier suites remain available through `--suite v16`, `--suite v17`, `--suite v18` and `--suite v19`.


### New in v1.8

1. **Documents without phantom records:** Open a newly registered demo patient with no documents. Confirm that no Insurance Card appears in the document list or timeline. Click **Add Demo Document** once; only then should a single `Lab_Results.pdf` pending item appear in both views.
2. **Availability CSV:** As Clinic Owner, go to **Team & Roles → Availability** and click **Export CSV**. Confirm the six columns `Doctor, Branch, Day, Date, Status, Details`. The default all-branch export contains 28 doctor-days plus the header (four doctors × seven days). Change the branch and week and confirm the exported rows change. Leave reasons and shifts should be present.
3. **NPS date filter:** In **Reports → Patient Feedback & NPS**, confirm three entries in the initial last-seven-days window and **NPS +67**. Filter to yesterday only; see one five-star comment and **NPS +100**. Generate/download the CSV; only that comment should be exported. Choose future dates with no feedback; see **NPS —** and the empty-state message.
4. **Reset Demo:** As Owner, toggle dark mode and add a synthetic record. Click **Reset Demo** in the sidebar. Confirm a reload returns the app to light mode and its original records. The only stored demo theme key is cleared; unrelated browser storage is not modified.
5. **Dark print:** Toggle dark mode, switch to Physical Therapy and open a mock invoice. Choose **Print Invoice**. Its print preview must have a white page, black text and pale grey badges; sidebar and modal buttons must be absent. Closing the preview returns to the unchanged dark screen.
6. **Mobile theme:** At 320, 370, 390 and 540px, verify the moon/sun toggle remains clickable without horizontal overflow. Breadcrumb is absent at ≤370px and truncated at 371–540px.
7. **Automated checks:** Run `python TEST_SCRIPT.py` after installing Python Playwright and Chromium. The script uses direct browser injection to accommodate restricted local navigation and a test-only reload spy; the app itself has no dependencies. A printed test-result log is included.


### New in v1.7

1. **Toast with modal:** As Clinic Owner, open Billing → invoice `INV-2003` (in the Physical Therapy workspace), click **Record Payment**, and verify the toast appears near the **top** while the modal footer stays unobstructed. Close the modal and confirm subsequent toasts return to the bottom. Repeat around **390px**; at most three toasts are stacked.
2. **Search to Print:** Use the top-bar search, enter `INV-2001` under the Physical Therapy specialty, click **Print** beside the result, then click **Print Invoice** in the detail footer. The print preview must contain the invoice but no navigation, modal action buttons, floating settings or toasts. The search result itself also opens the detail.
3. **Patient Timeline:** In Physical Therapy, open Patient Records → **Amina Farooq** (`PT-1041`), and scroll through visits, prescriptions, invoices and documents. Click **Add Demo Document** and confirm the new item appears in the timeline as well as the Documents list. Other patient drawers only show their own records.
4. **Doctor Availability:** As Clinic Owner, open **Team & Roles → Availability**. Confirm the Monday–Sunday green/orange/grey grid, choose the **Nov 6, 2026** leave day for Dr. Sarah Malik, inspect **On Leave: Personal Leave**, and use the week navigation arrows. Availability is read-only.
5. **Feedback / NPS:** Open Reports → **Patient Feedback & NPS**. For the default seven-day range, confirm **+67 NPS points** and three sample comments. Extend the start date back at least 11 days to see all four (NPS +25). Click **Generate → Download CSV** and inspect the synthetic rows.
6. **Dark Mode:** Use the moon icon beside the notification bell to switch to dark mode; change Active Specialty to Physical Therapy, Chiropractic, Dermatology and General Medicine to verify each palette. Toggle sun to return to light. When browser storage is enabled, reload to check preference persistence.
7. **Mobile CSS:** At 540px and 390px the breadcrumb must remain visible with ellipsis; at 370px and 320px it must be hidden. Open an invoice and ensure its footer is visible below top-positioned toasts; verify the screen-only dark theme does not change the invoice print layout.

### Previous v1.6 scenarios

1. **Documents:** Set specialty to **Physical Therapy** → Patient Records → View Amina Farooq → Add Demo Document. A `Pending` entry appears; repeated clicks create additional numbered sample entries.
2. **Age:** Patient Records → Add Demo Patient → enter a DOB (e.g. `1992-07-17`) and confirm the Age field updates before submitting.
3. **New invoice:** As Clinic Owner, choose Physical Therapy → Billing & Invoices → **New demo invoice** (`[data-action="new-invoice"]`). Confirm the modal contains `#form-invoice`; try 2 × $45.50 with $9 tax and submit. The detail total should be **$100.00**, and the billing list should agree.
4. **Print Invoice:** From the newly created invoice detail, click **Print Invoice** beside Close. The browser's print dialog/preview should show only the invoice heading, patient, line items and totals, without the sidebar, modal footer, or page backdrop. Test on desktop and around 390px. Cancel printing to return to the app; no invoice or payment data should change.
5. **Prescription Draft:** As Clinic Owner or Doctor, open **Consultation** and click **Add Draft Item** twice. Confirm two fictional Paracetamol items and add feedback toasts. Click **Remove** for one and confirm the item disappears with a toast. Switch to Receptionist and confirm the Consultation view is restricted; draft editing must not be available for that role.
6. **Audit:** Set role to Owner → Audit Log → Outcome = **Denied**. Inspect the UTC timestamps and download a sample CSV.
7. **Doctor empty state:** Set role to Doctor → General Medicine → Appointments → choose a date without visits. The table says **which doctor** has no appointments.
8. **Toast:** Repeat Add Demo Document rapidly; at most 3 notifications display at once.
9. **Mobile:** Resize to around 390px to see the breadcrumb, compact invoice and unobstructed floating settings button; at 320px the breadcrumb is hidden to prioritize controls.

## Safety and limitations

This is **not a production EHR/EMR**. All identities, insurance notices, clinical metrics, documents, invoices, and integration responses are fictitious. No data is sent to a server. Role-based visibility is a **UI preview**, not server-enforced RBAC/ABAC or HIPAA/GDPR compliance. This demo does not verify actual eligibility, transmit an SMS, store an EHR document, process payment, call AI providers, or offer a tamper-resistant audit log. Embedded SnapText utility pages can read files explicitly selected in their own UI, can use browser storage, and fetch external JavaScript/worker resources. No compliance/security audit has been performed. Never upload real patient documents or data into this prototype.

Before deploying with patient data, implement the approved MedBook AI security specification separately: authenticated sessions and MFA, server authorization, resource/branch scoping and RLS, encryption and customer-controlled KMS, secure file scanning and storage, immutable audit mechanisms, approved integrations, backups/restoration, penetration tests, and applicable legal/compliance reviews.

## Files

- `app.js` — State, rendering, event delegation and all interactive demo logic.
- `styles.css` — Existing design system, specialty palettes and embedded frame styling.
- `index.html` — Entry point.
- `snaptext-tools/` — The original SnapText Studio HTML/JS/CSS/assets and the six integrated pages; iframe-only bridge (`assets/medbook-theme-bridge.js`) and CSS (`assets/medbook-embed.css`).
- `CHANGES.md` — v1.9 integration notes and preserved history.
- `TEST_SCRIPT.py` — Consolidated v1.6–v1.9 browser regression checks (test-only Playwright/Chromium dependency).
- `TEST_RESULTS.txt` — Chromium regression results for v1.6–v1.9.
- `assets/images/previews/preview_v17_*.png` — New v1.7 views (timeline, calendar, feedback, dark mode and mobile); `assets/images/previews/preview_v16_invoice_print.png` — preserved browser print layout screenshot.


## v2.1 regression test

Run `python TEST_SCRIPT_V21.py` to test practice create/edit/view/delete, provider taxonomy editing, complete patient registration and demographics PDF preview, encounter selection, practice-filtered superbills and appointment reporting. The legacy `TEST_SCRIPT.py --suite v20` suite continues to validate the v2.0 clinical / RCM flows.


## Code review without images

All static image files are isolated under `assets/images/previews/` and `snaptext-tools/assets/images/`. The separate **Code_Review_No_Images.zip** package excludes these assets, so reviewers do not need to upload screenshots or illustrations to inspect HTML, CSS, JavaScript or tests. Run the full website using the complete package: pages referencing excluded images will show missing images in the code-review package. Restoring the images to their original relative locations restores visuals without source changes.

## Testing

- v2.2: Open Consultation → SOAP template picker, Apply, custom template lifecycle; sign an encounter and verify signature in encounter view and superbill print; check DX/CPT autocomplete, taxonomy, appointment empty state, and owner-only practice profile controls.
