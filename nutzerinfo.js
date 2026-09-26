(() => {
  const auth = window.CRAwerkSupabase;
  const backend = window.CRAwerkBackend;
  const id = new URLSearchParams(location.search).get('id');

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const formatDate = value => {
    if (!value) return '–';
    const parts = String(value).split('-');
    return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : value;
  };

  const block = (title, value) =>
    '<div class="report-item"><div><strong>' + escapeHtml(title) + '</strong><span>' +
    escapeHtml(value || 'Noch nicht hinterlegt') + '</span></div></div>';

  const renderCompanyLogo = async company => {
    if (!company?.logo_path) return;
    const image = document.getElementById('user-info-company-logo');
    if (!image) return;
    try {
      image.src = await CRAwerkBackend.companyLogoSignedUrl(company.logo_path, 3600);
      image.hidden = false;
    } catch (error) {
      console.warn('Firmenlogo konnte nicht geladen werden.', error);
    }
  };

  const init = async () => {
    const session = await auth.requireSession();
    if (!session) return;

    const [machine, company, bundle] = await Promise.all([
      backend.loadMachine(id),
      backend.currentCompany(),
      backend.loadCraBundle(id)
    ]);

    if (!machine || !bundle.assessment) throw new Error('Fehlende CRA-Daten');
    await renderCompanyLogo(company);
    const a = bundle.assessment;

    const generated = new Intl.DateTimeFormat('de-DE', {
      day:'2-digit', month:'2-digit', year:'numeric'
    }).format(new Date());

    document.title = 'Nutzerinformationen ' + machine.name + ' – CRAwerk';
    document.getElementById('user-info-back').href = 'cra.html?id=' + encodeURIComponent(machine.id);
    document.getElementById('user-info-generated').textContent = 'Stand: ' + generated;
    document.getElementById('user-info-name').textContent = machine.name;
    document.getElementById('user-info-identification').textContent =
      [machine.model, machine.productNumber ? 'Produktnummer ' + machine.productNumber : ''].filter(Boolean).join(' · ');
    document.getElementById('user-info-footer').textContent = machine.name + ' · Stand ' + generated;

    const address = [
      company.street,
      [company.zip, company.city].filter(Boolean).join(' '),
      company.country
    ].filter(Boolean);

    document.getElementById('user-info-manufacturer').innerHTML =
      '<div class="report-process"><strong>' + escapeHtml(company.name || '–') + '</strong>' +
      '<p>' + address.map(escapeHtml).join('<br>') +
      (company.email ? '<br>E-Mail: ' + escapeHtml(company.email) : '') +
      (company.phone ? '<br>Telefon: ' + escapeHtml(company.phone) : '') +
      '</p></div>';

    document.getElementById('user-info-vulnerability').innerHTML =
      '<div class="report-process"><span>Zentrale Kontaktstelle</span><strong>' +
      escapeHtml(a.vulnerabilityContact || '–') + '</strong>' +
      '<p><strong>CVD-Richtlinie:</strong> ' + escapeHtml(a.cvdPolicyLocation || '–') + '</p></div>';

    const productRows = [
      ['Produktidentifikation', [machine.name, machine.model, machine.productNumber].filter(Boolean).join(' · ')],
      ['Zweckbestimmung', a.intendedPurpose],
      ['Sicherheitsumgebung', a.securityEnvironment],
      ['Wesentliche Funktionen & Sicherheitseigenschaften', a.securityProperties],
      ['Bekannte / vorhersehbare Fehlanwendung mit erheblichem Cyberrisiko', a.foreseeableMisuse]
    ];
    document.getElementById('user-info-product').innerHTML = productRows.map(([label,value]) =>
      '<div class="report-data"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value || '–') + '</dd></div>'
    ).join('');

    const supportDisclosureLabels = {
      product:'Auf dem Produkt',
      packaging:'Auf der Verpackung',
      digital:'Digital',
      sales_document:'Angebot / Vertrag / Verkaufsunterlage',
      other:'Sonstiger leicht zugänglicher Ort'
    };
    const support = machine.supportPeriod || {};
    const supportRows = [
      ['EU-Konformitätserklärung', a.declarationUrl || 'Kein Online-Zugriff hinterlegt'],
      ['Art des technischen Sicherheitssupports', a.supportType || '–'],
      ['Unterstützungszeitraum bis', formatDate(support.endDate)],
      ['Supportende beim Kauf angegeben über', supportDisclosureLabels[support.purchaseDisclosureMethod] || '–'],
      ['Konkreter Ort / Verweis', support.purchaseDisclosureLocation || '–'],
      ['Mitteilung beim Erreichen des Supportendes',
        support.endNotificationFeasible === 'yes'
          ? (support.endNotificationMethod || 'Geplant, Kommunikationsweg noch offen')
          : support.endNotificationFeasible === 'no'
            ? 'Technisch nicht machbar: ' + (support.endNotificationNotFeasibleReason || 'Begründung offen')
            : 'Noch ungeklärt'
      ],
      ['Supportende bereits kommuniziert',
        support.endNotificationAt
          ? formatDate(String(support.endNotificationAt).slice(0,10)) +
            (support.endNotificationReference ? ' · Nachweis: ' + support.endNotificationReference : '')
          : 'Noch nicht'
      ]
    ];
    document.getElementById('user-info-support').innerHTML = supportRows.map(([label,value]) =>
      '<div class="report-data"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>'
    ).join('');

    const instructions = [
      ['Sichere Erstinbetriebnahme und sichere Nutzung', a.secureCommissioning],
      ['Auswirkungen von Änderungen auf die Sicherheit', a.securityChangeEffects],
      ['Installation sicherheitsrelevanter Updates', a.updateInstallation],
      ['Sichere Außerbetriebnahme und Entfernung von Nutzerdaten', a.secureDecommissioning],
      ['Automatische Sicherheitsupdates / Opt-out', a.automaticUpdatesOptOut],
      ['Informationen für Integratoren', a.integratorInformation]
    ];
    document.getElementById('user-info-instructions').innerHTML =
      instructions.map(([title,value]) => block(title,value)).join('');

    document.getElementById('user-info-print').addEventListener('click', () => window.print());
  };

  init().catch(error => {
    console.error(error);
    document.getElementById('user-info-sheet').hidden = true;
    document.getElementById('user-info-error').hidden = false;
  });
})();