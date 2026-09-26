(() => {
  const SUPABASE_URL = 'https://uqshjagnaaabyptdlzgr.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8VVsMRMXIpA0n7Gp1V8tzw_J4rf6xJF';

  if (!window.supabase) {
    throw new Error('Supabase-Bibliothek konnte nicht geladen werden.');
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  const usageSessionId = crypto.randomUUID();

  async function trackUsageEvent(eventType) {
    try {
      const { error } = await client.from('analytics_events').insert({
        event_type:eventType,
        session_id:usageSessionId,
        path:location.pathname || '/'
      });
      if (error && error.code !== '23505') throw error;
    } catch (error) {
      console.debug('CRAwerk usage event skipped.', error);
    }
  }

  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  async function getUser() {
    const { data, error } = await client.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  async function currentMembership() {
    const user = await getUser();
    if (!user) throw new Error('Nicht angemeldet.');

    const { data, error } = await client
      .from('company_members')
      .select('company_id, role, created_at')
      .eq('user_id', user.id)
      .order('created_at', {ascending:true})
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Für diesen Benutzer ist keine Firma zugeordnet.');
    return data;
  }

  async function ensureCompany() {
    const user = await getUser();
    if (!user) throw new Error('Nicht angemeldet.');

    const { data: membership, error: membershipError } = await client
      .from('company_members')
      .select('company_id, role')
      .eq('user_id', user.id)
      .order('created_at', {ascending:true})
      .limit(1)
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership) {
      throw new Error('Für diesen Benutzer ist keine Firma zugeordnet.');
    }

    const { data: company, error: companyError } = await client
      .from('companies')
      .select('*')
      .eq('id', membership.company_id)
      .single();

    if (companyError) throw companyError;
    return company;
  }

  function evaluateAccount(company) {
    const status = company?.account_status || 'trial';
    const trialEndsAt = company?.trial_ends_at ? new Date(company.trial_ends_at) : null;
    const now = Date.now();
    const trialActive = status === 'trial' && trialEndsAt && trialEndsAt.getTime() > now;
    const allowed = status === 'active' || status === 'internal' || trialActive;

    let reason = '';
    if (!allowed) {
      if (status === 'trial') reason = 'trial_expired';
      else if (status === 'paused') reason = 'paused';
      else if (status === 'cancelled') reason = 'cancelled';
      else reason = 'inactive';
    }

    const daysRemaining = trialActive
      ? Math.max(1, Math.ceil((trialEndsAt.getTime() - now) / 86400000))
      : 0;

    return {
      company,
      status,
      allowed,
      reason,
      trialActive,
      trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
      daysRemaining
    };
  }

  async function getAccountState() {
    const company = await ensureCompany();
    return evaluateAccount(company);
  }

  function formatDate(value) {
    if (!value) return '';
    return new Intl.DateTimeFormat('de-DE', {
      day:'2-digit',
      month:'2-digit',
      year:'numeric'
    }).format(new Date(value));
  }

  function renderTrialNotice(state) {
    const existing = document.querySelector('.account-trial-banner');
    if (existing) existing.remove();
    if (!state?.trialActive) return;

    const header = document.querySelector('.app-header');
    if (!header) return;

    const banner = document.createElement('div');
    banner.className = 'account-trial-banner' + (state.daysRemaining <= 3 ? ' ending-soon' : '');
    banner.innerHTML =
      '<div><strong>Testphase: noch ' + state.daysRemaining + ' ' + (state.daysRemaining === 1 ? 'Tag' : 'Tage') + '</strong>' +
      '<span>Bis ' + formatDate(state.trialEndsAt) + ' kostenlos. Danach wird der Zugang gesperrt, bis ein Tarif gewählt wurde.</span></div>' +
      '<a href="zugang.html">Tarif jetzt wählen</a>';

    header.insertAdjacentElement('afterend', banner);
  }

  function installGlobalLogout() {
    const header = document.querySelector('.app-header');
    if (!header) return;

    const currentPage = location.pathname.split('/').pop();

    if (!document.querySelector('[data-support-link]')) {
      const supportLink = document.createElement('a');
      supportLink.href = 'support.html';
      supportLink.dataset.supportLink = 'true';
      supportLink.textContent = 'Support';

      const nav = header.querySelector('.app-nav');
      const adminLink = nav?.querySelector('[data-system-admin-link]');
      if (nav && adminLink) nav.insertBefore(supportLink, adminLink);
      else if (nav) nav.appendChild(supportLink);
    }

    if (currentPage !== 'zugang.html' && !document.querySelector('[data-billing-link]')) {
      const billingLink = document.createElement('a');
      billingLink.href = 'zugang.html';
      billingLink.className = 'app-billing-link';
      billingLink.dataset.billingLink = 'true';
      billingLink.textContent = 'Tarif & Abrechnung';

      const accountLink = header.querySelector('.app-account');
      if (accountLink) accountLink.insertAdjacentElement('afterend', billingLink);
      else header.appendChild(billingLink);

      currentMembership().then(membership => {
        if (!['owner','admin'].includes(membership.role)) billingLink.remove();
      }).catch(() => {});
    }

    if (document.getElementById('access-logout') || document.querySelector('[data-global-logout]')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'app-logout';
    button.dataset.globalLogout = 'true';
    button.textContent = 'Abmelden';
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Abmelden…';
      try {
        await client.auth.signOut();
      } finally {
        location.replace('login.html');
      }
    });
    header.appendChild(button);
  }

  function installHandbookTracking() {
    document.addEventListener('click', event => {
      const link = event.target.closest('a[href*="CRAwerk_Handbuch.pdf"]');
      if (!link) return;
      trackUsageEvent('handbook_download');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      installGlobalLogout();
      installHandbookTracking();
    });
  } else {
    installGlobalLogout();
    installHandbookTracking();
  }

  async function requireSession() {
    const session = await getSession();
    if (!session) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.replace('login.html?next=' + next);
      return null;
    }

    try {
      const state = await getAccountState();
      window.CRAwerkAccountState = state;

      if (!state.allowed) {
        const currentPage = location.pathname.split('/').pop();
        if (currentPage !== 'zugang.html') {
          location.replace('zugang.html?reason=' + encodeURIComponent(state.reason));
          return null;
        }
      } else {
        renderTrialNotice(state);
      }
    } catch (error) {
      console.error('Accountstatus konnte nicht geprüft werden.', error);
    }

    return session;
  }

  window.CRAwerkSupabase = {
    client,
    getSession,
    getUser,
    trackUsageEvent,
    currentMembership,
    ensureCompany,
    evaluateAccount,
    getAccountState,
    requireSession
  };
})();