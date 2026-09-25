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

  async function requireSession() {
    const session = await getSession();
    if (!session) {
      const next = encodeURIComponent(location.pathname.split('/').pop() + location.search);
      location.replace('login.html?next=' + next);
      return null;
    }
    return session;
  }

  window.CRAwerkSupabase = {
    client,
    getSession,
    getUser,
    ensureCompany,
    requireSession
  };
})();