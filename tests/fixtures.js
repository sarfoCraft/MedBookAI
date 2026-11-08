function validState() {
  return {
    patients: [], appointments: [], followups: [], staff: [], providers: [], practices: [],
    soapTemplates: [], textPatterns: [], invoices: [], auditLogs: [], feedback: [],
    prescriptions: [], patientTimeline: [], encounters: {}, signatures: {}, documents: {},
    insurance: {}, intakeConsents: {}, nextSoapTemplateId: 1, nextTextPatternId: 1,
    customAccent: null
  };
}
module.exports = { validState };
