const AppointmentDomain = require('../../appointment-domain');

function id(value) { return String(value ?? ''); }
function byId(items) { return new Map((items || []).map((item) => [id(item.id), item])); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value === undefined ? null : value;
}
function same(a, b) { return JSON.stringify(stable(a ?? null)) === JSON.stringify(stable(b ?? null)); }
function safeAppointmentValues(appointment) {
  if (!appointment) return null;
  return {
    patientId: appointment.patient,
    doctor: appointment.doctor,
    branch: appointment.branch,
    scheduledDate: appointment.date,
    scheduledTime: appointment.time,
    status: AppointmentDomain.normalizeStatus(appointment.status),
    actualDateOfService: appointment.actual_date_of_service || null,
    dosVerified: appointment.dos_verified === true,
    rescheduledFromId: appointment.rescheduled_from_id ?? null,
    rescheduledToId: appointment.rescheduled_to_id ?? null
  };
}
function addIssue(issues, path, message) { issues.push({ path, message }); }

function applyServerAppointmentMetadata(previous, next, user, now = new Date(), clinicToday = now.toISOString().slice(0, 10)) {
  const oldAppointments = byId(previous?.appointments);
  const verifiedDosUpdates = new Map();
  for (const appointment of next.appointments || []) {
    const before = oldAppointments.get(id(appointment.id));
    const oldStatus = before ? AppointmentDomain.normalizeStatus(before.status) : null;
    const nextStatus = AppointmentDomain.normalizeStatus(appointment.status);
    if (!before) {
      appointment.created_at = now.toISOString();
      appointment.created_on = clinicToday;
      appointment.dos_verified = false;
      continue;
    }

    // Server-managed lifecycle timestamps, actor IDs and DOS verification are never accepted from the browser.
    appointment.created_at = before.created_at;
    appointment.created_on = before.created_on;
    appointment.completed_at = before.completed_at;
    appointment.dos_recorded_by = before.dos_recorded_by || null;
    appointment.status_updated_at = before.status_updated_at;
    appointment.no_show_at = before.no_show_at;
    appointment.rescheduled_at = before.rescheduled_at;
    appointment.rescheduled_on = before.rescheduled_on;
    appointment.cancelled_at = before.cancelled_at;
    appointment.cancelled_on = before.cancelled_on;
    if (oldStatus === 'cancelled') appointment.cancelled_reason = before.cancelled_reason;

    const oldDos = before.actual_date_of_service || null;
    const nextDos = appointment.actual_date_of_service || null;
    const oldDosHistory = Array.isArray(before.dosHistory) ? before.dosHistory : [];
    const oldAttendanceHistory = Array.isArray(before.attendanceCorrectionHistory) ? before.attendanceCorrectionHistory : [];
    const incomingDosHistory = Array.isArray(appointment.dosHistory) ? appointment.dosHistory : [];
    const incomingAttendanceHistory = Array.isArray(appointment.attendanceCorrectionHistory) ? appointment.attendanceCorrectionHistory : [];
    const appendedDosHistory = incomingDosHistory.slice(oldDosHistory.length);
    const oldDosVerified = before.dos_verified === true;
    const matchingDosEntry = appendedDosHistory.find((entry) =>
      (entry.previous || null) === oldDos && entry.next === nextDos &&
      typeof entry.reason === 'string' && entry.reason.trim().length >= 8);
    const isInitialCompletion = oldStatus === 'in-consultation' && nextStatus === 'completed' && Boolean(nextDos);
    const isDosCorrectionOrVerification = Boolean(nextDos) && Boolean(matchingDosEntry) &&
      (oldDos !== nextDos || !oldDosVerified);
    const isVerified = isInitialCompletion || isDosCorrectionOrVerification ||
      (oldDosVerified && oldDos === nextDos && Boolean(nextDos));

    appointment.dos_verified = AppointmentDomain.isCompleted(appointment) && Boolean(nextDos) && isVerified;
    if (appointment.dos_verified && (oldDos !== nextDos || !oldDosVerified)) verifiedDosUpdates.set(id(appointment.id), nextDos);
    if (appointment.dos_verified && !appointment.dos_recorded_by) appointment.dos_recorded_by = user.id;

    appointment.dosHistory = [...oldDosHistory, ...appendedDosHistory];
    appointment.attendanceCorrectionHistory = [...oldAttendanceHistory, ...incomingAttendanceHistory.slice(oldAttendanceHistory.length)];
    if (matchingDosEntry && (oldDos !== nextDos || !oldDosVerified)) {
      matchingDosEntry.at = now.toISOString();
      matchingDosEntry.actor = user.id;
    }

    if (nextStatus === 'completed' && oldStatus !== 'completed' && oldStatus !== 'checked-out') {
      appointment.completed_at = now.toISOString();
    }
    if (oldStatus !== nextStatus) {
      appointment.status_updated_at = now.toISOString();
      if (nextStatus === 'rescheduled') { appointment.rescheduled_at = now.toISOString(); appointment.rescheduled_on = clinicToday; }
      if (nextStatus === 'cancelled') { appointment.cancelled_at = now.toISOString(); appointment.cancelled_on = clinicToday; }
      if (nextStatus === 'no_show' || (nextStatus === 'rescheduled' && (oldStatus === 'no_show' || (oldStatus === 'scheduled' && before.date < clinicToday)))) appointment.no_show_at = appointment.no_show_at || now.toISOString();
      if (oldStatus === 'no_show' || (oldStatus === 'scheduled' && before.date < clinicToday)) {
        const entry = [...appointment.attendanceCorrectionHistory].reverse().find((item) => item.to === nextStatus);
        if (entry) { entry.at = now.toISOString(); entry.actor = user.id; }
      }
    }
  }
  for (const invoice of next.invoices || []) {
    const verifiedDos = verifiedDosUpdates.get(id(invoice.appointmentId));
    if (verifiedDos) { invoice.actual_date_of_service = verifiedDos; invoice.dos_verified = true; }
  }
  for (const encounter of Object.values(next.encounters || {})) {
    if (!encounter || typeof encounter !== 'object') continue;
    const verifiedDos = verifiedDosUpdates.get(id(encounter.appointmentId));
    if (verifiedDos) { encounter.actual_date_of_service = verifiedDos; encounter.dateOfService = verifiedDos; encounter.dos_verified = true; }
  }
  return next;
}

