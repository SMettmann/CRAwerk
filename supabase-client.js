(() => {
  const SUPABASE_URL = 'https://uqshjagnaaabyptdlzgr.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8VVsMRMXIpA0n7Gp1V8tzw_J4rf6xJF';

  if (!window.supabase) {
    throw new Error('Supabase-Bibliothek konnte nicht geladen werden.');
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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
    banner.className = 'account-trial-banner';
    banner.innerHTML =
      '<div><strong>14 Tage kostenlos testen</strong>' +
      '<span>Noch ' + state.daysRemaining + ' ' + (state.daysRemaining === 1 ? 'Tag' : 'Tage') +
      ' · Testphase bis ' + formatDate(state.trialEndsAt) + '</span></div>' +
      '<a href="zugang.html">Zugang & Tarif</a>';

    header.insertAdjacentElement('afterend', banner);
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
    ensureCompany,
    evaluateAccount,
    getAccountState,
    requireSession
  };
})();