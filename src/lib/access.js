'use strict';

const ROLE_LABELS = Object.freeze({
  OWNER: 'Clinic Owner', ADMIN: 'Clinic Admin', DOCTOR: 'Doctor',
  RECEPTIONIST: 'Receptionist', BILLING: 'Billing Staff', AUDITOR: 'Auditor', STAFF: 'Staff'
});

const WRITE_KEYS = Object.freeze({
  OWNER: '*', ADMIN: '*',
  DOCTOR: ['appointments', 'encounters', 'prescriptions', 'followups', 'patientTimeline'],
  RECEPTIONIST: ['patients', 'appointments', 'followups', 'insurance', 'intakeConsents', 'notificationItems'],
  BILLING: ['invoices', 'insurance'],
  STAFF: [],
  AUDITOR: []
});

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function key(value) { return String(value ?? ''); }
function isPlainObject(value) { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
function hasBranch(user) { return typeof user?.branch === 'string' && user.branch.trim().length > 0; }
function inBranch(record, user) { return hasBranch(user) && record?.branch === user.branch; }
function patientAllowed(patient, user) {
  if (!patient || !hasBranch(user)) return false;
  if (user.role === 'DOCTOR') return Boolean(user.providerName) && patient.doctor === user.providerName && patient.branch === user.branch;
  return patient.branch === user.branch;
}
function appointmentAllowed(appointment, user) {
  if (!appointment || !hasBranch(user)) return false;
  if (user.role === 'DOCTOR') return Boolean(user.providerName) && appointment.doctor === user.providerName && appointment.branch === user.branch;
  return appointment.branch === user.branch;
}
function patientRef(record) { return record?.patientId ?? record?.patient ?? null; }
function appointmentMap(state) { return new Map((state?.appointments || []).map((item) => [key(item.id), item])); }
function patientMap(state) { return new Map((state?.patients || []).map((item) => [key(item.id), item])); }

function invoiceAllowed(invoice, state, user) {
  if (user.role !== 'BILLING' || !hasBranch(user) || !invoice || !invoice.patientId) return false;
  const patients = patientMap(state);
  const appointments = appointmentMap(state);
  if (invoice.appointmentId !== undefined && invoice.appointmentId !== null && invoice.appointmentId !== '') {
    const appointment = appointments.get(key(invoice.appointmentId));
    return Boolean(appointment && appointment.branch === user.branch && key(appointment.patient) === key(invoice.patientId));
  }
  const patient = patients.get(key(invoice.patientId));
  return Boolean(patient && patient.branch === user.branch && (!invoice.branch || invoice.branch === user.branch));
}

function filterArray(items, predicate) { return (Array.isArray(items) ? items : []).filter(predicate); }
function filterPatientMap(value, patientIds) {
  return Object.fromEntries(Object.entries(value || {}).filter(([id, record]) => patientIds.has(key(id)) || patientIds.has(key(record?.patientId))));
}
function followupAllowed(item, user, patientIds) {
  if (!item || !hasBranch(user)) return false;
  const patientId = patientRef(item);
  if (patientId !== null && patientId !== '' && !patientIds.has(key(patientId))) return false;
  if (item.branch && item.branch !== user.branch) return false;
  if (user.role === 'DOCTOR') return item.doctor === user.providerName || (patientId !== null && patientIds.has(key(patientId)));
  return patientId !== null && patientId !== '' && patientIds.has(key(patientId));
}

function scopeStateForUser(input, user) {
  const state = clone(input);
  if (['OWNER', 'ADMIN'].includes(user.role)) return state;

  const appointments = filterArray(state.appointments, (appointment) => appointmentAllowed(appointment, user));
  const appointmentPatientIds = new Set(appointments.map((appointment) => key(appointment.patient)));
  const patients = filterArray(state.patients, (patient) => patientAllowed(patient, user) || appointmentPatientIds.has(key(patient.id)));
  const patientIds = new Set(patients.map((patient) => key(patient.id)));
  const appointmentIds = new Set(appointments.map((appointment) => key(appointment.id)));

  state.patients = patients.map((patient) => {
    if (user.role === 'DOCTOR') return patient;
    const common = ['id','name','age','sex','phone','doctor','branch','last','type','dob','email','address','city','region','postalCode','country','maritalStatus','preferredLanguage','pronouns','occupation','emergencyContactName','emergencyContactRelationship','emergencyContactPhone','registrationDate'];
    const billing = ['payerType','insuranceStatus','vobStatus','payerName','memberId','groupNumber','copay','deductibleRemaining'];
    const fields = user.role === 'BILLING' ? [...common, ...billing] : user.role === 'AUDITOR' ? ['id','name','branch','doctor','registrationDate'] : common;
    return Object.fromEntries(fields.filter((field) => Object.prototype.hasOwnProperty.call(patient, field)).map((field) => [field, patient[field]]));
  });
  state.appointments = appointments.map((appointment) => {
    if (user.role !== 'RECEPTIONIST') return appointment;
    const { actual_date_of_service, dosHistory, ...safeAppointment } = appointment;
    return safeAppointment;
  });
  state.followups = filterArray(state.followups, (item) => followupAllowed(item, user, patientIds));
  state.staff = filterArray(state.staff, (member) => user.role === 'DOCTOR'
    ? member.name === user.providerName && member.branch === user.branch
    : inBranch(member, user));
  state.providers = filterArray(state.providers, (provider) => user.role === 'DOCTOR'
    ? provider.name === user.providerName && provider.branch === user.branch
    : inBranch(provider, user));
  state.practices = filterArray(state.practices, (practice) => inBranch(practice, user));
  state.patientTimeline = user.role === 'DOCTOR'
    ? filterArray(state.patientTimeline, (event) => patientIds.has(key(patientRef(event)))) : [];
  state.prescriptions = user.role === 'DOCTOR'
    ? filterArray(state.prescriptions, (item) => patientIds.has(key(patientRef(item)))) : [];
  state.encounters = user.role === 'DOCTOR'
    ? Object.fromEntries(Object.entries(state.encounters || {}).filter(([, item]) =>
        patientIds.has(key(item?.patientId)) && (!item?.appointmentId || appointmentIds.has(key(item.appointmentId)))))
    : {};
  state.documents = user.role === 'DOCTOR' ? filterPatientMap(state.documents, patientIds) : {};
  state.insurance = ['DOCTOR', 'BILLING', 'RECEPTIONIST'].includes(user.role) ? filterPatientMap(state.insurance, patientIds) : {};
  state.intakeConsents = ['DOCTOR', 'RECEPTIONIST'].includes(user.role) ? filterPatientMap(state.intakeConsents, patientIds) : {};
  state.invoices = user.role === 'BILLING'
    ? filterArray(state.invoices, (invoice) => invoiceAllowed(invoice, input, user)) : [];
  state.feedback = [];
  state.auditLogs = [];
  state.notificationItems = filterArray(state.notificationItems, (item) =>
    (item.patientId && patientIds.has(key(item.patientId))) || (!item.patientId && item.branch === user.branch));
  state.signatures = user.role === 'DOCTOR' && user.providerName && state.signatures?.[user.providerName]
    ? { [user.providerName]: state.signatures[user.providerName] } : {};

  if (user.role === 'DOCTOR') {
    state.activeDoctor = user.providerName || '';
    state.doctorDashboardDoctor = user.providerName || '';
  }
  if (hasBranch(user)) state.branch = user.branch;
  return state;
}

function accessViolation(collection, message) {
  const error = new Error(message || `The submitted ${collection} records exceed this account's assigned access scope.`);
  error.code = 'ROLE_VALIDATION';
  error.issues = [{ path: [collection], message: error.message }];
  throw error;
}

function mergeScopedArray(existing, incoming, options) {
  const current = Array.isArray(existing) ? existing : [];
  const submitted = Array.isArray(incoming) ? incoming : [];
  const { collection, canRead, canCreate = canRead, canUpdate = () => true } = options;
  const currentById = new Map(current.map((record) => [key(record?.id), record]));
  const preserved = current.filter((record) => !canRead(record));
  const merged = [];
  const seen = new Set();

  for (const record of submitted) {
    if (!isPlainObject(record) || record.id === undefined || record.id === null || record.id === '') {
      accessViolation(collection, `Every submitted ${collection} record must have an ID.`);
    }
    const recordId = key(record.id);
    if (seen.has(recordId)) accessViolation(collection, `Duplicate ${collection} record ID submitted.`);
    seen.add(recordId);
    const before = currentById.get(recordId);
    if (before) {
      if (!canRead(before)) accessViolation(collection, `The account cannot access ${collection} record ${recordId}.`);
      const next = { ...before, ...record };
      if (!canUpdate(before, next)) accessViolation(collection, `The submitted ${collection} update changes a protected patient, appointment, doctor, or branch relationship.`);
      merged.push(next);
    } else {
      if (!canCreate(record)) accessViolation(collection, `The account cannot create this ${collection} record outside its assigned scope.`);
      merged.push(record);
    }
  }
  return [...preserved, ...merged];
}

function mergeScopedObject(existing, incoming, options) {
  const current = isPlainObject(existing) ? existing : {};
  const submitted = isPlainObject(incoming) ? incoming : {};
  const { collection, canRead, canCreate = canRead, canUpdate = () => true } = options;
  const result = Object.fromEntries(Object.entries(current).filter(([id, value]) => !canRead(id, value)));

  for (const [recordId, value] of Object.entries(submitted)) {
    const exists = Object.prototype.hasOwnProperty.call(current, recordId);
    const before = exists ? current[recordId] : undefined;
    if (exists && !canRead(recordId, before)) accessViolation(collection, `The account cannot access ${collection} record ${recordId}.`);
    const next = exists && isPlainObject(before) && isPlainObject(value) ? { ...before, ...value } : value;
    if (exists) {
      if (!canUpdate(recordId, before, next)) accessViolation(collection, `The submitted ${collection} update changes a protected patient or appointment relationship.`);
    } else if (!canCreate(recordId, value)) {
      accessViolation(collection, `The account cannot create this ${collection} record outside its assigned scope.`);
    }
    result[recordId] = next;
  }
  return result;
}

function mergeStateForUser(existingInput, incomingInput, user) {
  const existing = clone(existingInput);
  const incoming = clone(incomingInput);
  if (['OWNER', 'ADMIN'].includes(user.role)) return incoming;

  const existingAppointments = existing.appointments || [];
  const existingPatients = existing.patients || [];
  const existingPatientById = patientMap(existing);
  const existingAppointmentById = appointmentMap(existing);
  const scopedAppointments = existingAppointments.filter((appointment) => appointmentAllowed(appointment, user));
  const scopedAppointmentIds = new Set(scopedAppointments.map((appointment) => key(appointment.id)));
  const scopedPatientIds = new Set([
    ...existingPatients.filter((patient) => patientAllowed(patient, user)).map((patient) => key(patient.id)),
    ...scopedAppointments.map((appointment) => key(appointment.patient))
  ]);
  const incomingPatientById = new Map((incoming.patients || []).map((patient) => [key(patient.id), patient]));
  const receptionistPatientIds = new Set(scopedPatientIds);
  if (user.role === 'RECEPTIONIST') {
    for (const patient of incoming.patients || []) {
      if (!existingPatientById.has(key(patient.id)) && patientAllowed(patient, user)) receptionistPatientIds.add(key(patient.id));
    }
  }

  const doctorBelongsToBranch = (name) => Boolean(name && hasBranch(user) &&
    ((existing.staff || []).some((member) => member.role === 'Doctor' && member.name === name && member.branch === user.branch) ||
     (existing.providers || []).some((provider) => provider.name === name && provider.branch === user.branch)));
  const appointmentCreateAllowed = (record) => {
    if (!appointmentAllowed(record, user)) return false;
    const patient = existingPatientById.get(key(record.patient));
    if (user.role === 'DOCTOR') return patientAllowed(patient, user);
    if (user.role === 'RECEPTIONIST') {
      const candidatePatient = patient || incomingPatientById.get(key(record.patient));
      return receptionistPatientIds.has(key(record.patient)) && candidatePatient?.branch === user.branch && doctorBelongsToBranch(record.doctor);
    }
    return false;
  };

  const allowed = new Set(WRITE_KEYS[user.role] || []);
  if (allowed.has('appointments')) {
    existing.appointments = mergeScopedArray(existing.appointments, incoming.appointments, {
      collection: 'appointments',
      canRead: (record) => appointmentAllowed(record, user),
      canCreate: appointmentCreateAllowed,
      canUpdate: (before, next) => {
        if (key(before.patient) !== key(next.patient)) return false;
        if (user.role === 'DOCTOR') return before.doctor === user.providerName && before.branch === user.branch &&
          next.doctor === user.providerName && next.branch === user.branch && appointmentAllowed(next, user);
        return user.role === 'RECEPTIONIST' && before.branch === user.branch && next.branch === user.branch &&
          doctorBelongsToBranch(next.doctor) && appointmentAllowed(next, user);
      }
    });
  }
  if (allowed.has('patients')) {
    existing.patients = mergeScopedArray(existing.patients, incoming.patients, {
      collection: 'patients',
      canRead: (record) => patientAllowed(record, user),
      canCreate: (record) => user.role === 'RECEPTIONIST' && patientAllowed(record, user),
      canUpdate: (before, next) => user.role === 'RECEPTIONIST' && before.branch === user.branch && next.branch === user.branch
    });
  }
  if (allowed.has('followups')) {
    const followupPatientIds = user.role === 'RECEPTIONIST' ? receptionistPatientIds : scopedPatientIds;
    existing.followups = mergeScopedArray(existing.followups, incoming.followups, {
      collection: 'followups',
      canRead: (record) => followupAllowed(record, user, scopedPatientIds),
      canCreate: (record) => followupAllowed(record, user, followupPatientIds),
      canUpdate: (before, next) => key(patientRef(before)) === key(patientRef(next)) &&
        (user.role !== 'DOCTOR' || (!next.doctor || next.doctor === user.providerName)) &&
        (!next.branch || next.branch === user.branch)
    });
  }
  if (allowed.has('prescriptions')) {
    const prescriptionAllowed = (record) => user.role === 'DOCTOR' && scopedPatientIds.has(key(patientRef(record))) &&
      (!record.doctor || record.doctor === user.providerName) && (!record.branch || record.branch === user.branch);
    existing.prescriptions = mergeScopedArray(existing.prescriptions, incoming.prescriptions, {
      collection: 'prescriptions', canRead: prescriptionAllowed, canCreate: prescriptionAllowed,
      canUpdate: (before, next) => key(patientRef(before)) === key(patientRef(next)) && prescriptionAllowed(next)
    });
  }
  if (allowed.has('patientTimeline')) {
    const timelineAllowed = (record) => user.role === 'DOCTOR' && scopedPatientIds.has(key(patientRef(record)));
    existing.patientTimeline = mergeScopedArray(existing.patientTimeline, incoming.patientTimeline, {
      collection: 'patientTimeline', canRead: timelineAllowed, canCreate: timelineAllowed,
      canUpdate: (before, next) => key(patientRef(before)) === key(patientRef(next)) && timelineAllowed(next)
    });
  }
  if (allowed.has('invoices')) {
    const billingInvoiceAllowed = (invoice) => invoiceAllowed(invoice, existing, user);
    existing.invoices = mergeScopedArray(existing.invoices, incoming.invoices, {
      collection: 'invoices', canRead: billingInvoiceAllowed, canCreate: billingInvoiceAllowed,
      canUpdate: (before, next) => key(before.patientId) === key(next.patientId) &&
        key(before.appointmentId) === key(next.appointmentId) && billingInvoiceAllowed(next)
    });
  }
  if (allowed.has('staff')) {
    existing.staff = mergeScopedArray(existing.staff, incoming.staff, {
      collection: 'staff', canRead: (record) => record.name === user.displayName && inBranch(record, user),
      canCreate: () => false, canUpdate: () => false
    });
  }
  if (allowed.has('encounters')) {
    const encounterAllowed = (record) => {
      if (user.role !== 'DOCTOR' || !record?.patientId || !scopedPatientIds.has(key(record.patientId))) return false;
      if (record.appointmentId !== undefined && record.appointmentId !== null && record.appointmentId !== '') {
        const appointment = existingAppointmentById.get(key(record.appointmentId));
        return Boolean(appointment && scopedAppointmentIds.has(key(appointment.id)) && key(appointment.patient) === key(record.patientId));
      }
      return !record.provider || record.provider === user.providerName;
    };
    existing.encounters = mergeScopedObject(existing.encounters, incoming.encounters, {
      collection: 'encounters',
      canRead: (_id, record) => encounterAllowed(record),
      canCreate: (_id, record) => encounterAllowed(record),
      canUpdate: (_id, before, next) => key(before?.patientId) === key(next?.patientId) &&
        key(before?.appointmentId) === key(next?.appointmentId) && encounterAllowed(next)
    });
  }
  if (allowed.has('insurance')) {
    const insurancePatientIds = user.role === 'RECEPTIONIST' ? receptionistPatientIds : scopedPatientIds;
    existing.insurance = mergeScopedObject(existing.insurance, incoming.insurance, {
      collection: 'insurance',
      canRead: (patientId) => scopedPatientIds.has(key(patientId)),
      canCreate: (patientId) => insurancePatientIds.has(key(patientId)),
      canUpdate: (patientId) => insurancePatientIds.has(key(patientId))
    });
  }
  if (allowed.has('intakeConsents')) {
    existing.intakeConsents = mergeScopedObject(existing.intakeConsents, incoming.intakeConsents, {
      collection: 'intakeConsents',
      canRead: (patientId) => user.role === 'RECEPTIONIST' && scopedPatientIds.has(key(patientId)),
      canCreate: (patientId) => user.role === 'RECEPTIONIST' && receptionistPatientIds.has(key(patientId)),
      canUpdate: (patientId) => user.role === 'RECEPTIONIST' && receptionistPatientIds.has(key(patientId))
    });
  }
  if (allowed.has('notificationItems') && Array.isArray(incoming.notificationItems)) {
    const notificationAllowed = (record) => user.role === 'RECEPTIONIST' &&
      ((record.patientId && receptionistPatientIds.has(key(record.patientId))) || (!record.patientId && record.branch === user.branch));
    existing.notificationItems = mergeScopedArray(existing.notificationItems, incoming.notificationItems, {
      collection: 'notificationItems',
      canRead: (record) => user.role === 'RECEPTIONIST' &&
        ((record.patientId && scopedPatientIds.has(key(record.patientId))) || (!record.patientId && record.branch === user.branch)),
      canCreate: notificationAllowed,
      canUpdate: (before, next) => key(before.patientId) === key(next.patientId) && notificationAllowed(next)
    });
  }
  return existing;
}

function canWriteClinicState(role) {
  return (WRITE_KEYS[role] || []).length > 0 || WRITE_KEYS[role] === '*';
}

module.exports = { ROLE_LABELS, WRITE_KEYS, scopeStateForUser, mergeStateForUser, canWriteClinicState };
