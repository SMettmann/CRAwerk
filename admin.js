(() => {
  const backend = window.CRAwerkBackend;
  const auth = window.CRAwerkSupabase;
  const list = document.getElementById('admin-company-list');
  const empty = document.getElementById('admin-empty');
  const summary = document.getElementById('admin-list-summary');
  let companies = [];
  let currentFilter = 'all';

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

  const load = async () => {
    const [overview, companyList, ownCompany] = await Promise.all([
      backend.adminOverview(),
      backend.adminCompanies(),
      backend.currentCompany()
    ]);

    companies = companyList;
    document.getElementById('admin-company-name').textContent = ownCompany.name || 'Unternehmen';
    renderStats(overview);
    renderCompanies();
  };

  document.querySelectorAll('.admin-filter').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.admin-filter').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.dataset.filter;
      renderCompanies();
    });
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