(() => {
  const form = document.getElementById('company-form');
  const saveState = document.getElementById('company-save-state');
  const headerName = document.getElementById('company-header-name');
  const toast = document.getElementById('company-toast');

  const showToast = (message) => {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(window.__companyToast);
    window.__companyToast = setTimeout(() => toast.hidden = true, 2600);
  };

  const mapCompany = company => ({
    name:company.name || '',
    street:company.street || '',
    zip:company.zip || '',
    city:company.city || '',
    country:company.country || 'Deutschland',
    contactName:company.contact_name || '',
    email:company.email || '',
    phone:company.phone || ''
  });

  const fill = company => {
    const value = mapCompany(company);
    form.elements.name.value = value.name;
    form.elements.street.value = value.street;
    form.elements.zip.value = value.zip;
    form.elements.city.value = value.city;
    form.elements.country.value = value.country;
    form.elements.contactName.value = value.contactName;
    form.elements.email.value = value.email;
    form.elements.phone.value = value.phone;
    headerName.textContent = value.name || 'Unternehmen';
    saveState.textContent = 'Firmendaten gespeichert';
  };

  const init = async () => {
    try {
      const session = await CRAwerkSupabase.requireSession();
      if (!session) return;
      const [company, systemAdmin] = await Promise.all([
        CRAwerkBackend.currentCompany(),
        CRAwerkBackend.isSystemAdmin()
      ]);
      fill(company);
      if (systemAdmin) {
        document.querySelectorAll('[data-system-admin-link]').forEach(link => link.hidden = false);
      }
    } catch (error) {
      console.error(error);
      showToast('Firmendaten konnten nicht geladen werden.');
    }
  };

  document.getElementById('logout-button').addEventListener('click', async () => {
    try {
      await CRAwerkSupabase.client.auth.signOut();
      location.href = 'login.html';
    } catch (error) {
      console.error(error);
      showToast('Abmelden war nicht möglich.');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Speichert…';

    try {
      const company = await CRAwerkBackend.updateCompany({
        name:data.get('name').trim(),
        street:data.get('street').trim(),
        zip:data.get('zip').trim(),
        city:data.get('city').trim(),
        country:data.get('country').trim() || 'Deutschland',
        contactName:data.get('contactName').trim(),
        email:data.get('email').trim(),
        phone:data.get('phone').trim()
      });
      fill(company);
      showToast('Firmendaten wurden gespeichert.');
    } catch (error) {
      console.error(error);
      showToast('Firmendaten konnten nicht gespeichert werden.');
    } finally {
      button.disabled = false;
      button.textContent = 'Firmendaten speichern';
    }
  });

  init();
})();