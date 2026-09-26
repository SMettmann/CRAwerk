(() => {
  const form = document.getElementById('new-password-form');
  const message = document.getElementById('new-password-message');
  const submit = document.getElementById('new-password-submit');
  const password = document.getElementById('new-password');
  const confirm = document.getElementById('new-password-confirm');

  if (!form || !window.CRAwerkSupabase) return;

  let recoveryReady = false;

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

  const params = new URLSearchParams(location.search);
  const recoveryHint =
    params.get('recovery') === '1' ||
    location.hash.includes('type=recovery') ||
    params.get('type') === 'recovery';

  CRAwerkSupabase.client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' && session) enableForm();
  });

  const checkSession = async () => {
    try {
      const { data, error } = await CRAwerkSupabase.client.auth.getSession();
      if (error) throw error;

      if (data.session && recoveryHint) {
        enableForm();
        return;
      }

      setTimeout(async () => {
        if (recoveryReady) return;
        const { data:retry } = await CRAwerkSupabase.client.auth.getSession();
        if (retry.session && recoveryHint) {
          enableForm();
        } else {
          showMessage(
            'Recovery-Link ungültig oder abgelaufen.',
            'Fordern Sie bitte einen neuen Passwort-Link an.',
            true
          );
        }
      }, 700);
    } catch (error) {
      console.error(error);
      showMessage('Recovery-Link konnte nicht geprüft werden.', 'Fordern Sie bitte einen neuen Link an.', true);
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
      const { error } = await CRAwerkSupabase.client.auth.updateUser({
        password:password.value
      });
      if (error) throw error;

      await CRAwerkSupabase.client.auth.signOut();
      location.replace('login.html?password=updated');
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