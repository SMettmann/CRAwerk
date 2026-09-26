(() => {
  const backend = window.CRAwerkBackend;
  const auth = window.CRAwerkSupabase;
  const list = document.getElementById('admin-company-list');
  const empty = document.getElementById('admin-empty');
  const summary = document.getElementById('admin-list-summary');
  const supportList = document.getElementById('admin-support-list');
  const supportEmpty = document.getElementById('admin-support-empty');
  const supportSummary = document.getElementById('admin-support-summary');
  let companies = [];
  let supportTickets = [];
  let currentFilter = 'all';
  let currentSupportFilter = 'all';

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const formatDateTime = value => {
    if (!value) return '–';
    return new Intl.DateTimeFormat('de-DE', {
      day:'2-digit',
      month:'2-digit',
      year:'numeric',
      hour:'2-digit',
      minute:'2-digit'
    }).format(new Date(value));
  };

  const statusLabels = {
    trial:'Testphase',
    active:'Aktiv',
    paused:'Pausiert',
    cancelled:'Beendet',
    internal:'Intern'
  };

  const supportStatusLabels = {
    open:'Offen',
    in_progress:'In Bearbeitung',
    answered:'Beantwortet',
    closed:'Erledigt'
  };

  const supportCategoryLabels = {
    general:'Allgemeine Frage',
    technical:'Technisches Problem',
    cra:'CRAwerk-Nutzung',
    billing:'Tarif & Abrechnung',
    account:'Konto & Zugang'
  };

  const showToast = message => {
    const toast = document.getElementById('app-toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(window.__adminToast);
    window.__adminToast = setTimeout(() => toast.hidden = true, 2800);
  };

  const renderStats = overview => {
    document.getElementById('admin-companies-total').textContent = overview?.companies_total ?? 0;
    document.getElementById('admin-companies-trial').textContent = overview?.companies_trial ?? 0;
    document.getElementById('admin-companies-active').textContent = overview?.companies_active ?? 0;
    document.getElementById('admin-users-total').textContent = overview?.users_total ?? 0;
    document.getElementById('admin-machines-total').textContent = overview?.machines_total ?? 0;
    document.getElementById('admin-companies-week').textContent = overview?.companies_last_7_days ?? 0;
  };

  const renderAnalytics = analytics => {
    document.getElementById('admin-visitors-total').textContent = analytics?.visitors_total ?? 0;
    document.getElementById('admin-visitors-week').textContent = analytics?.visitors_last_7_days ?? 0;
    document.getElementById('admin-quickchecks-total').textContent = analytics?.quickchecks_total ?? 0;
    document.getElementById('admin-quickchecks-week').textContent = analytics?.quickchecks_last_7_days ?? 0;
    document.getElementById('admin-handbook-total').textContent = analytics?.handbook_downloads_total ?? 0;
    document.getElementById('admin-handbook-week').textContent = analytics?.handbook_downloads_last_7_days ?? 0;
  };

  const renderCompanies = () => {
    const filtered = currentFilter === 'all'
      ? companies
      : companies.filter(company => company.account_status === currentFilter);

    empty.hidden = filtered.length > 0;
    list.hidden = filtered.length === 0;

    const testCount = companies.filter(company => company.account_status === 'trial' && company.trial_ends_at && new Date(company.trial_ends_at).getTime() > Date.now()).length;
    summary.textContent = companies.length + ' Firmen · ' + testCount + ' davon in Testphase';

    list.innerHTML = filtered.map(company => {
      const trialText = company.trial_ends_at
        ? 'Test bis ' + formatDateTime(company.trial_ends_at)
        : 'Teststart ' + formatDateTime(company.trial_started_at);

      return '<article class="admin-company-row">' +
        '<div class="admin-company-main">' +
          '<div class="admin-company-title">' +
            '<strong>' + escapeHtml(company.company_name || 'Ohne Firmenname') + '</strong>' +
            '<span class="admin-status status-' + escapeHtml(company.account_status) + '">' +
              escapeHtml(company.account_status === 'trial' && company.trial_ends_at && new Date(company.trial_ends_at).getTime() <= Date.now() ? 'Test abgelaufen' : (statusLabels[company.account_status] || company.account_status)) +
            '</span>' +
          '</div>' +
          '<span>' + escapeHtml(company.owner_email || 'Keine Owner-E-Mail') + '</span>' +
        '</div>' +
        '<div class="admin-company-meta">' +
          '<div><small>Registriert</small><strong>' + escapeHtml(formatDateTime(company.created_at)) + '</strong></div>' +
          '<div><small>Test</small><strong>' + escapeHtml(trialText) + '</strong></div>' +
          '<div><small>Benutzer</small><strong>' + escapeHtml(company.member_count) + '</strong></div>' +
          '<div><small>Maschinen</small><strong>' + escapeHtml(company.machine_count) + '</strong></div>' +
        '</div>' +
        '<label class="admin-status-control">' +
          '<span>Status</span>' +
          '<select data-company-status="' + escapeHtml(company.company_id) + '">' +
            ['trial','active','paused','cancelled'].map(status =>
              '<option value="' + status + '"' + (status === company.account_status ? ' selected' : '') + '>' +
                escapeHtml(statusLabels[status]) +
              '</option>'
            ).join('') +
          '</select>' +
        '</label>' +
      '</article>';
    }).join('');
  };

  const renderSupport = () => {
    const filtered = currentSupportFilter === 'all'
      ? supportTickets
      : supportTickets.filter(ticket => ticket.status === currentSupportFilter);

    supportEmpty.hidden = filtered.length > 0;
    supportList.hidden = filtered.length === 0;

    const openCount = supportTickets.filter(ticket =>
      ['open','in_progress'].includes(ticket.status)
    ).length;
    document.getElementById('admin-support-open').textContent = openCount;
    supportSummary.textContent =
      supportTickets.length + ' Anfragen · ' + openCount + ' offen oder in Bearbeitung';

    supportList.innerHTML = filtered.map(ticket => {
      const messages = ticket.messages.map(item =>
        '<div class="support-message ' + (item.senderRole === 'admin' ? 'support-message-admin' : 'support-message-customer') + '">' +
          '<div class="support-message-head"><strong>' +
            (item.senderRole === 'admin' ? 'CRAwerk Support' : 'Kunde') +
          '</strong><span>' + escapeHtml(formatDateTime(item.createdAt)) + '</span></div>' +
          '<p>' + escapeHtml(item.message).replaceAll('\n','<br>') + '</p>' +
        '</div>'
      ).join('');

      return '<article class="admin-support-ticket" data-admin-ticket="' + escapeHtml(ticket.id) + '">' +
        '<div class="support-ticket-head">' +
          '<div><span>' +
            escapeHtml(ticket.companyName || 'Unternehmen') + ' · ' +
            escapeHtml(supportCategoryLabels[ticket.category] || 'Support') + ' · ' +
            escapeHtml(formatDateTime(ticket.createdAt)) +
          '</span><h3>' + escapeHtml(ticket.subject) + '</h3>' +
          (ticket.companyEmail ? '<small>' + escapeHtml(ticket.companyEmail) + '</small>' : '') +
          '</div>' +
          '<label class="admin-support-status"><span>Status</span><select data-support-status="' + escapeHtml(ticket.id) + '">' +
            ['open','in_progress','answered','closed'].map(status =>
              '<option value="' + status + '"' + (status === ticket.status ? ' selected' : '') + '>' +
                escapeHtml(supportStatusLabels[status]) +
              '</option>'
            ).join('') +
          '</select></label>' +
        '</div>' +
        '<div class="support-message support-message-customer support-initial-message">' +
          '<div class="support-message-head"><strong>Kunde</strong><span>' + escapeHtml(formatDateTime(ticket.createdAt)) + '</span></div>' +
          '<p>' + escapeHtml(ticket.message).replaceAll('\n','<br>') + '</p>' +
        '</div>' +
        messages +
        '<form class="admin-support-reply" data-support-reply="' + escapeHtml(ticket.id) + '">' +
          '<label><span>Antwort</span><textarea name="message" rows="4" maxlength="5000" required placeholder="Antwort an den Kunden"></textarea></label>' +
          '<div><small>Die Antwort erscheint direkt im Supportbereich des Kunden.</small>' +
          '<button class="app-btn app-btn-dark" type="submit">Antwort senden</button></div>' +
        '</form>' +
      '</article>';
    }).join('');
  };

  const load = async () => {
    const [overview, analytics, companyList, ownCompany, tickets] = await Promise.all([
      backend.adminOverview(),
      backend.adminAnalytics(),
      backend.adminCompanies(),
      backend.currentCompany(),
      backend.adminSupportTickets()
    ]);

    companies = companyList;
    supportTickets = tickets;
    document.getElementById('admin-company-name').textContent = ownCompany.name || 'Unternehmen';
    renderStats(overview);
    renderAnalytics(analytics);
    renderCompanies();
    renderSupport();
  };

  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter;
      renderCompanies();
    });
  });

  document.querySelectorAll('[data-support-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-support-filter]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      currentSupportFilter = button.dataset.supportFilter;
      renderSupport();
    });
  });

  supportList.addEventListener('change', async event => {
    const select = event.target.closest('[data-support-status]');
    if (!select) return;

    select.disabled = true;
    try {
      await backend.adminSetSupportStatus(select.dataset.supportStatus, select.value);
      await load();
      showToast('Supportstatus wurde geändert.');
    } catch (error) {
      console.error(error);
      showToast('Supportstatus konnte nicht geändert werden.');
      await load();
    }
  });

  supportList.addEventListener('submit', async event => {
    const form = event.target.closest('[data-support-reply]');
    if (!form) return;
    event.preventDefault();

    const submit = form.querySelector('button[type="submit"]');
    const textarea = form.elements.message;
    submit.disabled = true;
    submit.textContent = 'Wird gesendet…';

    try {
      await backend.adminReplySupport(form.dataset.supportReply, textarea.value);
      textarea.value = '';
      await load();
      showToast('Antwort wurde gesendet.');
    } catch (error) {
      console.error(error);
      showToast('Antwort konnte nicht gesendet werden.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Antwort senden';
    }
  });

  list.addEventListener('change', async event => {
    const select = event.target.closest('[data-company-status]');
    if (!select) return;

    select.disabled = true;
    try {
      await backend.adminSetCompanyStatus(select.dataset.companyStatus, select.value);
      await load();
      showToast('Firmenstatus wurde geändert.');
    } catch (error) {
      console.error(error);
      showToast('Status konnte nicht geändert werden.');
      await load();
    }
  });

  document.getElementById('admin-refresh').addEventListener('click', async () => {
    try {
      await load();
      showToast('Systemübersicht wurde aktualisiert.');
    } catch (error) {
      console.error(error);
      showToast('Systemübersicht konnte nicht geladen werden.');
    }
  });

  const init = async () => {
    const session = await auth.requireSession();
    if (!session) return;

    const allowed = await backend.isSystemAdmin();
    if (!allowed) {
      location.replace('dashboard.html');
      return;
    }

    await load();
  };

  init().catch(error => {
    console.error(error);
    summary.textContent = 'Systemübersicht konnte nicht geladen werden.';
    showToast('Systemadmin-Bereich konnte nicht geladen werden.');
  });
})();