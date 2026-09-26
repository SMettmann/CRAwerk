(() => {
  const SUPABASE_URL = 'https://uqshjagnaaabyptdlzgr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_8VVsMRMXIpA0n7Gp1V8tzw_J4rf6xJF';
  const sessionId = crypto.randomUUID();
  const sentOnce = new Set();

  const track = async (eventType, oncePerPage = false) => {
    if (oncePerPage && sentOnce.has(eventType)) return;

    try {
      const response = await fetch(SUPABASE_URL + '/rest/v1/analytics_events', {
        method:'POST',
        headers:{
          'apikey':SUPABASE_KEY,
          'Authorization':'Bearer ' + SUPABASE_KEY,
          'Content-Type':'application/json',
          'Prefer':'return=minimal'
        },
        body:JSON.stringify({
          event_type:eventType,
          session_id:sessionId,
          path:location.pathname || '/'
        })
      });

      if (response.ok || response.status === 409) {
        if (oncePerPage) sentOnce.add(eventType);
      }
    } catch (error) {
      console.debug('CRAwerk usage event skipped.', error);
    }
  };

  window.CRAwerkAnalytics = {track};

  const navigation = performance.getEntriesByType?.('navigation')?.[0];
  if (navigation?.type !== 'reload') track('visitor', true);

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href*="CRAwerk_Handbuch.pdf"]');
    if (!link) return;
    track('handbook_download', false);
  });
})();