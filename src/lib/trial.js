function isTrialOrSubscriptionActive(organization, now = new Date()) {
  if (!organization) return false;
  if (String(organization.subscriptionStatus || '').toUpperCase() === 'ACTIVE') return true;
  return Boolean(organization.trialEndsAt && new Date(organization.trialEndsAt).getTime() >= now.getTime());
}

function billingSummary(organization) {
  const active = isTrialOrSubscriptionActive(organization);
  const paid = String(organization.subscriptionStatus || '').toUpperCase() === 'ACTIVE';
  const asDate = (value) => value ? new Date(value).toISOString().slice(0, 10) : null;
  return {
    plan: paid ? 'paid' : 'trial',
    planLabel: paid ? 'Active subscription' : (active ? 'Free Trial' : 'Trial expired'),
    status: paid ? 'active' : (active ? 'trial' : 'expired'),
    trialStartedAt: asDate(organization.trialStartedAt),
    trialEndsAt: asDate(organization.trialEndsAt),
    trialDays: Number(organization.trialDurationDays) || 30,
    paymentMethodRequired: false,
    invoiceHistory: []
  };
}

module.exports = { isTrialOrSubscriptionActive, billingSummary };
