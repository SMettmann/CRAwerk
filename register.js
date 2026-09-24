(() => {
  const form = document.getElementById('register-form');
  const message = document.getElementById('register-message');
  if (!form || !message) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const password = document.getElementById('password');
    const repeat = document.getElementById('password-repeat');

    if (password.value !== repeat.value) {
      repeat.setCustomValidity('Die Passwörter stimmen nicht überein.');
      repeat.reportValidity();
      return;
    }

    repeat.setCustomValidity('');
    message.hidden = false;
    message.scrollIntoView({behavior:'smooth', block:'nearest'});
  });

  document.getElementById('password-repeat').addEventListener('input', (event) => {
    event.target.setCustomValidity('');
  });
})();