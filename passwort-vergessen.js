(() => {
  const form = document.getElementById('password-reset-request-form');
  const message = document.getElementById('reset-message');
  const submit = document.getElementById('reset-submit');
  const emailInput = document.getElementById('reset-email');
  const RESET_URL = new URL('passwort-neu.html?recovery=1', window.location.href).href;

  if (!form || !window.CRAwerkSupabase) return;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const showMessage = (title, text, isError = false) => {
    message.classList.toggle('auth-error', isError);
    message.innerHTML = '<strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(text) + '</span>';
    message.hidden = false;
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Wird gesendet…';

    const email = emailInput.value.trim();

    try {
      const { error } = await CRAwerkSupabase.client.auth.resetPasswordForEmail(email, {
        redirectTo: RESET_URL
      });
      if (error) throw error;

      form.reset();
      showMessage(
        'E-Mail wurde angefordert.',
        'Wenn zu dieser Adresse ein CRAwerk-Konto existiert, erhalten Sie gleich einen Link zum Setzen eines neuen Passworts.'
      );
    } catch (error) {
      console.error(error);
      showMessage(
        'Reset-Link konnte gerade nicht angefordert werden.',
        'Bitte versuchen Sie es in einigen Minuten erneut.',
        true
      );
    } finally {
      submit.disabled = false;
      submit.textContent = 'Reset-Link senden';
    }
  });
})();