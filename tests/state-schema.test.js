const { validateState } = require('../src/lib/state-schema');
const { validState } = require('./fixtures');

describe('clinic state validation', () => {
  test('accepts the current MedBook snapshot structure', () => {
    expect(validateState(validState()).success).toBe(true);
  });
  test('strips legacy client-supplied billing from persisted data', () => {
    const input = { ...validState(), billing: { plan: 'paid', trialEndsAt: '2099-01-01' } };
    const result = validateState(input);
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty('billing');
  });
  test('rejects missing required arrays and unexpected top-level keys', () => {
    const missing = validState();
    delete missing.patients;
    expect(validateState(missing).success).toBe(false);
    expect(validateState({ ...validState(), isOwner: true }).success).toBe(false);
  });

  test('accepts and validates v2.6 clinic settings and user state', () => {
    const input = {
      ...validState(),
      website: { name: 'Example Clinic', tagline: 'Care', color: '#4f806c', services: true, mobile: false, published: false },
      seo: { title: 'Example', description: 'Example description', slug: 'example-clinic' },
      modules: { ai: false, attendance: true },
      doctorLeave: [{ doctor: 'Dr Example', date: '2026-11-07', reason: 'Leave' }],
      notificationItems: [{ id: 'notice-1', unread: true }],
      integrationConnections: { ga4: false },
      nextPrescriptionId: 3,
      note: 'Sample draft',
      theme: 'dark',
      activeSpecialty: 'derm',
      activeDoctor: 'Dr Example',
      branch: 'Main Clinic',
      selectedPracticeId: 'PR-001',
      selectedEncounterAppointmentId: 'APT-101',
      doctorDashboardDoctor: 'Dr Example',
      doctorDashboardRange: '30d'
    };
    expect(validateState(input).success).toBe(true);
    expect(validateState({ ...input, modules: { ai: 'yes' } }).success).toBe(false);
  });

  test('rejects invalid custom accent values', () => {
    expect(validateState({ ...validState(), customAccent: 'red' }).success).toBe(false);
  });

  test('rejects same-day No-Show before the appointment end time in clinic time', () => {
    const input = validState();
    input.patients = [{ id: 'PT-1', name: 'Test Patient', doctor: 'Dr Test', branch: 'Main Clinic' }];
    input.staff = [{ id: 1, name: 'Dr Test', role: 'Doctor', branch: 'Main Clinic' }];
    input.providers = [{ id: 1, name: 'Dr Test', branch: 'Main Clinic' }];
    input.practices = [{ id: 1, branch: 'Main Clinic' }];
    input.appointments = [{ id: 10, patient: 'PT-1', doctor: 'Dr Test', branch: 'Main Clinic', time: '10:00', duration: 30, status: 'no_show', date: '2026-11-07' }];
    expect(validateState(input, { clinicToday: '2026-11-07', clinicNow: '10:29' }).success).toBe(false);
  });

  test('accepts no_show and rescheduled appointments without an actual DOS', () => {
    const input = validState();
    input.patients = [{ id: 'PT-1', name: 'Test Patient', doctor: 'Dr Test', branch: 'Main Clinic' }];
    input.staff = [{ id: 1, name: 'Dr Test', role: 'Doctor', branch: 'Main Clinic' }];
    input.providers = [{ id: 1, name: 'Dr Test', branch: 'Main Clinic' }];
    input.practices = [{ id: 1, branch: 'Main Clinic' }];
    input.appointments = [
      { id: 10, patient: 'PT-1', doctor: 'Dr Test', branch: 'Main Clinic', time: '09:00', status: 'no_show', date: '2026-11-06', actual_date_of_service: null },
      { id: 11, patient: 'PT-1', doctor: 'Dr Test', branch: 'Main Clinic', time: '10:00', status: 'rescheduled', date: '2026-11-06', actual_date_of_service: null }
    ];
    expect(validateState(input, { clinicToday: '2026-11-07' }).success).toBe(true);
  });

  test('rejects duplicate appointment IDs and invalid patient references', () => {
    const input = validState();
    input.patients = [{ id: 'PT-1', name: 'Test Patient', doctor: 'Dr Test', branch: 'Main Clinic' }];
    input.staff = [{ id: 1, name: 'Dr Test', role: 'Doctor', branch: 'Main Clinic' }];
    input.providers = [{ id: 1, name: 'Dr Test', branch: 'Main Clinic' }];
    input.practices = [{ id: 1, branch: 'Main Clinic' }];
    const appointment = { id: 10, patient: 'PT-1', doctor: 'Dr Test', branch: 'Main Clinic', time: '09:00', status: 'scheduled', date: '2026-11-07' };
    input.appointments = [appointment, { ...appointment }];
    expect(validateState(input).success).toBe(false);
    input.appointments = [{ ...appointment, id: 11, patient: 'PT-MISSING' }];
    expect(validateState(input).success).toBe(false);
  });

  test('rejects an Actual DOS in the future in the clinic timezone', () => {
    const input = validState();
    input.patients = [{ id: 'PT-1', name: 'Test Patient', doctor: 'Dr Test', branch: 'Main Clinic' }];
    input.staff = [{ id: 1, name: 'Dr Test', role: 'Doctor', branch: 'Main Clinic' }];
    input.providers = [{ id: 1, name: 'Dr Test', branch: 'Main Clinic' }];
    input.practices = [{ id: 1, branch: 'Main Clinic' }];
    input.appointments = [{ id: 10, patient: 'PT-1', doctor: 'Dr Test', branch: 'Main Clinic', time: '09:00', status: 'completed', date: '2026-11-06', actual_date_of_service: '2026-11-08' }];
    expect(validateState(input, { clinicToday: '2026-11-07' }).success).toBe(false);
  });

  test('rejects an actual DOS on a scheduled or no-show appointment', () => {
    const input = validState();
    input.appointments = [{ id: 10, status: 'scheduled', date: '2026-11-06', actual_date_of_service: '2026-11-07' }];
    expect(validateState(input).success).toBe(false);
  });

  test('invoice DOS must match its linked completed appointment', () => {
    const input = validState();
    input.patients = [{ id: 'PT-1', name: 'Test Patient', doctor: 'Dr Test', branch: 'Main Clinic' }];
    input.staff = [{ id: 1, name: 'Dr Test', role: 'Doctor', branch: 'Main Clinic' }];
    input.providers = [{ id: 1, name: 'Dr Test', branch: 'Main Clinic' }];
    input.practices = [{ id: 1, branch: 'Main Clinic' }];
    input.appointments = [{ id: 10, patient: 'PT-1', doctor: 'Dr Test', branch: 'Main Clinic', time: '09:00', status: 'completed', date: '2026-11-06', actual_date_of_service: '2026-11-07', dos_verified: true, dos_recorded_by: 'U-1' }];
    input.invoices = [{ id: 'INV-1', patientId: 'PT-1', appointmentId: 10, actual_date_of_service: '2026-11-07', dos_verified: true }];
    expect(validateState(input).success).toBe(true);
    input.invoices[0].actual_date_of_service = '2026-11-06';
    expect(validateState(input).success).toBe(false);
  });

  test('appointment-linked encounter DOS must match the completed appointment', () => {
    const input = validState();
    input.patients = [{ id: 'PT-1', name: 'Test Patient', doctor: 'Dr Test', branch: 'Main Clinic' }];
    input.staff = [{ id: 1, name: 'Dr Test', role: 'Doctor', branch: 'Main Clinic' }];
    input.providers = [{ id: 1, name: 'Dr Test', branch: 'Main Clinic' }];
    input.practices = [{ id: 1, branch: 'Main Clinic' }];
    input.appointments = [{ id: 10, patient: 'PT-1', doctor: 'Dr Test', branch: 'Main Clinic', time: '09:00', status: 'completed', date: '2026-11-06', actual_date_of_service: '2026-11-07', dos_verified: true, dos_recorded_by: 'U-1' }];
    input.encounters = { 'appointment:10': { patientId: 'PT-1', appointmentId: 10, provider: 'Dr Test', actual_date_of_service: '2026-11-07', dos_verified: true } };
    expect(validateState(input).success).toBe(true);
    input.encounters['appointment:10'].actual_date_of_service = '2026-11-06';
    expect(validateState(input).success).toBe(false);
  });

  test('flags legacy completed DOS and linked invoice as unverified without deleting the historical date', () => {
    const input = validState();
    input.patients = [{ id: 'PT-1', name: 'Test Patient', doctor: 'Dr Test', branch: 'Main Clinic' }];
    input.staff = [{ id: 1, name: 'Dr Test', role: 'Doctor', branch: 'Main Clinic' }];
    input.providers = [{ id: 1, name: 'Dr Test', branch: 'Main Clinic' }];
    input.practices = [{ id: 1, branch: 'Main Clinic' }];
    input.appointments = [{ id: 10, patient: 'PT-1', doctor: 'Dr Test', branch: 'Main Clinic', time: '09:00', status: 'completed', date: '2026-11-06', actual_date_of_service: '2026-11-06', dos_recorded_by: 'U-LEGACY' }];
    input.invoices = [{ id: 'INV-1', patientId: 'PT-1', appointmentId: 10, actual_date_of_service: '2026-11-06', amount: 80, tax: 0, items: [{ label: 'Consult', qty: 1, unit: 80 }] }];
    const result = validateState(input, { clinicToday: '2026-11-07' });
    expect(result.success).toBe(true);
    expect(result.data.appointments[0].dos_verified).toBe(false);
    expect(result.data.invoices[0].dos_verified).toBe(false);
    expect(result.data.appointments[0].actual_date_of_service).toBe('2026-11-06');
    expect(result.data.invoices[0].actual_date_of_service).toBe('2026-11-06');
  });

  test('unlinked invoice or encounter records cannot carry an actual DOS', () => {
    const invoiceState = validState();
    invoiceState.invoices = [{ id: 'INV-2', actual_date_of_service: '2026-11-07' }];
    expect(validateState(invoiceState).success).toBe(false);

    const encounterState = validState();
    encounterState.encounters = { 'PT-1': { patientId: 'PT-1', actual_date_of_service: '2026-11-07' } };
    expect(validateState(encounterState).success).toBe(false);
  });
});
