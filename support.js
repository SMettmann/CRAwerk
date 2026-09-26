(() => {
  const backend = window.CRAwerkBackend;
  const auth = window.CRAwerkSupabase;
  const form = document.getElementById('support-form');
  const list = document.getElementById('support-ticket-list');
  const empty = document.getElementById('support-empty');
  const refreshButton = document.getElementById('support-refresh');
  let tickets = [];

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");

  const formatDateTime = value => value
    ? new Intl.DateTimeFormat('de-DE', {
        day:'2-digit',
        month:'2-digit',
        year:'numeric',
        hour:'2-digit',
        minute:'2-digit'
      }).format(new Date(value))
    : '–';

  const categoryLabels = {
    general:'Allgemeine Frage',
    technical:'Technisches Problem',
    cra:'CRAwerk-Nutzung',
    billing:'Tarif & Abrechnung',
    account:'Konto & Zugang'
  };

  const statusLabels = {
    open:'Offen',
    in_progress:'In Bearbeitung',
    answered:'Beantwortet',
    closed:'Erledigt'
  };

  const showToast = message => {
    const toast = document.getElementById('support-toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(window.__supportToast);
    window.__supportToast = setTimeout(() => toast.hidden = true, 2800);
  };

  const render = () => {
    empty.hidden = tickets.length > 0;
    list.hidden = tickets.length === 0;

    list.innerHTML = tickets.map(ticket => {
      const messages = ticket.messages.map(item =>
        '<div class="support-message ' + (item.senderRole === 'admin' ? 'support-message-admin' : 'support-message-customer') + '">' +
          '<div class="support-message-head">' +
            '<strong>' + (item.senderRole === 'admin' ? 'CRAwerk Support' : 'Sie') + '</strong>' +
            '<span>' + escapeHtml(formatDateTime(item.createdAt)) + '</span>' +
          '</div>' +
          '<p>' + escapeHtml(item.message).replaceAll('\n','<br>') + '</p>' +
        '</div>'
      ).join('');

      return '<article class="support-ticket" data-ticket="' + escapeHtml(ticket.id) + '">' +
        '<div class="support-ticket-head">' +
          '<div>' +
            '<span>' + escapeHtml(categoryLabels[ticket.category] || 'Support') + ' · ' + escapeHtml(formatDateTime(ticket.createdAt)) + '</span>' +
            '<h3>' + escapeHtml(ticket.subject) + '</h3>' +
          '</div>' +
          '<span class="support-status status-' + escapeHtml(ticket.status) + '">' +
            escapeHtml(statusLabels[ticket.status] || ticket.status) +
          '</span>' +
        '</div>' +
        '<div class="support-message support-message-customer support-initial-message">' +
          '<div class="support-message-head"><strong>Sie</strong><span>' + escapeHtml(formatDateTime(ticket.createdAt)) + '</span></div>' +
          '<p>' + escapeHtml(ticket.message).replaceAll('\n','<br>') + '</p>' +
        '</div>' +
        messages +
        '<form class="support-followup-form" data-support-followup="' + escapeHtml(ticket.id) + '">' +
          '<label><span>Noch etwas ergänzen?</span>' +
          '<textarea name="message" rows="3" maxlength="5000" required placeholder="Weitere Nachricht zu dieser Anfrage"></textarea></label>' +
          '<div><small>' + (ticket.status === 'closed' ? 'Eine neue Nachricht öffnet die Anfrage wieder.' : 'Die Nachricht wird direkt an CRAwerk Support gesendet.') + '</small>' +
          '<button class="app-btn app-btn-ghost" type="submit">Nachricht senden</button></div>' +
        '</form>' +
      '</article>';
    }).join('');
  };

  const load = async () => {
    tickets = await backend.loadSupportTickets();
    render();
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    submit.disabled = true;
    submit.textContent = 'Wird gesendet…';

    try {
      await backend.createSupportTicket({
        category:data.get('category'),
        subject:data.get('subject'),
        message:data.get('message')
      });
      form.reset();
      await load();
      showToast('Supportanfrage wurde gesendet.');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'Supportanfrage konnte nicht gesendet werden.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Anfrage senden';
    }
  });

  list.addEventListener('submit', async event => {
    const followup = event.target.closest('[data-support-followup]');
    if (!followup) return;
    event.preventDefault();

    const submit = followup.querySelector('button[type="submit"]');
    const textarea = followup.elements.message;
    submit.disabled = true;
    submit.textContent = 'Wird gesendet…';

    try {
      await backend.addSupportMessage(followup.dataset.supportFollowup, textarea.value);
      textarea.value = '';
      await load();
      showToast('Nachricht wurde gesendet.');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'Nachricht konnte nicht gesendet werden.');
    } finally {
      submit.disabled = false;
      submit.textContent = 'Nachricht senden';
    }
  });

  refreshButton.addEventListener('click', async () => {
    refreshButton.disabled = true;
    try {
      await load();
      showToast('Supportverlauf wurde aktualisiert.');
    } catch (error) {
      console.error(error);
      showToast('Supportverlauf konnte nicht geladen werden.');
    } finally {
      refreshButton.disabled = false;
    }
  });

  const init = async () => {
    const session = await auth.getSession();
    if (!session) {
      location.replace('login.html?next=' + encodeURIComponent('support.html'));
      return;
    }

    const company = await backend.currentCompany();
    document.getElementById('support-company-name').textContent = company.name || 'Unternehmen';
    await load();
  };

  init().catch(error => {
    console.error(error);
    showToast('Supportbereich konnte nicht geladen werden.');
  });
})();