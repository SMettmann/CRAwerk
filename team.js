(() => {
  const api = window.CRAwerkSupabase;
  const form = document.getElementById('team-invite-form');
  const list = document.getElementById('team-list');
  const pendingCard = document.getElementById('team-pending-card');
  const pendingList = document.getElementById('team-pending-list');
  const summary = document.getElementById('team-summary');
  let state = {role:'member', can_manage:false, members:[], invitations:[]};

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");

  const roleLabels = {
    owner:'Inhaber',
    admin:'Admin',
    member:'Mitarbeiter'
  };

  const formatDate = value => value
    ? new Intl.DateTimeFormat('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value))
    : '–';

  const showToast = message => {
    const toast = document.getElementById('team-toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(window.__teamToast);
    window.__teamToast = setTimeout(() => toast.hidden = true, 3000);
  };

  const invoke = async (action, payload = {}) => {
    const { data, error } = await api.client.functions.invoke('team', {
      body:{action, ...payload}
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const displayName = member => {
    const full = [member.first_name, member.last_name].filter(Boolean).join(' ').trim();
    return full || member.email || 'Teammitglied';
  };

  const render = () => {
    summary.textContent = state.members.length + (state.members.length === 1 ? ' Benutzer' : ' Benutzer') +
      ' · Ihre Rolle: ' + (roleLabels[state.role] || state.role);

    list.innerHTML = state.members.map(member => {
      const canEdit = state.can_manage && member.role !== 'owner' && !member.is_self;
      const pending = !member.confirmed;

      return '<article class="team-member-row">' +
        '<div class="team-avatar">' + escapeHtml((displayName(member).charAt(0) || '?').toUpperCase()) + '</div>' +
        '<div class="team-member-main">' +
          '<strong>' + escapeHtml(displayName(member)) + (member.is_self ? ' · Sie' : '') + '</strong>' +
          '<span>' + escapeHtml(member.email || '') + '</span>' +
          '<small>' + (pending ? 'Einladung noch nicht angenommen' : 'Dabei seit ' + escapeHtml(formatDate(member.created_at))) + '</small>' +
        '</div>' +
        '<div class="team-member-role">' +
          (canEdit
            ? '<select data-team-role="' + escapeHtml(member.user_id) + '">' +
                '<option value="member"' + (member.role === 'member' ? ' selected' : '') + '>Mitarbeiter</option>' +
                '<option value="admin"' + (member.role === 'admin' ? ' selected' : '') + '>Admin</option>' +
              '</select>'
            : '<span class="team-role-chip role-' + escapeHtml(member.role) + '">' + escapeHtml(roleLabels[member.role] || member.role) + '</span>') +
        '</div>' +
        (canEdit
          ? '<button class="text-button team-remove" type="button" data-team-remove="' + escapeHtml(member.user_id) + '">Entfernen</button>'
          : '<span></span>') +
      '</article>';
    }).join('');

    form.hidden = !state.can_manage;
    pendingCard.hidden = !state.can_manage || state.invitations.length === 0;

    pendingList.innerHTML = state.invitations.map(invite =>
      '<article class="team-pending-row">' +
        '<div><strong>' + escapeHtml(invite.email) + '</strong>' +
          '<span>' + escapeHtml(roleLabels[invite.role] || invite.role) + ' · gesendet ' + escapeHtml(formatDate(invite.last_sent_at || invite.created_at)) + '</span></div>' +
        '<div class="team-pending-actions">' +
          '<button class="text-button" type="button" data-invite-resend="' + escapeHtml(invite.id) + '">Erneut senden</button>' +
          '<button class="text-button team-remove" type="button" data-invite-cancel="' + escapeHtml(invite.id) + '">Zurückziehen</button>' +
        '</div>' +
      '</article>'
    ).join('');
  };

  const load = async () => {
    state = await invoke('list');
    render();
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    button.disabled = true;
    button.textContent = 'Wird gesendet…';

    try {
      const result = await invoke('invite', {
        email:data.get('email'),
        role:data.get('role')
      });
      form.reset();
      await load();
      showToast(result?.message || 'Einladung wurde gesendet.');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'Einladung konnte nicht gesendet werden.');
    } finally {
      button.disabled = false;
      button.textContent = 'Einladung senden';
    }
  });

  list.addEventListener('change', async event => {
    const select = event.target.closest('[data-team-role]');
    if (!select) return;
    select.disabled = true;
    try {
      await invoke('set_role', {
        user_id:select.dataset.teamRole,
        role:select.value
      });
      await load();
      showToast('Rolle wurde geändert.');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'Rolle konnte nicht geändert werden.');
      await load();
    }
  });

  list.addEventListener('click', async event => {
    const button = event.target.closest('[data-team-remove]');
    if (!button) return;
    if (!confirm('Diesen Benutzer wirklich aus dem Unternehmen entfernen?')) return;

    button.disabled = true;
    try {
      await invoke('remove', {user_id:button.dataset.teamRemove});
      await load();
      showToast('Benutzer wurde entfernt.');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'Benutzer konnte nicht entfernt werden.');
      button.disabled = false;
    }
  });

  pendingList.addEventListener('click', async event => {
    const resend = event.target.closest('[data-invite-resend]');
    const cancel = event.target.closest('[data-invite-cancel]');
    if (!resend && !cancel) return;

    const button = resend || cancel;
    button.disabled = true;

    try {
      if (resend) {
        await invoke('resend', {invitation_id:resend.dataset.inviteResend});
        showToast('Einladung wurde erneut gesendet.');
      } else {
        if (!confirm('Einladung wirklich zurückziehen?')) {
          button.disabled = false;
          return;
        }
        await invoke('cancel_invitation', {invitation_id:cancel.dataset.inviteCancel});
        showToast('Einladung wurde zurückgezogen.');
      }
      await load();
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'Aktion konnte nicht ausgeführt werden.');
      button.disabled = false;
    }
  });

  const init = async () => {
    const session = await api.requireSession();
    if (!session) return;

    const [company, systemAdmin] = await Promise.all([
      window.CRAwerkBackend.currentCompany(),
      window.CRAwerkBackend.isSystemAdmin()
    ]);
    document.getElementById('team-company-name').textContent = company.name || 'Unternehmen';

    if (systemAdmin) {
      document.querySelectorAll('[data-system-admin-link]').forEach(link => link.hidden = false);
    }

    await load();
  };

  init().catch(error => {
    console.error(error);
    summary.textContent = 'Team konnte nicht geladen werden.';
    showToast('Team konnte nicht geladen werden.');
  });
})();