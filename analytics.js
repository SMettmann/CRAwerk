(() => {
  const SUPABASE_URL = 'https://uqshjagnaaabyptdlzgr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_8VVsMRMXIpA0n7Gp1V8tzw_J4rf6xJF';
  const SESSION_KEY = 'crawerk_analytics_session';

  const getSessionId = () => {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  };

  const track = async (eventType, oncePerSession = false) => {
    const sessionId = getSessionId();
    const onceKey = 'crawerk_analytics_' + eventType;
    if (oncePerSession && sessionStorage.getItem(onceKey) === '1') return;

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
        if (oncePerSession) sessionStorage.setItem(onceKey, '1');
      }
    } catch (error) {
      console.debug('CRAwerk analytics event skipped.', error);
    }
  };

  window.CRAwerkAnalytics = {track};

  track('visitor', true);

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href*="CRAwerk_Handbuch.pdf"]');
    if (!link) return;
    track('handbook_download', false);
  });
})();