const test = require('node:test');
const assert = require('node:assert/strict');
const domain = require('../appointment-domain');
const { scopeStateForUser, mergeStateForUser, canWriteClinicState } = require('../src/lib/access');
const { validateSnapshotTransitions, validateRoleChanges, applyServerAppointmentMetadata } = require('../src/lib/snapshot');

function snapshot() {
  return {
    patients: [
      { id: 'P1', name: 'Patient One', doctor: 'Dr One', branch: 'North' },
      { id: 'P2', name: 'Patient Two', doctor: 'Dr Two', branch: 'South' }
    ],
    appointments: [
      { id: 1, patient: 'P1', doctor: 'Dr One', branch: 'North', date: '2026-11-07', time: '09:00', duration: 30, status: 'in-consultation', service: 'Consultation', created_at: '2026-11-06T10:00:00', actual_date_of_service: null },
      { id: 2, patient: 'P2', doctor: 'Dr Two', branch: 'South', date: '2026-11-07', time: '10:00', duration: 30, status: 'scheduled', service: 'Review', created_at: '2026-11-06T10:00:00', actual_date_of_service: null }
    ],
    followups: [], staff: [
      { id: 1, name: 'Dr One', role: 'Doctor', branch: 'North' },
      { id: 2, name: 'Dr Two', role: 'Doctor', branch: 'South' }
    ],
    providers: [
      { id: 1, name: 'Dr One', branch: 'North' },
      { id: 2, name: 'Dr Two', branch: 'South' }
    ],
    practices: [{ id: 1, branch: 'North' }, { id: 2, branch: 'South' }],
    soapTemplates: [], textPatterns: [], invoices: [], auditLogs: [], feedback: [], prescriptions: [], patientTimeline: [],
    encounters: {}, signatures: {}, documents: {}, insurance: {}, intakeConsents: {}, customAccent: null
  };
}

test('past scheduled appointment is displayed as No-Show without mutating persisted status', () => {
  const appointment = { status: 'scheduled', date: '2026-11-06' };
  assert.equal(domain.effectiveStatus(appointment, '2026-11-07'), 'no_show');
  assert.equal(appointment.status, 'scheduled');
});

test('legacy unverified DOS is not billable until explicitly verified', () => {
  const appointment = { status: 'completed', actual_date_of_service: '2026-11-06', dos_verified: false };
  assert.equal(domain.hasActualDateOfService(appointment), false);
  appointment.dos_verified = true;
  assert.equal(domain.hasActualDateOfService(appointment), true);
});

test('same-day No-Show is blocked until the scheduled end time in clinic time', () => {
  const appointment = { status: 'scheduled', date: '2026-11-07', time: '10:00', duration: 30 };
  assert.throws(() => domain.markNoShow(appointment, '2026-11-07', '10:29'));
  domain.markNoShow(appointment, '2026-11-07', '10:30');
  assert.equal(appointment.status, 'no_show');
});

test('accepts checked_in and in_progress aliases for existing UI lifecycle labels', () => {
  assert.equal(domain.normalizeStatus('checked_in'), 'arrived');
  assert.equal(domain.normalizeStatus('in_progress'), 'in-consultation');
});

test('only valid appointment lifecycle transitions are accepted', () => {
  assert.equal(domain.canTransition('scheduled', 'arrived'), true);
  assert.equal(domain.canTransition('arrived', 'in-consultation'), true);
  assert.equal(domain.canTransition('in-consultation', 'completed'), true);
  assert.equal(domain.canTransition('scheduled', 'completed'), false);
});

test('completion requires an explicit actual service date', () => {
  const appointment = { status: 'in-consultation', date: '2026-11-05', actual_date_of_service: null };
  domain.completeAppointment(appointment, '2026-11-07');
  assert.equal(appointment.actual_date_of_service, '2026-11-07');
  assert.throws(() => domain.completeAppointment({ status: 'scheduled' }, '2026-11-07'));
});

test('cancellation requires a reason and preserves a non-billable terminal status', () => {
  const appointment = { status: 'scheduled', date: '2026-11-07', actual_date_of_service: null };
  assert.throws(() => domain.cancelAppointment(appointment, 'wrong'));
  domain.cancelAppointment(appointment, 'Patient requested cancellation.');
  assert.equal(appointment.status, 'cancelled');
  assert.equal(appointment.actual_date_of_service, null);
});

test('doctor state view contains only the assigned provider and related patients', () => {
  const user = { id: 'U1', role: 'DOCTOR', providerName: 'Dr One', branch: 'North', displayName: 'Doctor One' };
  const scoped = scopeStateForUser(snapshot(), user);
  assert.deepEqual(scoped.patients.map((patient) => patient.id), ['P1']);
  assert.deepEqual(scoped.appointments.map((appointment) => appointment.id), [1]);
  assert.deepEqual(scoped.providers.map((provider) => provider.name), ['Dr One']);
});

