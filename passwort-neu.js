(() => {
  const form = document.getElementById('new-password-form');
  const message = document.getElementById('new-password-message');
  const submit = document.getElementById('new-password-submit');
  const password = document.getElementById('new-password');
  const confirm = document.getElementById('new-password-confirm');

  if (!form || !window.CRAwerkSupabase) return;

  let recoveryReady = false;
  const params = new URLSearchParams(location.search);
  const inviteHint =
    params.get('invite') === '1' ||
    location.hash.includes('type=invite') ||
    params.get('type') === 'invite';
  const recoveryHint =
    params.get('recovery') === '1' ||
    location.hash.includes('type=recovery') ||
    params.get('type') === 'recovery';

  if (inviteHint) {
    document.getElementById('password-page-title').innerHTML = 'Einladung angenommen.<br><span>Jetzt Zugang abschließen.</span>';
    document.getElementById('password-page-lead').textContent =
      'Legen Sie Ihr persönliches Passwort fest. Danach können Sie mit Ihrem eigenen Zugang im CRAwerk-Unternehmen mitarbeiten.';
    document.getElementById('invite-name-fields').hidden = false;
    document.getElementById('password-reset-link').hidden = true;
    message.innerHTML = '<strong>Einladung wird geprüft.</strong><span>Einen Moment bitte.</span>';
  }

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const showMessage = (title, text, isError = false) => {
    message.classList.toggle('auth-error', isError);
    message.innerHTML = '<strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(text) + '</span>';
    message.hidden = false;
  };

  const enableForm = () => {
    recoveryReady = true;
    form.hidden = false;
    message.hidden = true;
    password.focus();
  };

  CRAwerkSupabase.client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session) enableForm();
    if (inviteHint && session && ['SIGNED_IN','INITIAL_SESSION'].includes(event)) enableForm();
  });

  const checkSession = async () => {
    try {
      const { data, error } = await CRAwerkSupabase.client.auth.getSession();
      if (error) throw error;

      if (data.session && (recoveryHint || inviteHint)) {
        enableForm();
        return;
      }

      setTimeout(async () => {
        if (recoveryReady) return;
        const { data:retry } = await CRAwerkSupabase.client.auth.getSession();
        if (retry.session && (recoveryHint || inviteHint)) {
          enableForm();
        } else {
          showMessage(
            inviteHint ? 'Einladungslink ungültig oder abgelaufen.' : 'Recovery-Link ungültig oder abgelaufen.',
            inviteHint
              ? 'Bitten Sie einen Inhaber oder Admin Ihres Unternehmens, die Einladung erneut zu senden.'
              : 'Fordern Sie bitte einen neuen Passwort-Link an.',
            true
          );
        }
      }, 700);
    } catch (error) {
      console.error(error);
      showMessage(
        inviteHint ? 'Einladung konnte nicht geprüft werden.' : 'Recovery-Link konnte nicht geprüft werden.',
        inviteHint ? 'Bitten Sie um eine neue Einladung.' : 'Fordern Sie bitte einen neuen Link an.',
        true
      );
    }
  };

  checkSession();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!recoveryReady) return;

    if (password.value.length < 10) {
      password.setCustomValidity('Das Passwort muss mindestens 10 Zeichen lang sein.');
      password.reportValidity();
      return;
    }

    if (password.value !== confirm.value) {
      confirm.setCustomValidity('Die Passwörter stimmen nicht überein.');
      confirm.reportValidity();
      return;
    }

    password.setCustomValidity('');
    confirm.setCustomValidity('');
    submit.disabled = true;
    submit.textContent = 'Wird gespeichert…';

    try {
      const payload = {password:password.value};
      if (inviteHint) {
        payload.data = {
          first_name:document.getElementById('invite-first-name').value.trim(),
          last_name:document.getElementById('invite-last-name').value.trim()
        };
      }

      const { error } = await CRAwerkSupabase.client.auth.updateUser(payload);
      if (error) throw error;

      await CRAwerkSupabase.client.auth.signOut();
      location.replace(inviteHint ? 'login.html?invite=accepted' : 'login.html?password=updated');
    } catch (error) {
      console.error(error);
      showMessage(
        'Passwort konnte nicht geändert werden.',
        'Der Link ist möglicherweise abgelaufen. Fordern Sie bei Bedarf einen neuen an.',
        true
      );
      submit.disabled = false;
      submit.textContent = 'Passwort speichern';
    }
  });

  [password, confirm].forEach(input => input.addEventListener('input', () => {
    input.setCustomValidity('');
  }));
})();