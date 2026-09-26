(() => {
  const api = window.CRAwerkSupabase;
  const title = document.getElementById('access-title');
  const text = document.getElementById('access-text');
  const message = document.getElementById('access-billing-message');
  const companyEl = document.getElementById('access-company');
  const statusEl = document.getElementById('access-status');
  const planEl = document.getElementById('access-plan');
  const trialEl = document.getElementById('access-trial');
  const dashboard = document.getElementById('access-dashboard');
  const portal = document.getElementById('access-portal');
  const planButtons = [...document.querySelectorAll('[data-plan]')];
  const planCards = [...document.querySelectorAll('[data-plan-card]')];
  let canManageBilling = true;

  const plans = {
    starter:{label:'Starter', price:'79 €', limit:'3 Produkte'},
    business:{label:'Business', price:'149 €', limit:'20 Produkte'},
    pro:{label:'Pro', price:'299 €', limit:'Unbegrenzt Produkte'}
  };

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

  const showMessage = (value, kind = '') => {
    message.textContent = value;
    message.className = 'account-billing-message' + (kind ? ' ' + kind : '');
    message.hidden = !value;
  };

  const invokeBilling = async (action, payload = {}) => {
    const { data, error } = await api.client.functions.invoke('billing', {
      body:{action, ...payload}
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const setPlanUi = state => {
    const planCode = state.company?.plan_code || 'starter';
    const hasRunningSubscription = state.company?.stripe_subscription_id &&
      ['active','trialing','past_due'].includes(state.company?.billing_status || '');

    planCards.forEach(card => {
      card.classList.toggle('current', card.dataset.planCard === planCode);
    });

    planButtons.forEach(button => {
      const code = button.dataset.plan;
      button.disabled = !canManageBilling || Boolean(hasRunningSubscription);
      if (!canManageBilling) {
        button.textContent = 'Nur Inhaber / Admin';
      } else if (hasRunningSubscription && code === planCode) {
        button.textContent = 'Aktueller Tarif';
      } else if (hasRunningSubscription) {
        button.textContent = 'Im Abo-Portal wechseln';
      } else {
        button.textContent = plans[code]?.label + ' wählen';
      }
    });
  };

  const render = state => {
    const company = state.company || {};
    const plan = plans[company.plan_code] || null;

    companyEl.textContent = company.name || 'Unternehmen';
    statusEl.textContent = statusLabels[state.status] || state.status || '–';
    planEl.textContent = plan ? plan.label + ' · ' + plan.price + '/Monat' : 'Noch nicht gewählt';
    portal.hidden = !company.stripe_customer_id || !canManageBilling;
    dashboard.hidden = !state.allowed;
    setPlanUi(state);

    if (state.status === 'trial' && state.trialActive) {
      trialEl.textContent = 'Test bis ' + formatDate(company.trial_ends_at);
      title.textContent = 'Ihre Testphase läuft.';
      text.textContent = 'Sie können CRAwerk noch ' + state.daysRemaining + ' ' +
        (state.daysRemaining === 1 ? 'Tag' : 'Tage') +
        ' kostenlos nutzen. Sie können jederzeit schon einen Tarif freischalten.';
      return;
    }

    if (state.reason === 'trial_expired') {
      statusEl.textContent = 'Test abgelaufen';
      trialEl.textContent = 'beendet am ' + formatDate(company.trial_ends_at);
      title.textContent = 'Ihre 14-tägige Testphase ist beendet.';
      text.textContent = 'Ihre Daten bleiben gespeichert. Wählen Sie unten einen Tarif, um CRAwerk wieder freizuschalten.';
      return;
    }

    if (state.reason === 'paused') {
      trialEl.textContent = company.billing_status === 'past_due' ? 'Zahlung offen' : 'Pausiert';
      title.textContent = 'Ihr CRAwerk-Zugang ist pausiert.';
      text.textContent = company.billing_status === 'past_due'
        ? 'Bei der letzten Abrechnung gab es ein Zahlungsproblem. Öffnen Sie „Abo verwalten“, um die Zahlungsart zu prüfen.'
        : 'Ihre Daten bleiben gespeichert. Prüfen Sie Ihr Abo oder wenden Sie sich an CRAwerk.';
      return;
    }

    if (state.reason === 'cancelled') {
      trialEl.textContent = company.billing_current_period_end
        ? 'beendet · ' + formatDate(company.billing_current_period_end)
        : 'beendet';
      title.textContent = 'Ihr CRAwerk-Abo ist beendet.';
      text.textContent = 'Ihre Daten bleiben gespeichert. Sie können unten jederzeit wieder einen Tarif freischalten.';
      return;
    }

    if (state.allowed) {
      const until = company.billing_current_period_end ? formatDate(company.billing_current_period_end) : '';
      trialEl.textContent = company.billing_cancel_at_period_end
        ? 'Kündigung zum ' + until
        : (company.billing_status ? 'Abo ' + company.billing_status : 'Freigeschaltet');
      title.textContent = state.status === 'internal'
        ? 'Interner CRAwerk-Zugang.'
        : 'Ihr CRAwerk-Zugang ist aktiv.';
      text.textContent = !canManageBilling
        ? 'Tarif und Abrechnung werden von einem Inhaber oder Admin Ihres Unternehmens verwaltet.'
        : (company.billing_cancel_at_period_end
          ? 'Ihr Abo läuft noch bis zum angezeigten Abrechnungsende. Bis dahin bleibt CRAwerk freigeschaltet.'
          : 'Tarif, Zahlungsart, Rechnungen und Kündigung können Sie über „Abo verwalten“ steuern.');
      return;
    }

    title.textContent = 'Ihr CRAwerk-Zugang ist derzeit nicht aktiv.';
    text.textContent = 'Bitte prüfen Sie Ihren Kontostatus oder wählen Sie einen Tarif.';
  };

  const refreshState = async () => {
    const state = await api.getAccountState();
    render(state);
    return state;
  };

  planButtons.forEach(button => {
    button.addEventListener('click', async () => {
      planButtons.forEach(item => item.disabled = true);
      showMessage('Stripe-Checkout wird geöffnet…');
      try {
        const result = await invokeBilling('checkout', {plan:button.dataset.plan});
        if (!result?.url) throw new Error('Stripe-Checkout konnte nicht geöffnet werden.');
        location.href = result.url;
      } catch (error) {
        console.error(error);
        showMessage('Checkout konnte nicht gestartet werden. Bitte versuchen Sie es erneut.', 'error');
        await refreshState();
      }
    });
  });

  portal.addEventListener('click', async () => {
    portal.disabled = true;
    showMessage('Abo-Portal wird geöffnet…');
    try {
      const result = await invokeBilling('portal');
      if (!result?.url) throw new Error('Abo-Portal konnte nicht geöffnet werden.');
      location.href = result.url;
    } catch (error) {
      console.error(error);
      showMessage('Abo-Portal konnte nicht geöffnet werden. Bitte versuchen Sie es erneut.', 'error');
      portal.disabled = false;
    }
  });

  document.getElementById('access-logout').addEventListener('click', async () => {
    await api.client.auth.signOut();
    location.replace('login.html');
  });

  const init = async () => {
    const session = await api.getSession();
    if (!session) {
      location.replace('login.html?next=zugang.html');
      return;
    }

    const membership = await api.currentMembership();
    canManageBilling = ['owner','admin'].includes(membership.role);

    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');

    if (params.get('checkout') === 'success' && sessionId) {
      showMessage('Zahlung wird bestätigt und Ihr CRAwerk-Zugang freigeschaltet…');
      try {
        await invokeBilling('confirm', {session_id:sessionId});
        history.replaceState({}, '', 'zugang.html?checkout=completed');
        showMessage('Zahlung bestätigt. Ihr CRAwerk-Zugang ist freigeschaltet.', 'success');
      } catch (error) {
        console.error(error);
        showMessage('Die Zahlung konnte noch nicht bestätigt werden. Bitte laden Sie die Seite erneut.', 'error');
      }
    } else if (params.get('checkout') === 'cancelled') {
      showMessage('Der Checkout wurde abgebrochen. Es wurde kein neuer Tarif freigeschaltet.');
    }

    let state = await api.getAccountState();

    if (state.company?.stripe_subscription_id && (params.get('portal') || params.get('checkout') === 'completed')) {
      try {
        await invokeBilling('sync');
        state = await api.getAccountState();
      } catch (error) {
        console.error(error);
      }
    }

    render(state);
  };

  init().catch(error => {
    console.error(error);
    title.textContent = 'Kontostatus konnte nicht geladen werden.';
    text.textContent = 'Bitte laden Sie die Seite neu oder melden Sie sich erneut an.';
  });
})();