function validateSnapshotTransitions(previous, next, options = {}) {
  if (!previous) return { success: true, issues: [] };
  const clinicToday = options.clinicToday;
  const clinicNow = options.clinicNow;
  const reason = typeof options.reason === 'string' ? options.reason.trim() : '';
  const issues = [];
  const oldAppointments = byId(previous.appointments);
  const newAppointments = byId(next.appointments);
  const oldPatients = byId(previous.patients);
  const newPatients = byId(next.patients);
  const oldInvoices = byId(previous.invoices);
  const newInvoices = byId(next.invoices);

  for (const [patientId] of oldPatients) {
    if (!newPatients.has(patientId)) addIssue(issues, ['patients', patientId], 'Existing patient records cannot be deleted from a clinic snapshot. Archive them instead.');
  }
  for (const [appointmentId] of oldAppointments) {
    if (!newAppointments.has(appointmentId)) addIssue(issues, ['appointments', appointmentId], 'Existing appointment history cannot be deleted.');
  }
  for (const [invoiceId] of oldInvoices) {
    if (!newInvoices.has(invoiceId)) addIssue(issues, ['invoices', invoiceId], 'Existing invoices cannot be deleted. Void or refund them instead.');
  }
  for (const key of Object.keys(previous.encounters || {})) if (!Object.prototype.hasOwnProperty.call(next.encounters || {}, key)) addIssue(issues, ['encounters', key], 'Clinical encounter history cannot be deleted.');
  for (const collection of ['followups', 'prescriptions', 'patientTimeline', 'staff']) {
    const beforeIds = new Set((previous[collection] || []).map((record) => id(record.id)));
    const afterIds = new Set((next[collection] || []).map((record) => id(record.id)));
    for (const recordId of beforeIds) if (!afterIds.has(recordId)) addIssue(issues, [collection, recordId], `${collection} history cannot be deleted.`);
  }
  for (const collection of ['documents', 'insurance', 'intakeConsents', 'signatures']) {
    for (const key of Object.keys(previous[collection] || {})) if (!Object.prototype.hasOwnProperty.call(next[collection] || {}, key)) addIssue(issues, [collection, key], `${collection} records cannot be deleted from the clinic snapshot.`);
  }

  for (const [appointmentId, nextAppointment] of newAppointments) {
    const oldAppointment = oldAppointments.get(appointmentId);
    if (!oldAppointment) {
      if (AppointmentDomain.normalizeStatus(nextAppointment.status) !== 'scheduled') {
        addIssue(issues, ['appointments', appointmentId, 'status'], 'New appointments must begin in scheduled status.');
      }
      continue;
    }
    const oldStatus = AppointmentDomain.normalizeStatus(oldAppointment.status);
    const nextStatus = AppointmentDomain.normalizeStatus(nextAppointment.status);
    const oldDos = oldAppointment.actual_date_of_service || null;
    const nextDos = nextAppointment.actual_date_of_service || null;
    const oldDosHistory = Array.isArray(oldAppointment.dosHistory) ? oldAppointment.dosHistory : [];
    const oldDosVerified = oldAppointment.dos_verified === true;
    const wasDosUnverified = Boolean(oldDos) && !oldDosVerified;
    const nextDosHistory = Array.isArray(nextAppointment.dosHistory) ? nextAppointment.dosHistory : [];
    const oldAttendanceHistory = Array.isArray(oldAppointment.attendanceCorrectionHistory) ? oldAppointment.attendanceCorrectionHistory : [];
    const nextAttendanceHistory = Array.isArray(nextAppointment.attendanceCorrectionHistory) ? nextAppointment.attendanceCorrectionHistory : [];
    if (nextDosHistory.length < oldDosHistory.length || oldDosHistory.some((entry, index) => !same(entry, nextDosHistory[index]))) {
      addIssue(issues, ['appointments', appointmentId, 'dosHistory'], 'Historical DOS correction entries are append-only and cannot be edited or removed.');
    }
    if (nextAttendanceHistory.length < oldAttendanceHistory.length || oldAttendanceHistory.some((entry, index) => !same(entry, nextAttendanceHistory[index]))) {
      addIssue(issues, ['appointments', appointmentId, 'attendanceCorrectionHistory'], 'Historical attendance correction entries are append-only and cannot be edited or removed.');
    }
    if (nextDosHistory.length > oldDosHistory.length + 1 || nextAttendanceHistory.length > oldAttendanceHistory.length + 1) {
      addIssue(issues, ['appointments', appointmentId], 'Only one new correction history entry may be appended per save.');
    }
    const sameDateVerification = oldDos === nextDos && wasDosUnverified && nextAppointment.dos_verified === true;
    if (nextDosHistory.length > oldDosHistory.length && oldDos === nextDos && !sameDateVerification) {
      addIssue(issues, ['appointments', appointmentId, 'dosHistory'], 'A DOS history entry may only be appended when Actual DOS changes or an unverified legacy DOS is explicitly verified.');
    }
    if (nextAttendanceHistory.length > oldAttendanceHistory.length && oldStatus === nextStatus) {
      addIssue(issues, ['appointments', appointmentId, 'attendanceCorrectionHistory'], 'An attendance correction entry requires an attendance status change.');
    }

    if (oldAppointment.rescheduled_from_id && oldAppointment.rescheduled_from_id !== nextAppointment.rescheduled_from_id) addIssue(issues, ['appointments', appointmentId, 'rescheduled_from_id'], 'Reschedule links are immutable once recorded.');
    if (oldAppointment.rescheduled_to_id && oldAppointment.rescheduled_to_id !== nextAppointment.rescheduled_to_id) addIssue(issues, ['appointments', appointmentId, 'rescheduled_to_id'], 'Reschedule links are immutable once recorded.');
    if (nextStatus === 'rescheduled' && oldStatus !== 'rescheduled') {
      const replacement = newAppointments.get(id(nextAppointment.rescheduled_to_id));
      if (!replacement || id(replacement.rescheduled_from_id) !== appointmentId) addIssue(issues, ['appointments', appointmentId, 'rescheduled_to_id'], 'Rescheduling must create a linked replacement appointment.');
    }
    if (oldAppointment.date !== nextAppointment.date || oldAppointment.time !== nextAppointment.time ||
        oldAppointment.patient !== nextAppointment.patient || oldAppointment.doctor !== nextAppointment.doctor || oldAppointment.branch !== nextAppointment.branch || oldAppointment.service !== nextAppointment.service || oldAppointment.duration !== nextAppointment.duration || oldAppointment.created_at !== nextAppointment.created_at) {
      addIssue(issues, ['appointments', appointmentId], 'Scheduled appointment details are immutable. Reschedule by retaining the original and creating a linked new appointment.');
    }
    if (oldStatus !== nextStatus && !AppointmentDomain.canTransition(oldStatus, nextStatus)) {
      addIssue(issues, ['appointments', appointmentId, 'status'], `Invalid appointment transition: ${oldStatus} → ${nextStatus}.`);
    }
    if (nextStatus === 'no_show' && clinicToday && nextAppointment.date > clinicToday) {
      addIssue(issues, ['appointments', appointmentId, 'status'], 'A future appointment cannot be marked as no-show.');
    }
    if (nextStatus === 'no_show' && clinicToday && clinicNow && nextAppointment.date === clinicToday) {
      const clinicTime = typeof clinicNow === 'string' ? clinicNow : clinicNow.time;
      const [hour, minute] = String(nextAppointment.time || '00:00').split(':').map(Number);
      const [nowHour, nowMinute] = String(clinicTime || '').split(':').map(Number);
      if ((hour * 60 + minute + (Number(nextAppointment.duration) || 30)) > (nowHour * 60 + nowMinute)) {
        addIssue(issues, ['appointments', appointmentId, 'status'], 'An appointment cannot be marked No-Show before its scheduled end time in the clinic timezone.');
      }
    }
    const wasEffectiveNoShow = oldStatus === 'no_show' ||
      (oldStatus === 'scheduled' && clinicToday && oldAppointment.date < clinicToday);
    if (wasEffectiveNoShow && oldStatus !== nextStatus && ['scheduled', 'arrived'].includes(nextStatus)) {
      const hasAttendanceHistory = nextAttendanceHistory.length === oldAttendanceHistory.length + 1 &&
        nextAttendanceHistory.at(-1)?.from === oldStatus && nextAttendanceHistory.at(-1)?.to === nextStatus &&
        typeof nextAttendanceHistory.at(-1)?.reason === 'string' && nextAttendanceHistory.at(-1).reason.trim().length >= 8 && nextAttendanceHistory.at(-1).reason.trim() === reason;
      if (reason.length < 8 || !hasAttendanceHistory) addIssue(issues, ['appointments', appointmentId, 'status'], 'Correcting a No-Show requires a reason and an appended attendance history entry.');
    }
    if (nextStatus === 'cancelled' && oldStatus !== 'cancelled' && (reason.length < 8 || typeof nextAppointment.cancelled_reason !== 'string' || nextAppointment.cancelled_reason.trim().length < 8 || nextAppointment.cancelled_reason.trim() !== reason)) {
      addIssue(issues, ['appointments', appointmentId, 'status'], 'Cancelling an appointment requires a persisted cancellation reason of at least 8 characters.');
    }
    if (wasEffectiveNoShow && nextStatus === 'scheduled' && clinicToday && oldAppointment.date <= clinicToday) {
      addIssue(issues, ['appointments', appointmentId, 'status'], 'A past or same-day No-Show cannot be returned to Scheduled; correct it to Arrived or create a rescheduled booking.');
    }
    if (oldStatus === 'in-consultation' && nextStatus === 'completed' && !nextDos) {
      addIssue(issues, ['appointments', appointmentId, 'actual_date_of_service'], 'Completing a consultation requires an explicitly confirmed Actual DOS.');
    }
    if (nextDos && clinicToday && nextDos > clinicToday) {
      addIssue(issues, ['appointments', appointmentId, 'actual_date_of_service'], 'Actual DOS cannot be in the future in the clinic timezone.');
    }
    if (oldDos !== nextDos) {
      if (!oldDos && nextDos && oldStatus === 'in-consultation' && nextStatus === 'completed') {
        if (nextAppointment.dos_verified !== true) addIssue(issues, ['appointments', appointmentId, 'dos_verified'], 'Initial Actual DOS must be explicitly verified when the visit is completed.');
      } else if ((oldDos && nextDos) || (!oldDos && nextDos && ['completed', 'checked-out'].includes(oldStatus) && ['completed', 'checked-out'].includes(nextStatus))) {
        const history = Array.isArray(nextAppointment.dosHistory) ? nextAppointment.dosHistory : [];
        const hasHistory = history.some((entry) => (entry.previous || null) === oldDos && entry.next === nextDos &&
          typeof entry.reason === 'string' && entry.reason.trim().length >= 8 && entry.reason.trim() === reason);
        if (reason.length < 8 || !hasHistory || nextAppointment.dos_verified !== true) {
          addIssue(issues, ['appointments', appointmentId, 'actual_date_of_service'], 'Correcting an existing or missing DOS requires a correction reason, verified flag and appended DOS history entry.');
        }
      } else {
        addIssue(issues, ['appointments', appointmentId, 'actual_date_of_service'], 'A finalized Actual DOS cannot be silently cleared. Correct it to another valid date with a reason.');
      }
    } else if (sameDateVerification) {
      const hasVerificationHistory = nextDosHistory.length === oldDosHistory.length + 1 &&
        nextDosHistory.at(-1)?.previous === oldDos && nextDosHistory.at(-1)?.next === nextDos &&
        typeof nextDosHistory.at(-1)?.reason === 'string' && nextDosHistory.at(-1).reason.trim().length >= 8 &&
        nextDosHistory.at(-1).reason.trim() === reason;
      if (reason.length < 8 || !hasVerificationHistory) addIssue(issues, ['appointments', appointmentId, 'dos_verified'], 'Verifying a legacy DOS requires a reason and an appended verification history entry.');
    }
    if (oldDosVerified && nextDos && nextAppointment.dos_verified !== true) addIssue(issues, ['appointments', appointmentId, 'dos_verified'], 'A previously verified Actual DOS cannot be downgraded to unverified.');
    if (['no_show', 'rescheduled', 'cancelled'].includes(nextStatus) && nextDos) {
      addIssue(issues, ['appointments', appointmentId, 'actual_date_of_service'], 'No-show, rescheduled and cancelled appointments cannot have an Actual DOS.');
    }
    if (nextStatus === 'checked-out' && oldDos && nextDos !== oldDos) {
      addIssue(issues, ['appointments', appointmentId, 'actual_date_of_service'], 'Checking out a completed visit cannot change its Actual DOS.');
    }
  }

  for (const [invoiceId, invoice] of newInvoices) {
    const old = oldInvoices.get(invoiceId);
    if (!old) {
      const appointment = newAppointments.get(id(invoice.appointmentId));
      if (!invoice.appointmentId || !appointment || !AppointmentDomain.isCompleted(appointment) || !appointment.actual_date_of_service || appointment.dos_verified !== true) addIssue(issues, ['invoices', invoiceId, 'appointmentId'], 'New invoices must be linked to a completed appointment with a verified Actual DOS.');
      continue;
    }
    if (old.patientId !== invoice.patientId || old.appointmentId !== invoice.appointmentId) {
      addIssue(issues, ['invoices', invoiceId], 'An invoice cannot be reassigned to another patient or appointment.');
    }
  }

  return { success: issues.length === 0, issues };
}


