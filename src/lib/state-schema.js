const { z } = require('zod');
const AppointmentDomain = require('../../appointment-domain');

const REQUIRED_ARRAY_KEYS = [
  'patients', 'appointments', 'followups', 'staff', 'providers', 'practices',
  'soapTemplates', 'textPatterns', 'invoices', 'auditLogs', 'feedback',
  'prescriptions', 'patientTimeline'
];
const OPTIONAL_ARRAY_KEYS = ['doctorLeave', 'notificationItems'];
const ARRAY_KEYS = [...REQUIRED_ARRAY_KEYS, ...OPTIONAL_ARRAY_KEYS];
const OBJECT_KEYS = ['encounters', 'signatures', 'documents', 'insurance', 'intakeConsents'];
const NUMBER_KEYS = ['nextSoapTemplateId', 'nextTextPatternId'];
const MAX_STATE_BYTES = 12 * 1024 * 1024;
const validDate = (value) => AppointmentDomain.isISODate(value);
const isPresent = (value) => value !== undefined && value !== null && value !== '';
const recordArray = z.array(z.record(z.string(), z.unknown())).max(50000);

const appointmentRecord = z.record(z.string(), z.unknown()).superRefine((appointment, ctx) => {
  const status = AppointmentDomain.normalizeStatus(appointment.status);
  if (!isPresent(appointment.id) || !['string', 'number'].includes(typeof appointment.id)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['id'], message: 'Appointment ID is required and must be a string or number.' });
  }
  if (!AppointmentDomain.STATUSES.includes(status)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['status'], message: 'Appointment status is not supported.' });
  }
  if (!validDate(appointment.date)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date'], message: 'Scheduled date must be a valid YYYY-MM-DD date.' });
  }
  if (typeof appointment.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(appointment.time)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['time'], message: 'Scheduled time must use 24-hour HH:mm format.' });
  }
  if (!isPresent(appointment.patient) || !['string', 'number'].includes(typeof appointment.patient)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['patient'], message: 'Appointment must reference a patient ID.' });
  }
  if (typeof appointment.doctor !== 'string' || !appointment.doctor.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['doctor'], message: 'Appointment must reference a doctor.' });
  }
  if (appointment.duration !== undefined && (!Number.isInteger(appointment.duration) || appointment.duration < 5 || appointment.duration > 480)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['duration'], message: 'Appointment duration must be an integer from 5 to 480 minutes.' });
  }
  const dos = appointment.actual_date_of_service;
  if (isPresent(dos)) {
    if (!['completed', 'checked-out'].includes(status)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['actual_date_of_service'], message: 'Actual DOS is only allowed for completed appointments.' });
    }
    if (!validDate(dos)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['actual_date_of_service'], message: 'Actual DOS must be a valid YYYY-MM-DD date.' });
    }
  }
  if (['no_show', 'rescheduled', 'cancelled'].includes(status) && isPresent(dos)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['actual_date_of_service'], message: 'No-show, rescheduled and cancelled appointments cannot have an actual DOS.' });
  }
  for (const field of ['created_on', 'rescheduled_on', 'cancelled_on']) {
    if (appointment[field] !== undefined && !validDate(appointment[field])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} must be a valid clinic-local date.` });
    }
  }
  for (const field of ['created_at', 'completed_at', 'status_updated_at', 'no_show_at', 'rescheduled_at', 'cancelled_at']) {
    if (appointment[field] !== undefined && (typeof appointment[field] !== 'string' || appointment[field].length > 64 || Number.isNaN(Date.parse(appointment[field])))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} must be a valid timestamp.` });
    }
  }
  if (appointment.dos_verified !== undefined && typeof appointment.dos_verified !== 'boolean') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dos_verified'], message: 'DOS verification flag must be boolean.' });
  }
  if (appointment.dos_recorded_by !== undefined && appointment.dos_recorded_by !== null && typeof appointment.dos_recorded_by !== 'string') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dos_recorded_by'], message: 'DOS actor ID must be a string.' });
  }
  if (appointment.cancelled_reason !== undefined && (typeof appointment.cancelled_reason !== 'string' || appointment.cancelled_reason.length > 500)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cancelled_reason'], message: 'Cancellation reason must be 500 characters or fewer.' });
  }
  if (appointment.dosHistory !== undefined) {
    if (!Array.isArray(appointment.dosHistory) || appointment.dosHistory.length > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dosHistory'], message: 'DOS history must be an array with no more than 100 entries.' });
    } else {
      appointment.dosHistory.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object' || (entry.previous !== null && !validDate(entry.previous)) || !validDate(entry.next) ||
            typeof entry.reason !== 'string' || entry.reason.trim().length < 8 || entry.reason.length > 500 || (entry.at !== undefined && (typeof entry.at !== 'string' || Number.isNaN(Date.parse(entry.at)))) || (entry.actor !== undefined && typeof entry.actor !== 'string')) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dosHistory', index], message: 'Each DOS history entry requires valid previous/next dates and a correction reason.' });
        }
      });
    }
  }
  if (appointment.attendanceCorrectionHistory !== undefined) {
    if (!Array.isArray(appointment.attendanceCorrectionHistory) || appointment.attendanceCorrectionHistory.length > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['attendanceCorrectionHistory'], message: 'Attendance correction history is invalid.' });
    } else appointment.attendanceCorrectionHistory.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object' || !['scheduled','no_show'].includes(AppointmentDomain.normalizeStatus(entry.from)) ||
          !['scheduled','arrived'].includes(AppointmentDomain.normalizeStatus(entry.to)) ||
          typeof entry.reason !== 'string' || entry.reason.trim().length < 8 || entry.reason.length > 500 || (entry.at !== undefined && (typeof entry.at !== 'string' || Number.isNaN(Date.parse(entry.at)))) || (entry.actor !== undefined && typeof entry.actor !== 'string')) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['attendanceCorrectionHistory', index], message: 'Attendance correction requires a valid transition and reason.' });
      }
    });
  }
});

