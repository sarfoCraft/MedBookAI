const domain = require('../appointment-domain');

describe('appointment lifecycle and actual date of service', () => {
  test('a past scheduled appointment is presented as no_show without mutating stored status', () => {
    const appointment = { status: 'scheduled', date: '2026-11-06' };
    expect(domain.effectiveStatus(appointment, '2026-11-07')).toBe('no_show');
    expect(appointment.status).toBe('scheduled');
  });

  test('a scheduled appointment today is not automatically a no-show', () => {
    expect(domain.effectiveStatus({ status: 'scheduled', date: '2026-11-07' }, '2026-11-07')).toBe('scheduled');
  });

  test('legacy no-show values normalize to the new no_show lifecycle value', () => {
    expect(domain.effectiveStatus({ status: 'no-show', date: '2026-11-07' }, '2026-11-07')).toBe('no_show');
  });

  test('actual DOS is set only when an in-consultation appointment is completed', () => {
    const appointment = { status: 'in-consultation', date: '2026-11-05', actual_date_of_service: null };
    domain.completeAppointment(appointment, '2026-11-07');
    expect(appointment.status).toBe('completed');
    expect(appointment.actual_date_of_service).toBe('2026-11-07');
    expect(domain.hasActualDateOfService(appointment)).toBe(true);
  });

  test('an appointment that is not in consultation cannot receive an actual DOS', () => {
    const appointment = { status: 'scheduled', date: '2026-11-07', actual_date_of_service: null };
    expect(() => domain.completeAppointment(appointment, '2026-11-07')).toThrow(/in-consultation/);
    expect(appointment.actual_date_of_service).toBeNull();
  });

  test('no-show and rescheduled appointments never have an actual DOS', () => {
    const missed = { status: 'scheduled', date: '2026-11-06', actual_date_of_service: null };
    domain.markNoShow(missed, '2026-11-07');
    expect(missed.status).toBe('no_show');
    expect(missed.actual_date_of_service).toBeNull();

    domain.markRescheduled(missed, '2026-11-07');
    expect(missed.status).toBe('rescheduled');
    expect(missed.actual_date_of_service).toBeNull();
  });

  test('an unverified legacy date is not treated as billable Actual DOS', () => {
    expect(domain.hasActualDateOfService({ status: 'completed', actual_date_of_service: '2026-11-06', dos_verified: false })).toBe(false);
    expect(domain.hasActualDateOfService({ status: 'completed', actual_date_of_service: '2026-11-06', dos_verified: true })).toBe(true);
  });

  test('a false No-Show can be corrected to Arrived with a reason', () => {
    const appointment = { status: 'no_show', date: '2026-11-06', actual_date_of_service: null };
    domain.correctNoShow(appointment, 'arrived', 'Patient attended; reception recorded the wrong status.');
    expect(appointment.status).toBe('arrived');
    expect(appointment.actual_date_of_service).toBeNull();
  });

  test('No-Show correction requires a reason and rejects Scheduled for a past appointment', () => {
    const appointment = { status: 'no_show', date: '2026-11-06' };
    expect(() => domain.correctNoShow(appointment, 'arrived', 'wrong')).toThrow(/reason/);
    expect(() => domain.correctNoShow(appointment, 'scheduled', 'Still pending after correction.')).toThrow(/Arrived/);
  });

  test('cancellation requires a reason and cannot cancel a completed visit', () => {
    const appointment = { status: 'scheduled' };
    expect(() => domain.cancelAppointment(appointment, 'wrong')).toThrow(/reason/);
    domain.cancelAppointment(appointment, 'Patient requested cancellation.');
    expect(appointment.status).toBe('cancelled');
    expect(() => domain.cancelAppointment({ status: 'completed' }, 'Patient requested cancellation.')).toThrow(/scheduled or arrived/);
  });

  test('future bookings cannot be manually marked as no-show', () => {
    const appointment = { status: 'scheduled', date: '2026-11-08' };
    expect(() => domain.markNoShow(appointment, '2026-11-07')).toThrow(/future appointment/);
  });
});