function validateRoleChanges(previous, next, user, options = {}) {
  if (!previous || ['OWNER', 'ADMIN'].includes(user.role)) return { success: true, issues: [] };
  const issues = [];
  const clinicToday = options.clinicToday || null;
  const oldAppointments = byId(previous.appointments);
  const nextAppointments = byId(next.appointments);
  const oldPatients = byId(previous.patients);
  const nextPatients = byId(next.patients);
  const oldInvoices = byId(previous.invoices);
  const nextInvoices = byId(next.invoices);
  const hasAssignedBranch = typeof user.branch === 'string' && user.branch.trim().length > 0;
  const doctorInBranch = (name, branch, state = next) => Boolean(name && branch &&
    ((state.staff || []).some((member) => String(member.role || '').toLowerCase() === 'doctor' && member.name === name && member.branch === branch) ||
     (state.providers || []).some((provider) => provider.name === name && provider.branch === branch)));
  const appointmentBelongsToDoctor = (appointment) => Boolean(appointment && user.providerName && hasAssignedBranch &&
    appointment.doctor === user.providerName && appointment.branch === user.branch);
  const patientBelongsToDoctor = (patient) => Boolean(patient && user.providerName && hasAssignedBranch &&
    patient.doctor === user.providerName && patient.branch === user.branch);
  const patientAccessibleToDoctor = (patientId, state) => {
    if (!patientId || !user.providerName || !hasAssignedBranch) return false;
    const patient = byId(state.patients).get(id(patientId));
    return patientBelongsToDoctor(patient) || (state.appointments || []).some((appointment) =>
      id(appointment.patient) === id(patientId) && appointmentBelongsToDoctor(appointment));
  };
  const patientInBranch = (patientId, state) => {
    if (!hasAssignedBranch || !patientId) return false;
    const patient = byId(state.patients).get(id(patientId));
    if (patient?.branch === user.branch) return true;
    return (state.appointments || []).some((appointment) => appointment.branch === user.branch && id(appointment.patient) === id(patientId));
  };
  const invoiceInBranch = (invoice, state) => {
    if (!hasAssignedBranch || !invoice?.patientId) return false;
    if (invoice.appointmentId !== undefined && invoice.appointmentId !== null && invoice.appointmentId !== '') {
      const appointment = byId(state.appointments).get(id(invoice.appointmentId));
      return Boolean(appointment && appointment.branch === user.branch && id(appointment.patient) === id(invoice.patientId));
    }
    const patient = byId(state.patients).get(id(invoice.patientId));
    return Boolean(patient && patient.branch === user.branch && (!invoice.branch || invoice.branch === user.branch));
  };

  if (user.role === 'DOCTOR') {
    if (!user.providerName || !hasAssignedBranch) addIssue(issues, ['user'], 'Doctor account must have an assigned provider and branch before modifying clinic records.');
    for (const [appointmentId, current] of nextAppointments) {
      const before = oldAppointments.get(appointmentId);
      if (!before) {
        const patient = oldPatients.get(id(current.patient));
        if (!appointmentBelongsToDoctor(current) || !patientBelongsToDoctor(patient)) {
          addIssue(issues, ['appointments', appointmentId], 'Doctor accounts may only create appointments for patients already assigned to their provider profile and branch.');
        }
        continue;
      }
      if (!appointmentBelongsToDoctor(before)) {
        if (!same(before, current)) addIssue(issues, ['appointments', appointmentId], 'Doctor accounts cannot modify another provider’s appointment.');
        continue;
      }
      if (id(before.patient) !== id(current.patient) || current.doctor !== user.providerName || current.branch !== user.branch) {
        addIssue(issues, ['appointments', appointmentId], 'Doctor accounts cannot change an appointment’s patient, assigned doctor, or branch.');
      }
      const beforeStatus = AppointmentDomain.normalizeStatus(before.status);
      const currentStatus = AppointmentDomain.normalizeStatus(current.status);
      if (beforeStatus !== currentStatus && ![
        'scheduled>arrived', 'scheduled>no_show', 'scheduled>rescheduled', 'scheduled>cancelled',
        'arrived>cancelled', 'arrived>in-consultation', 'in-consultation>completed', 'completed>checked-out',
        'no_show>scheduled', 'no_show>arrived', 'no_show>rescheduled'
      ].includes(`${beforeStatus}>${currentStatus}`)) {
        addIssue(issues, ['appointments', appointmentId, 'status'], 'Doctor role is not authorized for this appointment status transition.');
      }
    }

    const dosUpdatedAppointmentIds = new Set();
    for (const [appointmentId, current] of nextAppointments) {
      const before = oldAppointments.get(appointmentId);
      if (before && appointmentBelongsToDoctor(before) && appointmentBelongsToDoctor(current) && current.dos_verified === true &&
          ((before.actual_date_of_service || null) !== (current.actual_date_of_service || null) || before.dos_verified !== true)) {
        dosUpdatedAppointmentIds.add(appointmentId);
      }
    }

    for (const collection of ['prescriptions', 'patientTimeline']) {
      const beforeById = byId(previous[collection]);
      for (const [recordId, record] of byId(next[collection])) {
        const before = beforeById.get(recordId);
        if (before && same(before, record)) continue;
        const patientId = record.patientId ?? record.patient;
        if (!patientAccessibleToDoctor(patientId, previous) || !patientAccessibleToDoctor(patientId, next) ||
            (before && id(before.patientId ?? before.patient) !== id(patientId))) {
          addIssue(issues, [collection, recordId], `Doctor accounts may only create or update ${collection} for patients assigned to their provider profile and branch.`);
        }
        if (record.doctor && record.doctor !== user.providerName) addIssue(issues, [collection, recordId, 'doctor'], 'Record provider must match the signed-in doctor.');
      }
    }

    const oldEncounters = previous.encounters || {};
    for (const [encounterId, encounter] of Object.entries(next.encounters || {})) {
      const before = oldEncounters[encounterId];
      if (before && same(before, encounter)) continue;
      const patientId = encounter?.patientId;
      const appointment = encounter?.appointmentId ? oldAppointments.get(id(encounter.appointmentId)) : null;
      if (!patientAccessibleToDoctor(patientId, previous) || !patientAccessibleToDoctor(patientId, next) ||
          (before && (id(before.patientId) !== id(encounter.patientId) || id(before.appointmentId) !== id(encounter.appointmentId))) ||
          (encounter?.appointmentId && !appointmentBelongsToDoctor(appointment)) ||
          (encounter?.provider && encounter.provider !== user.providerName)) {
        addIssue(issues, ['encounters', encounterId], 'Doctor accounts may only create or update encounters linked to their assigned patients and appointments.');
      }
    }

    let invoiceChangesAllowed = oldInvoices.size === nextInvoices.size;
    if (invoiceChangesAllowed) for (const [invoiceId, current] of nextInvoices) {
      const before = oldInvoices.get(invoiceId);
      if (!before) { invoiceChangesAllowed = false; break; }
      if (same(before, current)) continue;
      if (!dosUpdatedAppointmentIds.has(id(current.appointmentId)) || !invoiceInBranch(current, next)) { invoiceChangesAllowed = false; break; }
      const synchronized = { ...before, actual_date_of_service: current.actual_date_of_service, dos_verified: current.dos_verified };
      if (!same(synchronized, current)) { invoiceChangesAllowed = false; break; }
    }
    if (!invoiceChangesAllowed) addIssue(issues, ['invoices'], 'Doctor accounts cannot create or modify invoices; only server-propagated DOS synchronization for the doctor’s own completed visits is permitted.');
  }

  if (user.role === 'RECEPTIONIST') {
    if (!hasAssignedBranch) addIssue(issues, ['user', 'branch'], 'Receptionist account must have an assigned branch.');
    for (const [appointmentId, current] of nextAppointments) {
      const before = oldAppointments.get(appointmentId);
      if (!before) {
        const patient = nextPatients.get(id(current.patient));
        if (current.branch !== user.branch || !doctorInBranch(current.doctor, user.branch) || !patient || patient.branch !== user.branch) {
          addIssue(issues, ['appointments', appointmentId, 'branch'], 'Receptionist may only book patients and doctors assigned to the receptionist’s branch.');
        }
        continue;
      }
      if (before.branch !== user.branch) {
        if (!same(before, current)) addIssue(issues, ['appointments', appointmentId], 'Receptionist accounts cannot access or modify appointments outside their assigned branch.');
        continue;
      }
      if (current.branch !== user.branch || id(before.patient) !== id(current.patient)) {
        addIssue(issues, ['appointments', appointmentId], 'Receptionist accounts cannot move an appointment to another branch or reassign it to another patient.');
      }
      if (!doctorInBranch(current.doctor, user.branch)) addIssue(issues, ['appointments', appointmentId, 'doctor'], 'Appointment doctor must belong to the receptionist’s assigned branch.');
      const beforeStatus = AppointmentDomain.normalizeStatus(before.status);
      const currentStatus = AppointmentDomain.normalizeStatus(current.status);
      if (beforeStatus !== currentStatus && ![
        'scheduled>arrived', 'scheduled>no_show', 'scheduled>rescheduled', 'scheduled>cancelled',
        'arrived>cancelled', 'completed>checked-out', 'no_show>scheduled', 'no_show>arrived', 'no_show>rescheduled'
      ].includes(`${beforeStatus}>${currentStatus}`)) {
        addIssue(issues, ['appointments', appointmentId, 'status'], 'Receptionist role cannot start or complete a clinical consultation.');
      }
      if ((before.actual_date_of_service || null) !== (current.actual_date_of_service || null)) addIssue(issues, ['appointments', appointmentId, 'actual_date_of_service'], 'Receptionist accounts cannot set or correct Actual DOS.');
    }
    const demographicFields = new Set(['id','name','age','dob','sex','pronouns','maritalStatus','phone','email','address','city','region','postalCode','country','preferredLanguage','occupation','emergencyContactName','emergencyContactRelationship','emergencyContactPhone','doctor','branch','type','last','payer','policy']);
    for (const [patientId, current] of nextPatients) {
      const before = oldPatients.get(patientId);
      if (!before) {
        if (current.branch !== user.branch) addIssue(issues, ['patients', patientId, 'branch'], 'Receptionist may only register patients in the assigned branch.');
        if (current.doctor && !doctorInBranch(current.doctor, user.branch)) addIssue(issues, ['patients', patientId, 'doctor'], 'New patient must be assigned to a doctor in the receptionist assigned branch.');
        continue;
      }
      if (before.branch !== user.branch) {
        if (!same(before, current)) addIssue(issues, ['patients', patientId], 'Receptionist accounts cannot modify patient records outside their assigned branch.');
        continue;
      }
      for (const field of new Set([...Object.keys(before), ...Object.keys(current)])) {
        if (!demographicFields.has(field) && !same(before[field], current[field])) addIssue(issues, ['patients', patientId, field], 'Receptionist accounts may only modify patient demographic and administrative contact fields.');
      }
      if (current.branch !== user.branch) addIssue(issues, ['patients', patientId, 'branch'], 'Patient records must remain in the receptionist assigned branch.');
      if ((before.doctor !== current.doctor || before.branch !== current.branch) && next.appointments.some((appointment) =>
        id(appointment.patient) === patientId && (!clinicToday || appointment.date >= clinicToday) &&
        !['cancelled','rescheduled'].includes(AppointmentDomain.normalizeStatus(appointment.status)))) {
        addIssue(issues, ['patients', patientId, 'doctor'], 'Reassign the patient only after future or same-day appointments are cancelled or rescheduled.');
      }
      if (current.doctor && !doctorInBranch(current.doctor, user.branch)) addIssue(issues, ['patients', patientId, 'doctor'], 'Assigned doctor must belong to the receptionist assigned branch.');
    }
    if (!same(previous.encounters || {}, next.encounters || {}) || !same(previous.invoices || [], next.invoices || [])) {
      addIssue(issues, ['state'], 'Receptionist accounts cannot modify clinical encounters or invoices.');
    }
  }

  if (user.role === 'BILLING') {
    if (!hasAssignedBranch) addIssue(issues, ['user', 'branch'], 'Billing account must have an assigned branch.');
    if (!same(previous.appointments || [], next.appointments || []) ||
        !same(previous.patients || [], next.patients || []) ||
        !same(previous.encounters || {}, next.encounters || {})) {
      addIssue(issues, ['state'], 'Billing accounts may update invoices and insurance records only.');
    }
    for (const [invoiceId, current] of nextInvoices) {
      const before = oldInvoices.get(invoiceId);
      if (before && same(before, current)) continue;
      if ((before && !invoiceInBranch(before, previous)) || !invoiceInBranch(current, next)) {
        addIssue(issues, ['invoices', invoiceId], 'Billing accounts may only create or update invoices for patients and appointments in their assigned branch.');
      }
      if (before && (id(before.patientId) !== id(current.patientId) || id(before.appointmentId) !== id(current.appointmentId))) {
        addIssue(issues, ['invoices', invoiceId], 'Billing accounts cannot reassign an invoice to another patient or appointment.');
      }
    }
    const oldInsurance = previous.insurance || {};
    const nextInsurance = next.insurance || {};
    for (const patientId of new Set([...Object.keys(oldInsurance), ...Object.keys(nextInsurance)])) {
      if (same(oldInsurance[patientId], nextInsurance[patientId])) continue;
      if (!patientInBranch(patientId, previous) && !patientInBranch(patientId, next)) {
        addIssue(issues, ['insurance', patientId], 'Billing accounts may only access insurance records for patients in their assigned branch.');
      }
    }
  }

  if (user.role === 'AUDITOR' || user.role === 'STAFF') {
    if (!same(previous, next)) addIssue(issues, ['state'], 'This role has read-only access to clinic records.');
  }
  if (user.role !== 'BILLING' && !same(previous.invoices || [], next.invoices || []) && !['OWNER','ADMIN','DOCTOR','RECEPTIONIST'].includes(user.role)) {
    addIssue(issues, ['invoices'], 'This role cannot modify invoices.');
  }
  return { success: issues.length === 0, issues };
}