const shape = {};
for (const key of REQUIRED_ARRAY_KEYS) shape[key] = key === 'appointments' ? z.array(appointmentRecord).max(50000) : recordArray;
for (const key of OPTIONAL_ARRAY_KEYS) shape[key] = recordArray.optional();
for (const key of OBJECT_KEYS) shape[key] = z.record(z.string(), z.unknown());
for (const key of NUMBER_KEYS) shape[key] = z.number().int().nonnegative().max(100000000);
shape.customAccent = z.string().regex(/^#[0-9a-f]{6}$/i).nullable();
shape.website = z.object({
  name: z.string().max(120), tagline: z.string().max(500), color: z.string().regex(/^#[0-9a-f]{6}$/i),
  services: z.boolean(), mobile: z.boolean(), published: z.boolean()
}).strict().optional();
shape.seo = z.object({ title: z.string().max(200), description: z.string().max(500), slug: z.string().max(200) }).strict().optional();
shape.modules = z.record(z.string(), z.boolean()).optional();
shape.integrationConnections = z.record(z.string(), z.boolean()).optional();
shape.nextPrescriptionId = z.number().int().nonnegative().max(100000000).optional();
shape.note = z.string().max(30000).optional();
shape.theme = z.enum(['light', 'dark']).optional();
shape.activeSpecialty = z.enum(['general', 'pt', 'chiro', 'derm']).optional();
shape.activeDoctor = z.string().max(160).optional();
shape.branch = z.string().max(160).optional();
shape.selectedPracticeId = z.string().max(160).optional();
shape.selectedEncounterAppointmentId = z.string().max(100).optional();
shape.doctorDashboardDoctor = z.string().max(160).optional();
shape.doctorDashboardRange = z.enum(['today', 'week', 'month', '7d', '30d', 'all']).optional();
shape.billing = z.record(z.string(), z.unknown()).optional();
const stateSchema = z.object(shape).strict();

function assertSafeJson(value, depth = 0) {
  if (depth > 40) throw new Error('Maximum JSON nesting depth exceeded.');
  if (Array.isArray(value)) {
    if (value.length > 50000) throw new Error('Array item limit exceeded.');
    for (const item of value) assertSafeJson(item, depth + 1);
    return;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe object key detected.');
      assertSafeJson(value[key], depth + 1);
    }
  }
}

function idKey(value) { return String(value); }
function uniqueIds(records, label, issues) {
  const seen = new Set();
  records.forEach((record, index) => {
    if (!isPresent(record?.id)) {
      issues.push({ path: [label, index, 'id'], message: `${label} record requires an ID.` });
      return;
    }
    const key = idKey(record.id);
    if (seen.has(key)) issues.push({ path: [label, index, 'id'], message: `Duplicate ${label} ID: ${key}.` });
    seen.add(key);
  });
  return seen;
}
function validateFinancialRecord(invoice, index, issues) {
  const path = ['invoices', index];
  if (!isPresent(invoice.patientId)) issues.push({ path: [...path, 'patientId'], message: 'Invoice must reference a patient ID.' });
  for (const field of ['amount', 'tax']) {
    if (invoice[field] !== undefined && (!Number.isFinite(Number(invoice[field])) || Number(invoice[field]) < 0 || Number(invoice[field]) > 100000000)) {
      issues.push({ path: [...path, field], message: `Invoice ${field} must be a non-negative finite amount.` });
    }
  }
  if (invoice.items !== undefined) {
    if (!Array.isArray(invoice.items) || invoice.items.length > 500) {
      issues.push({ path: [...path, 'items'], message: 'Invoice items must be an array with no more than 500 lines.' });
      return;
    }
    let subtotal = 0;
    invoice.items.forEach((item, itemIndex) => {
      const qty = Number(item?.qty), unit = Number(item?.unit);
      if (!Number.isInteger(qty) || qty < 1 || qty > 10000 || !Number.isFinite(unit) || unit < 0 || unit > 100000000) {
        issues.push({ path: [...path, 'items', itemIndex], message: 'Invoice line quantity and unit price are invalid.' });
      } else subtotal += qty * unit;
    });
    if (Number.isFinite(Number(invoice.amount))) {
      const expected = Math.round((subtotal + Number(invoice.tax || 0)) * 100) / 100;
      const actual = Math.round(Number(invoice.amount) * 100) / 100;
      if (Math.abs(expected - actual) > 0.01) issues.push({ path: [...path, 'amount'], message: 'Invoice amount does not equal line subtotal plus tax.' });
    }
  }
  if (invoice.status !== undefined && !['Paid', 'Pending', 'Draft', 'Overdue', 'Void', 'Refunded'].includes(String(invoice.status))) {
    issues.push({ path: [...path, 'status'], message: 'Invoice status is not supported.' });
  }
}

function normalizeDOSVerification(data) {
  const appointmentsById = new Map((data.appointments || []).map((appointment) => [idKey(appointment.id), appointment]));
  for (const appointment of data.appointments || []) {
    const completed = AppointmentDomain.isCompleted(appointment);
    const hasDate = validDate(appointment.actual_date_of_service);
    if (appointment.dos_verified === undefined) {
      appointment.dos_verified = completed && hasDate && appointment.dos_verified === true;
    }
    if (!completed || !hasDate) appointment.dos_verified = false;
  }
  for (const invoice of data.invoices || []) {
    const appointment = isPresent(invoice.appointmentId) ? appointmentsById.get(idKey(invoice.appointmentId)) : null;
    if (!appointment) continue;
    if (appointment.dos_verified === false) invoice.dos_verified = false;
    else if (validDate(appointment.actual_date_of_service)) {
      if (!isPresent(invoice.actual_date_of_service)) invoice.actual_date_of_service = appointment.actual_date_of_service;
      invoice.dos_verified = true;
    } else invoice.dos_verified = false;
  }
  for (const encounter of Object.values(data.encounters || {})) {
    if (!encounter || typeof encounter !== 'object' || Array.isArray(encounter)) continue;
    const appointment = isPresent(encounter.appointmentId) ? appointmentsById.get(idKey(encounter.appointmentId)) : null;
    if (!appointment) continue;
    if (appointment.dos_verified === false && AppointmentDomain.isCompleted(appointment)) encounter.dos_verified = false;
    else if (validDate(appointment.actual_date_of_service) && AppointmentDomain.isCompleted(appointment)) {
      if (!isPresent(encounter.actual_date_of_service)) encounter.actual_date_of_service = appointment.actual_date_of_service;
      if (!isPresent(encounter.dateOfService)) encounter.dateOfService = appointment.actual_date_of_service;
      encounter.dos_verified = true;
    } else {
      encounter.actual_date_of_service = null;
      encounter.dateOfService = '';
      encounter.dos_verified = false;
    }
  }
}

function validateState(input, options = {}) {
  let serialized;
  try {
    serialized = JSON.stringify(input);
    if (typeof serialized !== 'string' || Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) {
      return { success: false, error: 'State payload exceeds the 12 MB limit.' };
    }
    assertSafeJson(input);
  } catch (_) {
    return { success: false, error: 'State payload contains invalid or unsafe JSON data.' };
  }
  const parsed = stateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: 'State payload failed schema validation.', issues: parsed.error.issues };

  const data = { ...parsed.data };
  normalizeDOSVerification(data);
  const issues = [];
  const patientIds = uniqueIds(data.patients, 'patients', issues);
  const appointmentIds = uniqueIds(data.appointments, 'appointments', issues);
  uniqueIds(data.staff, 'staff', issues);
  uniqueIds(data.providers, 'providers', issues);
  uniqueIds(data.practices, 'practices', issues);
  uniqueIds(data.invoices, 'invoices', issues);
  const doctorNames = new Set([
    ...data.staff.filter((member) => String(member.role || '').toLowerCase() === 'doctor').map((member) => String(member.name || '')),
    ...data.providers.map((provider) => String(provider.name || ''))
  ].filter(Boolean));
  const doctorBranchAssignments = new Set([
    ...data.staff.filter((member) => String(member.role || '').toLowerCase() === 'doctor' && member.name && member.branch)
      .map((member) => `${String(member.name)}\u0000${String(member.branch)}`),
    ...data.providers.filter((provider) => provider.name && provider.branch)
      .map((provider) => `${String(provider.name)}\u0000${String(provider.branch)}`)
  ]);
  const branches = new Set(data.practices.map((practice) => String(practice.branch || '')).filter(Boolean));
  if (data.appointments.length && !doctorNames.size) issues.push({ path: ['staff'], message: 'Appointments require at least one configured doctor/provider.' });
  data.patients.forEach((patient, index) => {
    if (!options.allowExternalPatientDoctor && patient.doctor && !doctorNames.has(String(patient.doctor))) issues.push({ path: ['patients', index, 'doctor'], message: 'Patient references a doctor that does not exist in this clinic.' });
    if (!options.allowExternalPatientBranch && patient.branch && !branches.has(String(patient.branch))) issues.push({ path: ['patients', index, 'branch'], message: 'Patient references a clinic branch that does not exist.' });
  });
  const appointmentsById = new Map(data.appointments.map((appointment) => [idKey(appointment.id), appointment]));
  const invoicesByAppointment = new Set();

  data.appointments.forEach((appointment, index) => {
    const path = ['appointments', index];
    if (!patientIds.has(idKey(appointment.patient))) issues.push({ path: [...path, 'patient'], message: 'Appointment references a patient that does not exist.' });
    if (!doctorNames.has(String(appointment.doctor))) issues.push({ path: [...path, 'doctor'], message: 'Appointment references a doctor that does not exist in this clinic.' });
    if (appointment.branch && !doctorBranchAssignments.has(`${String(appointment.doctor)}\u0000${String(appointment.branch)}`)) {
      issues.push({ path: [...path, 'doctor'], message: 'Appointment doctor must be assigned to the selected clinic branch.' });
    }
    if (appointment.branch && !branches.has(String(appointment.branch))) issues.push({ path: [...path, 'branch'], message: 'Appointment references a clinic branch that does not exist.' });
    if (options.clinicToday && validDate(options.clinicToday) && isPresent(appointment.actual_date_of_service) && appointment.actual_date_of_service > options.clinicToday) {
      issues.push({ path: [...path, 'actual_date_of_service'], message: 'Actual DOS cannot be in the future in the clinic timezone.' });
    }
    if (AppointmentDomain.normalizeStatus(appointment.status) === 'no_show' && options.clinicToday && validDate(options.clinicToday) && appointment.date > options.clinicToday) {
      issues.push({ path: [...path, 'status'], message: 'A future appointment cannot be marked as no-show.' });
    }
    const clinicTime = typeof options.clinicNow === 'string' ? options.clinicNow : options.clinicNow?.time;
    if (AppointmentDomain.normalizeStatus(appointment.status) === 'no_show' && options.clinicToday === appointment.date && typeof clinicTime === 'string' && /^\d{2}:\d{2}$/.test(clinicTime)) {
      const [hour, minute] = String(appointment.time || '00:00').split(':').map(Number);
      const [nowHour, nowMinute] = clinicTime.split(':').map(Number);
      if ((hour * 60 + minute + (Number(appointment.duration) || 30)) > (nowHour * 60 + nowMinute)) {
        issues.push({ path: [...path, 'status'], message: 'An appointment cannot be No-Show before its scheduled end time in the clinic timezone.' });
      }
    }
    for (const field of ['rescheduled_from_id', 'rescheduled_to_id']) {
      if (isPresent(appointment[field]) && !appointmentsById.has(idKey(appointment[field]))) {
        issues.push({ path: [...path, field], message: 'Reschedule link references an appointment that does not exist.' });
      } else if (isPresent(appointment[field])) {
        const linked = appointmentsById.get(idKey(appointment[field]));
        const reciprocalField = field === 'rescheduled_to_id' ? 'rescheduled_from_id' : 'rescheduled_to_id';
        if (idKey(linked?.[reciprocalField]) !== idKey(appointment.id)) issues.push({ path: [...path, field], message: 'Reschedule links must point to each other.' });
      }
    }
  });

  data.invoices.forEach((invoice, index) => {
    validateFinancialRecord(invoice, index, issues);
    if (isPresent(invoice.patientId) && !patientIds.has(idKey(invoice.patientId))) {
      issues.push({ path: ['invoices', index, 'patientId'], message: 'Invoice references a patient that does not exist.' });
    }
    if (!isPresent(invoice.appointmentId)) {
      if (isPresent(invoice.actual_date_of_service)) issues.push({ path: ['invoices', index, 'actual_date_of_service'], message: 'An unlinked invoice cannot claim an appointment actual DOS.' });
      return;
    }
    const appointment = appointmentsById.get(idKey(invoice.appointmentId));
    if (!appointment) {
      issues.push({ path: ['invoices', index, 'appointmentId'], message: 'Invoice references an appointment that does not exist.' });
      return;
    }
    if (idKey(appointment.patient) !== idKey(invoice.patientId)) {
      issues.push({ path: ['invoices', index, 'patientId'], message: 'Invoice patient must match its linked appointment patient.' });
    }
    if (invoice.dos_verified !== undefined && typeof invoice.dos_verified !== 'boolean') issues.push({ path: ['invoices', index, 'dos_verified'], message: 'Invoice DOS verification flag must be boolean.' });
    const legacyCompletedWithoutDos = AppointmentDomain.isCompleted(appointment) && (!isPresent(appointment.actual_date_of_service) || appointment.dos_verified === false) && !isPresent(invoice.actual_date_of_service);
    const legacyUnverifiedDos = AppointmentDomain.isCompleted(appointment) && appointment.dos_verified === false && isPresent(invoice.actual_date_of_service) && validDate(invoice.actual_date_of_service) && invoice.dos_verified === false;
    const verifiedDosMatches = appointment.dos_verified === true && AppointmentDomain.isCompleted(appointment) && validDate(appointment.actual_date_of_service) && invoice.actual_date_of_service === appointment.actual_date_of_service && invoice.dos_verified === true;
    if (!legacyCompletedWithoutDos && !legacyUnverifiedDos && !verifiedDosMatches) {
      issues.push({ path: ['invoices', index, 'actual_date_of_service'], message: 'Invoice must reference a completed appointment and use a verified Actual DOS, or retain a clearly flagged legacy unverified DOS.' });
    }
    if (invoicesByAppointment.has(idKey(invoice.appointmentId))) issues.push({ path: ['invoices', index, 'appointmentId'], message: 'An appointment can have only one invoice in this release.' });
    invoicesByAppointment.add(idKey(invoice.appointmentId));
  });

  for (const [key, encounter] of Object.entries(data.encounters)) {
    if (!encounter || typeof encounter !== 'object' || Array.isArray(encounter)) {
      issues.push({ path: ['encounters', key], message: 'Encounter must be an object.' });
      continue;
    }
    if (isPresent(encounter.patientId) && !patientIds.has(idKey(encounter.patientId))) {
      issues.push({ path: ['encounters', key, 'patientId'], message: 'Encounter references a patient that does not exist.' });
    }
    if (!isPresent(encounter.appointmentId)) {
      if (isPresent(encounter.actual_date_of_service)) issues.push({ path: ['encounters', key, 'actual_date_of_service'], message: 'An unlinked encounter cannot carry an actual DOS.' });
      continue;
    }
    const appointment = appointmentsById.get(idKey(encounter.appointmentId));
    if (!appointment) {
      issues.push({ path: ['encounters', key, 'appointmentId'], message: 'Encounter references an appointment that does not exist.' });
      continue;
    }
    if (idKey(encounter.patientId) !== idKey(appointment.patient)) issues.push({ path: ['encounters', key, 'patientId'], message: 'Encounter patient must match its linked appointment patient.' });
    if (encounter.provider && encounter.provider !== appointment.doctor) issues.push({ path: ['encounters', key, 'provider'], message: 'Encounter provider must match the linked appointment doctor.' });
    if (encounter.dos_verified !== undefined && typeof encounter.dos_verified !== 'boolean') issues.push({ path: ['encounters', key, 'dos_verified'], message: 'Encounter DOS verification flag must be boolean.' });
    if (isPresent(encounter.actual_date_of_service) && !validDate(encounter.actual_date_of_service)) issues.push({ path: ['encounters', key, 'actual_date_of_service'], message: 'Encounter Actual DOS must be a valid clinic-local date.' });
    if (appointment.dos_verified === false) {
      if (encounter.dos_verified !== false) issues.push({ path: ['encounters', key, 'dos_verified'], message: 'Encounter linked to a legacy unverified DOS must remain flagged unverified.' });
    } else {
      const expectedDos = AppointmentDomain.isCompleted(appointment) ? (appointment.actual_date_of_service || null) : null;
      if ((encounter.actual_date_of_service || null) !== expectedDos || (expectedDos && encounter.dos_verified !== true)) {
        issues.push({ path: ['encounters', key, 'actual_date_of_service'], message: 'Encounter actual DOS must match its linked appointment and be verified after completion.' });
      }
    }
    if (encounter.cptItems !== undefined) {
      if (!Array.isArray(encounter.cptItems)) issues.push({ path: ['encounters', key, 'cptItems'], message: 'Encounter CPT items must be an array.' });
      else encounter.cptItems.forEach((item, i) => {
        const units = Number(item?.units || 1), charge = Number(item?.charge || 0);
        if (!Number.isInteger(units) || units < 1 || units > 10000 || !Number.isFinite(charge) || charge < 0 || charge > 100000000) {
          issues.push({ path: ['encounters', key, 'cptItems', i], message: 'Encounter charge line has invalid units or charge.' });
        }
      });
    }
  }

  for (const key of ['documents', 'insurance', 'intakeConsents']) {
    for (const patientId of Object.keys(data[key])) {
      if (!patientIds.has(idKey(patientId))) issues.push({ path: [key, patientId], message: `${key} contains a record for a patient that does not exist.` });
    }
  }
  for (const [index, prescription] of data.prescriptions.entries()) {
    const patientRef = prescription.patientId ?? prescription.patient;
    if (isPresent(patientRef) && !patientIds.has(idKey(patientRef))) issues.push({ path: ['prescriptions', index, 'patientId'], message: 'Prescription references a patient that does not exist.' });
  }
  for (const [index, timeline] of data.patientTimeline.entries()) {
    const patientRef = timeline.patientId ?? timeline.patient;
    if (isPresent(patientRef) && !patientIds.has(idKey(patientRef))) issues.push({ path: ['patientTimeline', index, 'patientId'], message: 'Patient timeline event references a patient that does not exist.' });
  }

  if (issues.length) return { success: false, error: 'State data failed relationship or financial integrity validation.', issues };
  delete data.billing;
  return { success: true, data };
}

module.exports = { ARRAY_KEYS, OBJECT_KEYS, NUMBER_KEYS, stateSchema, validateState, assertSafeJson, MAX_STATE_BYTES };
