(() => {
  const form = document.getElementById('login-form');
  const message = document.getElementById('login-message');
  const submit = document.getElementById('login-submit');
  if (!form || !window.CRAwerkSupabase) return;

  const showMessage = (title, text, isError = false) => {
    message.classList.toggle('auth-error', isError);
    message.innerHTML = '<strong>' + title + '</strong><span>' + text + '</span>';
    message.hidden = false;
  };

  const params = new URLSearchParams(location.search);
  if (params.get('confirmed') === '1') {
    showMessage('E-Mail bestätigt.', 'Sie können sich jetzt anmelden.');
  }

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
        ? 'Bitte bestätigen Sie zuerst die E-Mail, die Supabase an Sie gesendet hat.'
        : 'Anmeldung nicht möglich. Bitte E-Mail-Adresse und Passwort prüfen.';
      showMessage('Anmeldung fehlgeschlagen.', text, true);
      submit.disabled = false;
      submit.textContent = 'Anmelden';
    }
  });
})();