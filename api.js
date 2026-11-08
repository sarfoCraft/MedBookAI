/* MedBook AI v2.7 API client — same-origin, HttpOnly session cookie + CSRF token. */
(() => {
  'use strict';
  let csrfToken = null;

  async function request(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    const hasBody = options.body !== undefined;
    if (hasBody) headers['Content-Type'] = 'application/json';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers['X-CSRF-Token'] = csrfToken;

    const response = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
      body: hasBody ? JSON.stringify(options.body) : undefined
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : null;
    if (data?.csrfToken) csrfToken = data.csrfToken;
    if (!response.ok) {
      const error = new Error(data?.error || `Request failed (${response.status}).`);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  }

  async function firebaseLogin(email, password) {
    const setup = await request('/api/config/firebase');
    if (!setup.enabled || !setup.config?.apiKey || !setup.config?.projectId) return { configured: false };

    try {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(setup.config.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.idToken) {
        const code = data?.error?.message || 'FIREBASE_SIGN_IN_FAILED';
        const error = new Error(code === 'TOO_MANY_ATTEMPTS_TRY_LATER'
          ? 'Too many sign-in attempts. Please wait and try again.'
          : 'Email or password is incorrect.');
        error.status = response.status;
        error.code = code;
        error.firebaseConfigured = true;
        throw error;
      }
      const session = await request('/api/auth/firebase-login', { method: 'POST', body: { idToken: data.idToken } });
      return { configured: true, session };
    } catch (error) {
      error.firebaseConfigured = true;
      throw error;
    }
  }

  window.MedBookAPI = Object.freeze({
    session: () => request('/api/auth/session'),
    firebaseLogin,
    login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
    logout: () => request('/api/auth/logout', { method: 'POST', body: {} }),
    loadState: () => request('/api/state'),
    saveState: (state, expectedVersion, reason = '') => request('/api/state', { method: 'PUT', body: { state, expectedVersion, ...(reason ? { reason } : {}) } }),
    listUsers: () => request('/api/users'),
    createUser: (user) => request('/api/users', { method: 'POST', body: user }),
    updateUser: (id, changes) => request(`/api/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes }),
    exportBackup: async () => {
      const response = await fetch('/api/backup/export', { credentials: 'same-origin', cache: 'no-store' });
      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : null;
      if (!response.ok) {
        const error = new Error(data?.error || `Backup failed (${response.status}).`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    },
    restoreBackup: (backup, expectedVersion) => request('/api/backup/restore', {
      method: 'POST', body: { backup, expectedVersion }
    }),
    loadAudit: () => request('/api/audit')
  });
})();
