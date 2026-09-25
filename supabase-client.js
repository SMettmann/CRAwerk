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

    const { data: existing, error: existingError } = await client
      .from('companies')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return existing;

    const meta = user.user_metadata || {};
    const contactName = [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim();

    const { data: created, error: createError } = await client
      .from('companies')
      .insert({
        name: meta.company_name || 'Mein Unternehmen',
        contact_name: contactName || null,
        email: user.email || null,
        created_by: user.id
      })
      .select()
      .single();

    if (createError) throw createError;
    return created;
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