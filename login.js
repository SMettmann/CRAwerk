(() => {
  const form = document.getElementById('login-form');
  const message = document.getElementById('login-message');
  const submit = document.getElementById('login-submit');
  const resend = document.getElementById('resend-confirmation');
  const emailInput = document.getElementById('login-email');
  const PUBLIC_LOGIN_URL = new URL('login.html?confirmed=1', window.location.href).href;

  if (!form || !window.CRAwerkSupabase) return;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const showMessage = (title, text, isError = false) => {
    message.classList.toggle('auth-error', isError);
    message.innerHTML = '<strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(text) + '</span>';
    message.hidden = false;
  };

  const params = new URLSearchParams(location.search);

  const finishExistingConfirmation = async () => {
    try {
      const { data } = await CRAwerkSupabase.client.auth.getSession();
      if (!data.session) return false;

      await CRAwerkSupabase.ensureCompany();
      location.replace('dashboard.html');
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  finishExistingConfirmation().then(alreadySignedIn => {
    if (alreadySignedIn) return;
    if (params.get('password') === 'updated') {
      showMessage('Passwort geändert.', 'Sie können sich jetzt mit Ihrem neuen Passwort anmelden.');
      return;
    }
    if (params.get('confirmed') === '1') {
      showMessage('E-Mail bestätigt.', 'Sie können sich jetzt anmelden.');
    }
  });

  resend.addEventListener('click', async () => {
    const email = emailInput.value.trim();

    if (!email) {
      emailInput.focus();
      emailInput.setCustomValidity('Bitte zuerst Ihre E-Mail-Adresse eingeben.');
      emailInput.reportValidity();
      return;
    }

    emailInput.setCustomValidity('');
    resend.disabled = true;
    resend.textContent = 'Wird gesendet…';

    try {
      const { error } = await CRAwerkSupabase.client.auth.resend({
        type:'signup',
        email,
        options:{
          emailRedirectTo:PUBLIC_LOGIN_URL
        }
      });

      if (error) throw error;

      showMessage(
        'Neuer Bestätigungslink gesendet.',
        'Bitte verwenden Sie nur die neue E-Mail. Der Link führt jetzt zur öffentlichen CRAwerk-Seite.'
      );
    } catch (error) {
      console.error(error);
      showMessage(
        'Link konnte nicht gesendet werden.',
        'Bitte prüfen Sie die E-Mail-Adresse und versuchen Sie es erneut.',
        true
      );
    } finally {
      resend.disabled = false;
      resend.textContent = 'Bestätigungslink erneut senden';
    }
  });

  emailInput.addEventListener('input', () => {
    emailInput.setCustomValidity('');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Anmeldung läuft…';

    try {
      const data = new FormData(form);
      const { error } = await CRAwerkSupabase.client.auth.signInWithPassword({
        email: data.get('email').trim(),
        password: data.get('password')
      });

      if (error) throw error;

      await CRAwerkSupabase.ensureCompany();

      const next = params.get('next');
      location.href = next && !next.includes('://') ? next : 'dashboard.html';
    } catch (error) {
      const text = /email not confirmed/i.test(error.message || '')
        ? 'Ihre E-Mail ist noch nicht bestätigt. Geben Sie oben Ihre E-Mail ein und wählen Sie „Bestätigungslink erneut senden“.'
        : 'Anmeldung nicht möglich. Bitte E-Mail-Adresse und Passwort prüfen.';
      showMessage('Anmeldung fehlgeschlagen.', text, true);
      submit.disabled = false;
      submit.textContent = 'Anmelden';
    }
  });
})();