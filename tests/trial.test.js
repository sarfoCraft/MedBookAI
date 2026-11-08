const { isTrialOrSubscriptionActive, billingSummary } = require('../src/lib/trial');

describe('server-managed trial', () => {
  const now = new Date('2026-11-07T12:00:00.000Z');
  test('allows a trial through its expiration timestamp', () => {
    expect(isTrialOrSubscriptionActive({ subscriptionStatus: 'TRIAL', trialEndsAt: '2026-11-07T12:00:00.000Z' }, now)).toBe(true);
  });
  test('blocks an expired trial', () => {
    expect(isTrialOrSubscriptionActive({ subscriptionStatus: 'TRIAL', trialEndsAt: '2026-11-06T23:59:59.000Z' }, now)).toBe(false);
  });
  test('an active paid subscription is not blocked by an old trial date', () => {
    expect(isTrialOrSubscriptionActive({ subscriptionStatus: 'ACTIVE', trialEndsAt: '2026-01-01T00:00:00.000Z' }, now)).toBe(true);
  });
  test('does not expose billing mutation controls in its summary', () => {
    const summary = billingSummary({ subscriptionStatus: 'TRIAL', trialStartedAt: now, trialEndsAt: new Date('2026-12-07T12:00:00Z') });
    expect(summary.status).toBe('trial');
    expect(summary.plan).toBe('trial');
    expect(summary).not.toHaveProperty('activate');
  });
});
