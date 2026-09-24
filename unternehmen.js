(() => {
  const COMPANY_KEY = 'crawerk_company_v1';

  const readCompany = () => {
    try {
      return JSON.parse(localStorage.getItem(COMPANY_KEY) || '{}');
    } catch {
      return {};
    }
  };

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

  const fill = () => {
    const company = readCompany();

    form.elements.name.value = company.name || '';
    form.elements.street.value = company.street || '';
    form.elements.zip.value = company.zip || '';
    form.elements.city.value = company.city || '';
    form.elements.country.value = company.country || 'Deutschland';
    form.elements.contactName.value = company.contactName || '';
    form.elements.email.value = company.email || '';
    form.elements.phone.value = company.phone || '';

    if (company.name) {
      headerName.textContent = company.name;
      saveState.textContent = 'Firmendaten gespeichert';
    } else {
      headerName.textContent = 'Unternehmen';
      saveState.textContent = 'Noch nicht gespeichert';
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(form);

    const company = {
      name: data.get('name').trim(),
      street: data.get('street').trim(),
      zip: data.get('zip').trim(),
      city: data.get('city').trim(),
      country: data.get('country').trim() || 'Deutschland',
      contactName: data.get('contactName').trim(),
      email: data.get('email').trim(),
      phone: data.get('phone').trim(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem(COMPANY_KEY, JSON.stringify(company));
    fill();
    showToast('Firmendaten wurden gespeichert.');
  });

  fill();
})();