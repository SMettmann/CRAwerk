(() => {
  const form = document.getElementById('company-form');
  const saveState = document.getElementById('company-save-state');
  const headerName = document.getElementById('company-header-name');
  const toast = document.getElementById('company-toast');
  const logoImage = document.getElementById('company-logo-image');
  const logoEmpty = document.getElementById('company-logo-empty');
  const logoInput = document.getElementById('company-logo-input');
  const logoUpload = document.getElementById('company-logo-upload');
  const logoDelete = document.getElementById('company-logo-delete');

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

  const renderLogo = async company => {
    const hasLogo = Boolean(company?.logo_path);
    logoDelete.hidden = !hasLogo;
    logoUpload.textContent = hasLogo ? 'Logo ersetzen' : 'Logo hochladen';
    logoImage.hidden = true;
    logoImage.removeAttribute('src');
    logoEmpty.hidden = false;
    logoEmpty.textContent = hasLogo ? 'Logo wird geladen…' : 'Noch kein Logo hinterlegt';

    if (!hasLogo) return;

    try {
      const url = await CRAwerkBackend.companyLogoSignedUrl(company.logo_path);
      logoImage.onload = () => {
        logoImage.hidden = false;
        logoEmpty.hidden = true;
      };
      logoImage.onerror = () => {
        logoImage.hidden = true;
        logoEmpty.hidden = false;
        logoEmpty.textContent = 'Logo konnte nicht geladen werden';
      };
      logoImage.src = url;
    } catch (error) {
      console.error(error);
      logoEmpty.textContent = 'Logo konnte nicht geladen werden';
    }
  };

  const init = async () => {
    try {
      const session = await CRAwerkSupabase.requireSession();
      if (!session) return;
      const [company, systemAdmin, membership] = await Promise.all([
        CRAwerkBackend.currentCompany(),
        CRAwerkBackend.isSystemAdmin(),
        CRAwerkSupabase.currentMembership()
      ]);
      const canManageCompany = ['owner','admin'].includes(membership.role);

      fill(company);
      await renderLogo(company);

      if (!canManageCompany) {
        [...form.elements].forEach(element => {
          if (element.matches('input, select, textarea, button')) element.disabled = true;
        });
        const submit = form.querySelector('button[type="submit"]');
        if (submit) submit.hidden = true;
        saveState.textContent = 'Nur Inhaber oder Admins können Firmendaten ändern.';
        logoUpload.hidden = true;
        logoDelete.hidden = true;
        const billingCard = document.querySelector('a[href="zugang.html"]')?.closest('.side-card');
        if (billingCard) billingCard.hidden = true;
      }
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

  logoUpload.addEventListener('click', () => logoInput.click());

  logoInput.addEventListener('change', async () => {
    const file = logoInput.files?.[0];
    if (!file) return;

    logoUpload.disabled = true;
    logoUpload.textContent = 'Wird hochgeladen…';

    try {
      const company = await CRAwerkBackend.uploadCompanyLogo(file);
      await renderLogo(company);
      showToast('Firmenlogo wurde gespeichert.');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'Logo konnte nicht hochgeladen werden.');
      try {
        await renderLogo(await CRAwerkBackend.currentCompany());
      } catch (_) {}
    } finally {
      logoInput.value = '';
      logoUpload.disabled = false;
    }
  });

  logoDelete.addEventListener('click', async () => {
    if (!confirm('Firmenlogo wirklich löschen?')) return;

    logoDelete.disabled = true;
    try {
      const company = await CRAwerkBackend.deleteCompanyLogo();
      await renderLogo(company);
      showToast('Firmenlogo wurde gelöscht.');
    } catch (error) {
      console.error(error);
      showToast('Logo konnte nicht gelöscht werden.');
    } finally {
      logoDelete.disabled = false;
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