async function auditSnapshotChanges(tx, req, previous, next, reason = '') {
  const orgId = req.auth.organization.id;
  const actorUserId = req.auth.user.id;
  const actorRole = req.auth.user.role;
  const create = (event) => tx.auditEvent.create({ data: {
    organizationId: orgId,
    actorUserId,
    actorRole,
    reason: reason || null,
    action: event.action,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    outcome: 'SUCCESS',
    previousValues: event.previousValues || undefined,
    newValues: event.newValues || undefined,
    metadata: event.metadata || undefined
  }});

  const oldAppointments = byId(previous?.appointments);
  const newAppointments = byId(next.appointments);
  for (const [appointmentId, current] of newAppointments) {
    const before = oldAppointments.get(appointmentId);
    if (!before) {
      await create({ action: 'appointment.created', resourceType: 'appointment', resourceId: appointmentId, newValues: safeAppointmentValues(current) });
      continue;
    }
    const beforeStatus = AppointmentDomain.normalizeStatus(before.status);
    const currentStatus = AppointmentDomain.normalizeStatus(current.status);
    const beforeDos = before.actual_date_of_service || null;
    const currentDos = current.actual_date_of_service || null;
    if (beforeStatus !== currentStatus) {
      const hasAttendanceCorrection = (current.attendanceCorrectionHistory || []).length > (before.attendanceCorrectionHistory || []).length;
      const action = currentStatus === 'completed' ? 'consultation.completed'
        : currentStatus === 'no_show' ? 'appointment.no_show'
        : hasAttendanceCorrection ? 'appointment.attendance_corrected'
        : currentStatus === 'rescheduled' ? 'appointment.rescheduled'
        : currentStatus === 'cancelled' ? 'appointment.cancelled'
        : 'appointment.status_changed';
      await create({ action, resourceType: 'appointment', resourceId: appointmentId,
        previousValues: { status: beforeStatus }, newValues: { status: currentStatus } });
    }
    if (!before.no_show_at && current.no_show_at && currentStatus === 'rescheduled') {
      await create({ action: 'appointment.no_show_recognized', resourceType: 'appointment', resourceId: appointmentId,
        previousValues: { status: beforeStatus, scheduledDate: before.date },
        newValues: { status: currentStatus, noShowAt: current.no_show_at, rescheduledToId: current.rescheduled_to_id || null } });
    }
    if (before.dos_verified !== current.dos_verified && currentDos) {
      await create({ action: current.dos_verified === true ? 'appointment.dos_verified' : 'appointment.dos_marked_unverified',
        resourceType: 'appointment', resourceId: appointmentId,
        previousValues: { actualDateOfService: beforeDos, dosVerified: typeof before.dos_verified === 'boolean' ? before.dos_verified : null },
        newValues: { actualDateOfService: currentDos, dosVerified: current.dos_verified === true } });
    }
    if (beforeDos !== currentDos) {
      await create({ action: beforeDos ? 'appointment.dos_modified' : 'appointment.dos_finalized',
        resourceType: 'appointment', resourceId: appointmentId,
        previousValues: { actualDateOfService: beforeDos }, newValues: { actualDateOfService: currentDos } });
    }
    if (before.date !== current.date || before.time !== current.time || before.doctor !== current.doctor) {
      await create({ action: 'appointment.details_changed', resourceType: 'appointment', resourceId: appointmentId,
        previousValues: { scheduledDate: before.date, scheduledTime: before.time, doctor: before.doctor },
        newValues: { scheduledDate: current.date, scheduledTime: current.time, doctor: current.doctor } });
    }
  }

  const oldPatients = byId(previous?.patients);
  const newPatients = byId(next.patients);
  for (const [patientId, patient] of newPatients) {
    const before = oldPatients.get(patientId);
    if (!before) {
      await create({ action: 'patient.created', resourceType: 'patient', resourceId: patientId,
        newValues: { branch: patient.branch || null, assignedDoctor: patient.doctor || null } });
      continue;
    }
    const changedFields = [...new Set([...Object.keys(before), ...Object.keys(patient)])].filter((field) => !same(before[field], patient[field]));
    if (changedFields.length) await create({ action: 'patient.demographics_updated', resourceType: 'patient', resourceId: patientId,
      previousValues: { changedFields }, newValues: { changedFields, branch: patient.branch || null, assignedDoctor: patient.doctor || null } });
  }

  const oldEncounters = previous?.encounters || {};
  const newEncounters = next.encounters || {};
  for (const [encounterId, encounter] of Object.entries(newEncounters)) {
    const before = oldEncounters[encounterId];
    if (!before) {
      await create({ action: 'encounter.created', resourceType: 'encounter', resourceId: encounterId,
        newValues: { patientId: encounter.patientId || null, appointmentId: encounter.appointmentId || null, status: encounter.status || 'Draft' } });
      continue;
    }
    const changedFields = [...new Set([...Object.keys(before), ...Object.keys(encounter)])].filter((field) => !same(before[field], encounter[field]));
    if (changedFields.length) await create({ action: encounter.status === 'Signed' && before.status !== 'Signed' ? 'encounter.signed' : 'encounter.updated',
      resourceType: 'encounter', resourceId: encounterId,
      previousValues: { status: before.status || 'Draft', changedFields },
      newValues: { status: encounter.status || 'Draft', provider: encounter.provider || null, actualDateOfService: encounter.actual_date_of_service || null, changedFields } });
  }

  const oldStaff = byId(previous?.staff);
  const newStaff = byId(next.staff);
  for (const [staffId, member] of newStaff) {
    const before = oldStaff.get(staffId);
    if (before && !same(before, member)) await create({ action: 'staff.updated', resourceType: 'staff', resourceId: staffId,
      previousValues: { status: before.status || null, branch: before.branch || null },
      newValues: { status: member.status || null, branch: member.branch || null } });
  }

  const oldInvoices = byId(previous?.invoices);
  const newInvoices = byId(next.invoices);
  for (const [invoiceId, invoice] of newInvoices) {
    const before = oldInvoices.get(invoiceId);
    if (!before) await create({ action: 'invoice.created', resourceType: 'invoice', resourceId: invoiceId,
      newValues: { patientId: invoice.patientId, appointmentId: invoice.appointmentId ?? null, amount: invoice.amount, status: invoice.status, actualDateOfService: invoice.actual_date_of_service || null, dosVerified: invoice.dos_verified === true } });
    else if (!same(before, invoice)) await create({ action: 'invoice.updated', resourceType: 'invoice', resourceId: invoiceId,
      previousValues: { amount: before.amount, tax: before.tax, status: before.status, actualDateOfService: before.actual_date_of_service || null, dosVerified: before.dos_verified === true },
      newValues: { amount: invoice.amount, tax: invoice.tax, status: invoice.status, actualDateOfService: invoice.actual_date_of_service || null, dosVerified: invoice.dos_verified === true } });
  }
}

module.exports = { applyServerAppointmentMetadata, validateSnapshotTransitions, validateRoleChanges, auditSnapshotChanges, safeAppointmentValues };
