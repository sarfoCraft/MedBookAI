/* MedBook AI v2.7 appointment lifecycle rules. Shared by the browser app and tests. */
(function attachAppointmentDomain(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MedBookAppointmentDomain = api;
})(typeof window !== 'undefined' ? window : globalThis, function createAppointmentDomain() {
  'use strict';

  const STATUSES = Object.freeze([
    'scheduled', 'arrived', 'in-consultation', 'completed', 'checked-out',
    'no_show', 'rescheduled', 'cancelled'
  ]);
  const TRANSITIONS = Object.freeze({
    scheduled: ['arrived', 'no_show', 'rescheduled', 'cancelled'],
    arrived: ['in-consultation', 'cancelled'],
    'in-consultation': ['completed'],
    completed: ['checked-out'],
    'checked-out': [],
    no_show: ['scheduled', 'arrived', 'rescheduled'],
    rescheduled: [],
    cancelled: []
  });

  function isISOTime(value) {
    return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  function isISODate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }

  function normalizeStatus(value) {
    const status = String(value || 'scheduled').trim().toLowerCase();
    if (status === 'no-show') return 'no_show';
    if (status === 'checked_out') return 'checked-out';
    if (status === 'checked_in' || status === 'checked-in') return 'arrived';
    if (status === 'in_progress' || status === 'in-progress') return 'in-consultation';
    return status;
  }

  function effectiveStatus(appointment, clinicToday) {
    const status = normalizeStatus(appointment?.status);
    if (status === 'scheduled' && isISODate(appointment?.date) && isISODate(clinicToday) && appointment.date < clinicToday) {
      return 'no_show';
    }
    return status;
  }

  function isCompleted(appointment) {
    return ['completed', 'checked-out'].includes(normalizeStatus(appointment?.status));
  }

  function hasActualDateOfService(appointment) {
    return !!appointment && appointment.dos_verified !== false && isCompleted(appointment) && isISODate(appointment.actual_date_of_service);
  }

  function canTransition(from, to) {
    const source = normalizeStatus(from);
    const target = normalizeStatus(to);
    return source === target || Boolean(TRANSITIONS[source]?.includes(target));
  }

  function completeAppointment(appointment, actualDate) {
    if (!appointment || normalizeStatus(appointment.status) !== 'in-consultation') {
      throw new Error('Only an in-consultation appointment can be completed.');
    }
    if (!isISODate(actualDate)) throw new Error('A valid actual date of service is required.');
    appointment.status = 'completed';
    appointment.actual_date_of_service = actualDate;
    appointment.dos_verified = true;
    return appointment;
  }

  function markNoShow(appointment, clinicToday, clinicTime = null) {
    if (!appointment || normalizeStatus(appointment.status) !== 'scheduled') {
      throw new Error('Only a scheduled appointment can be marked as no-show.');
    }
    if (!isISODate(appointment.date) || !isISODate(clinicToday) || appointment.date > clinicToday) {
      throw new Error('A future appointment cannot be marked as no-show.');
    }
    if (appointment.date === clinicToday && clinicTime && isISOTime(clinicTime)) {
      const [hours, minutes] = String(appointment.time || '00:00').split(':').map(Number);
      const [nowHours, nowMinutes] = clinicTime.split(':').map(Number);
      if ((hours * 60 + minutes + (Number(appointment.duration) || 30)) > (nowHours * 60 + nowMinutes)) {
        throw new Error('This appointment has not reached its scheduled end time yet.');
      }
    }
    appointment.status = 'no_show';
    appointment.actual_date_of_service = null;
    return appointment;
  }

  function correctNoShow(appointment, nextStatus, reason, clinicToday = null) {
    const currentStatus = appointment && isISODate(clinicToday)
      ? effectiveStatus(appointment, clinicToday)
      : normalizeStatus(appointment?.status);
    if (!appointment || currentStatus !== 'no_show') {
      throw new Error('Only a no-show appointment can have its attendance corrected.');
    }
    const next = normalizeStatus(nextStatus);
    if (next !== 'arrived') {
      throw new Error('Correct attendance to Arrived, then complete the normal visit workflow.');
    }
    if (typeof reason !== 'string' || reason.trim().length < 8 || reason.trim().length > 500) {
      throw new Error('Enter an attendance correction reason of at least 8 characters.');
    }
    appointment.status = next;
    appointment.actual_date_of_service = null;
    return appointment;
  }

  function cancelAppointment(appointment, reason) {
    if (!appointment || !['scheduled', 'arrived'].includes(normalizeStatus(appointment.status))) {
      throw new Error('Only a scheduled or arrived appointment can be cancelled.');
    }
    if (typeof reason !== 'string' || reason.trim().length < 8 || reason.trim().length > 500) {
      throw new Error('Enter a cancellation reason of at least 8 characters.');
    }
    appointment.status = 'cancelled';
    appointment.actual_date_of_service = null;
    appointment.cancelled_reason = reason.trim();
    return appointment;
  }

  function markRescheduled(appointment, clinicToday) {
    const status = effectiveStatus(appointment, clinicToday);
    if (!appointment || !['scheduled', 'no_show'].includes(status)) {
      throw new Error('Only a scheduled or no-show appointment can be rescheduled.');
    }
    appointment.status = 'rescheduled';
    appointment.actual_date_of_service = null;
    return appointment;
  }

  return Object.freeze({
    STATUSES,
    TRANSITIONS,
    isISODate,
    isISOTime,
    normalizeStatus,
    effectiveStatus,
    isCompleted,
    hasActualDateOfService,
    canTransition,
    completeAppointment,
    markNoShow,
    correctNoShow,
    cancelAppointment,
    markRescheduled
  });
});