test('doctor writes preserve other doctors records and cannot create a cross-doctor booking', () => {
  const current = snapshot();
  const user = { id: 'U1', role: 'DOCTOR', providerName: 'Dr One', branch: 'North', displayName: 'Doctor One' };
  const scoped = scopeStateForUser(current, user);
  scoped.appointments[0].status = 'completed';
  scoped.appointments[0].actual_date_of_service = '2026-11-07';
  const merged = mergeStateForUser(current, scoped, user);
  assert.equal(merged.appointments.find((appointment) => appointment.id === 2).status, 'scheduled');
  const cross = snapshot();
  cross.appointments.push({ id: 3, patient: 'P2', doctor: 'Dr Two', branch: 'South', date: '2026-11-08', time: '11:00', duration: 30, status: 'scheduled', service: 'Visit', created_at: '2026-11-07T10:00:00' });
  const result = validateRoleChanges(current, cross, user);
  assert.equal(result.success, false);
});



test('authorized doctor can add clinical records for an assigned patient', () => {
  const current = snapshot();
  const user = { id: 'U1', role: 'DOCTOR', providerName: 'Dr One', branch: 'North', displayName: 'Doctor One' };
  const scoped = scopeStateForUser(current, user);
  scoped.prescriptions.push({ id: 'RX-OK', patientId: 'P1', name: 'Authorized prescription' });
  scoped.patientTimeline.push({ id: 'TL-OK', patientId: 'P1', title: 'Authorized event' });
  const merged = mergeStateForUser(current, scoped, user);
  assert.equal(merged.prescriptions.some((record) => record.id === 'RX-OK'), true);
  assert.equal(merged.patientTimeline.some((record) => record.id === 'TL-OK'), true);
  assert.equal(validateRoleChanges(current, merged, user).success, true);
});

test('receptionist can create a patient and appointment for a doctor in the assigned branch', () => {
  const current = snapshot();
  const user = { id: 'R1', role: 'RECEPTIONIST', branch: 'North', displayName: 'North Reception' };
  const scoped = scopeStateForUser(current, user);
  scoped.patients.push({ id: 'P3', name: 'New Patient', doctor: 'Dr One', branch: 'North' });
  scoped.appointments.push({ id: 3, patient: 'P3', doctor: 'Dr One', branch: 'North', date: '2026-11-08', time: '11:00', duration: 30, status: 'scheduled', service: 'Consultation' });
  const merged = mergeStateForUser(current, scoped, user);
  assert.equal(merged.patients.some((patient) => patient.id === 'P3'), true);
  assert.equal(merged.appointments.some((appointment) => appointment.id === 3), true);
  assert.equal(validateRoleChanges(current, merged, user, { clinicToday: '2026-11-07' }).success, true);
});

test('billing can update an invoice linked to a completed appointment in its own branch', () => {
  const current = snapshot();
  current.appointments[0].status = 'completed';
  current.appointments[0].actual_date_of_service = '2026-11-07';
  current.appointments[0].dos_verified = true;
  current.invoices = [{ id: 'INV-N', patientId: 'P1', appointmentId: 1, actual_date_of_service: '2026-11-07', dos_verified: true, amount: 100 }];
  const user = { id: 'B1', role: 'BILLING', branch: 'North', displayName: 'North Billing' };
  const scoped = scopeStateForUser(current, user);
  scoped.invoices[0].amount = 125;
  const merged = mergeStateForUser(current, scoped, user);
  assert.equal(merged.invoices[0].amount, 125);
  assert.equal(validateRoleChanges(current, merged, user).success, true);
});

test('doctor cannot append prescriptions, timeline events or encounters for another doctor patient', () => {
  const current = snapshot();
  current.prescriptions = [{ id: 'RX-1', patientId: 'P1', name: 'Existing prescription' }];
  current.patientTimeline = [{ id: 'TL-1', patientId: 'P1', title: 'Existing event' }];
  current.encounters = {
    'appointment:1': { patientId: 'P1', appointmentId: 1, provider: 'Dr One' },
    'appointment:2': { patientId: 'P2', appointmentId: 2, provider: 'Dr Two' }
  };
  const user = { id: 'U1', role: 'DOCTOR', providerName: 'Dr One', branch: 'North', displayName: 'Doctor One' };
  const scoped = scopeStateForUser(current, user);
  scoped.prescriptions.push({ id: 'RX-FOREIGN', patientId: 'P2', name: 'Unauthorized prescription' });
  assert.throws(() => mergeStateForUser(current, scoped, user), (error) => error.code === 'ROLE_VALIDATION');

  const timelineAttempt = scopeStateForUser(current, user);
  timelineAttempt.patientTimeline.push({ id: 'TL-FOREIGN', patientId: 'P2', title: 'Unauthorized timeline event' });
  assert.throws(() => mergeStateForUser(current, timelineAttempt, user), (error) => error.code === 'ROLE_VALIDATION');

  const encounterAttempt = scopeStateForUser(current, user);
  encounterAttempt.encounters['appointment:2'] = { patientId: 'P2', appointmentId: 2, provider: 'Dr Two' };
  assert.throws(() => mergeStateForUser(current, encounterAttempt, user), (error) => error.code === 'ROLE_VALIDATION');
});

