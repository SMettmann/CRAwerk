(() => {
  const api = window.CRAwerkSupabase;
  const title = document.getElementById('access-title');
  const text = document.getElementById('access-text');
  const companyEl = document.getElementById('access-company');
  const statusEl = document.getElementById('access-status');
  const trialEl = document.getElementById('access-trial');
  const stateEl = document.getElementById('access-state');
  const dashboard = document.getElementById('access-dashboard');

  const statusLabels = {
    trial:'Testphase',
    active:'Aktiv',
    paused:'Pausiert',
    cancelled:'Beendet',
    internal:'Intern'
  };

  const formatDate = value => value
    ? new Intl.DateTimeFormat('de-DE', {day:'2-digit', month:'2-digit', year:'numeric'}).format(new Date(value))
    : '–';

  const render = state => {
    companyEl.textContent = state.company?.name || 'Unternehmen';
    statusEl.textContent = statusLabels[state.status] || state.status || '–';
    trialEl.textContent = state.company?.trial_ends_at
      ? 'bis ' + formatDate(state.company.trial_ends_at)
      : '–';
    stateEl.textContent = state.allowed ? 'Freigeschaltet' : 'Gesperrt';

    if (state.status === 'trial' && state.trialActive) {
      title.textContent = 'Ihre Testphase läuft.';
      text.textContent = 'Sie können CRAwerk noch ' + state.daysRemaining + ' ' +
        (state.daysRemaining === 1 ? 'Tag' : 'Tage') +
        ' kostenlos nutzen. Danach ist eine Freischaltung nötig.';
      dashboard.hidden = false;
      return;
    }

    if (state.reason === 'trial_expired') {
      statusEl.textContent = 'Test abgelaufen';
      title.textContent = 'Ihre 14-tägige Testphase ist beendet.';
      text.textContent = 'Ihre bereits angelegten Daten bleiben gespeichert. Für die weitere Nutzung muss der CRAwerk-Zugang freigeschaltet werden.';
      return;
    }

    if (state.reason === 'paused') {
      title.textContent = 'Ihr CRAwerk-Zugang ist pausiert.';
      text.textContent = 'Ihre Daten bleiben gespeichert. Der Zugang kann durch CRAwerk wieder aktiviert werden.';
      return;
    }

    if (state.reason === 'cancelled') {
      title.textContent = 'Ihr CRAwerk-Zugang ist beendet.';
      text.textContent = 'Ihre Daten bleiben vorerst gespeichert. Für eine erneute Nutzung ist eine Freischaltung erforderlich.';
      return;
    }

    if (state.allowed) {
      title.textContent = 'Ihr CRAwerk-Zugang ist aktiv.';
      text.textContent = 'Sie können CRAwerk ohne Einschränkung nutzen.';
      dashboard.hidden = false;
      return;
    }

    title.textContent = 'Ihr CRAwerk-Zugang ist derzeit nicht aktiv.';
    text.textContent = 'Bitte prüfen Sie Ihren Kontostatus.';
  };

  const init = async () => {
    const session = await api.getSession();
    if (!session) {
      location.replace('login.html?next=zugang.html');
      return;
    }

    const state = await api.getAccountState();
    render(state);
  };

  document.getElementById('access-logout').addEventListener('click', async () => {
    await api.client.auth.signOut();
    location.replace('login.html');
  });

  init().catch(error => {
    console.error(error);
    title.textContent = 'Kontostatus konnte nicht geladen werden.';
    text.textContent = 'Bitte laden Sie die Seite neu oder melden Sie sich erneut an.';
  });
})();