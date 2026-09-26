(() => {
  const form = document.getElementById('register-form');
  const message = document.getElementById('register-message');
  const submit = form && form.querySelector('button[type="submit"]');
  if (!form || !message || !window.CRAwerkSupabase) return;

  const planOptions = {
    starter:{label:'Starter', price:'79 €', limit:'Bis zu 3 Produkte'},
    business:{label:'Business', price:'149 €', limit:'Bis zu 20 Produkte'},
    pro:{label:'Pro', price:'299 €', limit:'Unbegrenzt Produkte'}
  };
  const requestedPlan = new URLSearchParams(location.search).get('plan');
  const planCode = planOptions[requestedPlan] ? requestedPlan : 'starter';
  const selectedPlan = planOptions[planCode];

  const planLabel = document.getElementById('register-plan-label');
  const planPrice = document.getElementById('register-plan-price');
  const planLimit = document.getElementById('register-plan-limit');
  if (planLabel) planLabel.textContent = selectedPlan.label.toUpperCase();
  if (planPrice) planPrice.textContent = selectedPlan.price;
  if (planLimit) planLimit.textContent = selectedPlan.limit;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const showMessage = (title, text, isError = false, actionHtml = '') => {
    message.classList.toggle('auth-error', isError);
    message.innerHTML =
      '<strong>' + escapeHtml(title) + '</strong>' +
      '<span>' + escapeHtml(text) + '</span>' +
      actionHtml;
    message.hidden = false;
    message.scrollIntoView({behavior:'smooth', block:'nearest'});
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = document.getElementById('password');
    const repeat = document.getElementById('password-repeat');

    if (password.value !== repeat.value) {
      repeat.setCustomValidity('Die Passwörter stimmen nicht überein.');
      repeat.reportValidity();
      return;
    }

    repeat.setCustomValidity('');
    message.hidden = true;
    submit.disabled = true;
    submit.textContent = 'Konto wird angelegt…';

    try {
      const data = new FormData(form);
      const redirectUrl = new URL('login.html?confirmed=1', window.location.href).href;

      const { data: signUpData, error } = await CRAwerkSupabase.client.auth.signUp({
        email: data.get('email').trim(),
        password: data.get('password'),
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            company_name: data.get('company').trim(),
            first_name: data.get('firstName').trim(),
            last_name: data.get('lastName').trim(),
            plan_code: planCode,
            business_confirmed: data.get('businessCustomer') === 'on',
            terms_accepted: data.get('legalAccepted') === 'on',
            terms_version: '2026-09-26-v1',
            dpa_accepted: data.get('legalAccepted') === 'on',
            dpa_version: '2026-09-26-v1'
          }
        }
      });

      if (error) throw error;

      if (signUpData.session) {
        await CRAwerkSupabase.ensureCompany();
        location.href = 'dashboard.html';
        return;
      }

      form.reset();
      showMessage(
        'Fast geschafft.',
        'Wir haben Ihnen eine Bestätigungs-E-Mail geschickt. Bitte den Link darin öffnen und anschließend bei CRAwerk anmelden.',
        false,
        '<a class="button button-dark" href="login.html">Zur Anmeldung</a>'
      );
    } catch (error) {
      const text = /already registered|already been registered/i.test(error.message || '')
        ? 'Für diese E-Mail-Adresse gibt es bereits ein Konto. Bitte melden Sie sich an.'
        : 'Das Konto konnte nicht angelegt werden. Bitte prüfen Sie Ihre Angaben und versuchen Sie es erneut.';
      showMessage('Registrierung nicht möglich.', text, true);
    } finally {
      submit.disabled = false;
      submit.textContent = 'CRAwerk-Konto anlegen';
    }
  });

  document.getElementById('password-repeat').addEventListener('input', (event) => {
    event.target.setCustomValidity('');
  });
})();