test('doctor cannot change the patient, doctor or branch ownership of an existing appointment', () => {
  const current = snapshot();
  const user = { id: 'U1', role: 'DOCTOR', providerName: 'Dr One', branch: 'North', displayName: 'Doctor One' };
  const scoped = scopeStateForUser(current, user);
  scoped.appointments[0].doctor = 'Dr Two';
  scoped.appointments[0].branch = 'South';
  assert.throws(() => mergeStateForUser(current, scoped, user), (error) => error.code === 'ROLE_VALIDATION');
});

test('billing state is scoped by the linked appointment branch, not patient ID alone', () => {
  const current = snapshot();
  current.invoices = [
    { id: 'INV-N', patientId: 'P1', appointmentId: 1, amount: 100 },
    { id: 'INV-S', patientId: 'P2', appointmentId: 2, amount: 200 }
  ];
  const user = { id: 'B1', role: 'BILLING', branch: 'North', displayName: 'North Billing' };
  const scoped = scopeStateForUser(current, user);
  assert.deepEqual(scoped.invoices.map((invoice) => invoice.id), ['INV-N']);
  scoped.invoices.push({ id: 'INV-FOREIGN', patientId: 'P2', appointmentId: 2, amount: 250 });
  assert.throws(() => mergeStateForUser(current, scoped, user), (error) => error.code === 'ROLE_VALIDATION');
});

test('billing cannot reassign an invoice to an appointment in another branch', () => {
  const current = snapshot();
  current.invoices = [{ id: 'INV-N', patientId: 'P1', appointmentId: 1, amount: 100 }];
  const user = { id: 'B1', role: 'BILLING', branch: 'North', displayName: 'North Billing' };
  const scoped = scopeStateForUser(current, user);
  scoped.invoices[0].patientId = 'P2';
  scoped.invoices[0].appointmentId = 2;
  assert.throws(() => mergeStateForUser(current, scoped, user), (error) => error.code === 'ROLE_VALIDATION');
});

test('receptionist cannot create an appointment with a doctor from another branch', () => {
  const current = snapshot();
  const user = { id: 'R1', role: 'RECEPTIONIST', branch: 'North', displayName: 'North Reception' };
  const scoped = scopeStateForUser(current, user);
  scoped.appointments.push({ id: 3, patient: 'P1', doctor: 'Dr Two', branch: 'North', date: '2026-11-08', time: '11:00', duration: 30, status: 'scheduled' });
  assert.throws(() => mergeStateForUser(current, scoped, user), (error) => error.code === 'ROLE_VALIDATION');
});

test('attendance correction uses the actual clinic date and rejects future appointments', () => {
  const pastScheduled = { status: 'scheduled', date: '2026-11-06', actual_date_of_service: null };
  domain.correctNoShow(pastScheduled, 'arrived', 'Patient attended; reception recorded the wrong status.', '2026-11-07');
  assert.equal(pastScheduled.status, 'arrived');

  const futureScheduled = { status: 'scheduled', date: '2026-11-08', actual_date_of_service: null };
  assert.throws(() => domain.correctNoShow(futureScheduled, 'arrived', 'Patient attended; reception recorded the wrong status.', '2026-11-07'), /Only a no-show/);
});

test('backend lifecycle validation enforces the same-day No-Show cutoff', () => {
  const previous = snapshot();
  previous.appointments[0].status = 'scheduled';
  previous.appointments[0].date = '2026-11-07';
  previous.appointments[0].time = '10:00';
  previous.appointments[0].duration = 30;
  const next = structuredClone(previous);
  next.appointments[0].status = 'no_show';
  assert.equal(validateSnapshotTransitions(previous, next, { clinicToday: '2026-11-07', clinicNow: { time: '10:29' } }).success, false);
  assert.equal(validateSnapshotTransitions(previous, next, { clinicToday: '2026-11-07', clinicNow: { time: '10:30' } }).success, true);
});

test('DOS correction requires a reason and history entry', () => {
  const previous = snapshot();
  previous.appointments[0].status = 'completed';
  previous.appointments[0].actual_date_of_service = '2026-11-07';
  previous.appointments[0].dos_verified = true;
  previous.appointments[0].dos_recorded_by = 'U1';
  const next = structuredClone(previous);
  next.appointments[0].actual_date_of_service = '2026-11-06';
  next.appointments[0].dosHistory = [{ previous: '2026-11-07', next: '2026-11-06', reason: 'Corrected after chart review.' }];
  assert.equal(validateSnapshotTransitions(previous, next, { clinicToday: '2026-11-07', reason: 'Corrected after chart review.' }).success, true);
  assert.equal(validateSnapshotTransitions(previous, next, { clinicToday: '2026-11-07', reason: '' }).success, false);
});

test('Receptionist cannot complete a clinical consultation and Billing cannot alter appointments', () => {
  const previous = snapshot();
  const completed = structuredClone(previous);
  completed.appointments[0].status = 'completed';
  completed.appointments[0].actual_date_of_service = '2026-11-07';
  const receptionist = { id: 'R1', role: 'RECEPTIONIST', branch: 'North', providerName: null };
  assert.equal(validateRoleChanges(previous, completed, receptionist).success, false);
  const changedBooking = structuredClone(previous);
  changedBooking.appointments[0].status = 'arrived';
  const billing = { id: 'B1', role: 'BILLING', branch: 'North', providerName: null };
  assert.equal(validateRoleChanges(previous, changedBooking, billing).success, false);
});

test('server preserves a missed-appointment event when an auto No-Show is rescheduled', () => {
  const previous = snapshot();
  previous.appointments[0].status = 'scheduled';
  previous.appointments[0].date = '2026-11-06';
  const next = structuredClone(previous);
  next.appointments[0].status = 'rescheduled';
  next.appointments[0].rescheduled_to_id = 3;
  next.appointments.push({ id: 3, patient: 'P1', doctor: 'Dr One', branch: 'North', date: '2026-11-08', time: '09:00', duration: 30, status: 'scheduled', service: 'Consultation', rescheduled_from_id: 1 });
  applyServerAppointmentMetadata(previous, next, { id: 'U1' }, new Date('2026-11-07T12:00:00Z'), '2026-11-07');
  assert.equal(typeof next.appointments[0].no_show_at, 'string');
  assert.equal(next.appointments[0].status, 'rescheduled');
});

test('server propagates verified DOS corrections to linked invoices and encounters', () => {
  const previous = snapshot();
  previous.appointments[0].status = 'completed';
  previous.appointments[0].actual_date_of_service = '2026-11-06';
  previous.appointments[0].dos_verified = false;
  previous.appointments[0].dos_recorded_by = 'LEGACY-USER';
  previous.invoices = [{ id: 'INV-1', patientId: 'P1', appointmentId: 1, actual_date_of_service: '2026-11-06', dos_verified: false, amount: 100 }];
  previous.encounters = { 'appointment:1': { patientId: 'P1', appointmentId: 1, actual_date_of_service: '2026-11-06', dateOfService: '2026-11-06', dos_verified: false } };
  const next = structuredClone(previous);
  next.appointments[0].actual_date_of_service = '2026-11-07';
  next.appointments[0].dosHistory = [{ previous: '2026-11-06', next: '2026-11-07', reason: 'Verified against signed encounter note' }];
  applyServerAppointmentMetadata(previous, next, { id: 'U1' }, new Date('2026-11-07T12:00:00Z'), '2026-11-07');
  assert.equal(next.appointments[0].dos_verified, true);
  assert.equal(next.invoices[0].actual_date_of_service, '2026-11-07');
  assert.equal(next.invoices[0].dos_verified, true);
  assert.equal(next.encounters['appointment:1'].actual_date_of_service, '2026-11-07');
  assert.equal(next.encounters['appointment:1'].dos_verified, true);
});

test('server stamps completion and correction metadata', () => {
  const previous = snapshot();
  const next = structuredClone(previous);
  next.appointments[0].status = 'completed';
  next.appointments[0].actual_date_of_service = '2026-11-07';
  applyServerAppointmentMetadata(previous, next, { id: 'U1' }, new Date('2026-11-07T12:00:00Z'));
  assert.equal(next.appointments[0].dos_recorded_by, 'U1');
  assert.equal(next.appointments[0].completed_at, '2026-11-07T12:00:00.000Z');
});

test('read-only roles cannot write clinic snapshots', () => {
  assert.equal(canWriteClinicState('AUDITOR'), false);
  assert.equal(canWriteClinicState('STAFF'), false);
  assert.equal(canWriteClinicState('BILLING'), true);
});
