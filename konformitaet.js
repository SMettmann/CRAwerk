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

  const routeLabels = {
    unset:'Noch nicht festgelegt',
    module_a:'Interne Kontrolle (Modul A)',
    module_bc:'EU-Baumusterprüfung (Modul B) + Konformität mit dem EU-Baumuster (Modul C)',
    module_h:'Umfassende Qualitätssicherung (Modul H)',
    eu_certification:'Europäisches Cybersicherheitszertifizierungsschema'
  };

  const init = async () => {
    const session = await auth.requireSession();
    if (!session) return;

    const [machine, company, bundle] = await Promise.all([
      backend.loadMachine(id),
      backend.currentCompany(),
      backend.loadCraBundle(id)
    ]);

    if (!machine || !bundle.assessment) throw new Error('Fehlende Daten');
    const a = bundle.assessment;

    document.title = 'EU-Konformitätserklärung ' + machine.name + ' – CRAwerk';
    document.getElementById('declaration-back').href = 'cra.html?id=' + encodeURIComponent(machine.id);
    document.getElementById('declaration-name').textContent = machine.name;
    document.getElementById('declaration-identification').textContent =
      [machine.model, machine.productNumber ? 'Produktnummer ' + machine.productNumber : ''].filter(Boolean).join(' · ');

    document.getElementById('declaration-product').innerHTML =
      '<div class="report-process"><strong>' + escapeHtml(machine.name) + '</strong><p>' +
      escapeHtml([machine.model, machine.productNumber].filter(Boolean).join(' · ') || 'Keine weitere Kennzeichnung hinterlegt') +
      '</p><p>Zweckbestimmung: ' + escapeHtml(a.intendedPurpose || 'Noch nicht hinterlegt') + '</p></div>';

    const address = [company.street, [company.zip,company.city].filter(Boolean).join(' '), company.country].filter(Boolean);
    document.getElementById('declaration-manufacturer').innerHTML =
      '<div class="report-process"><strong>' + escapeHtml(company.name || '–') + '</strong><p>' +
      address.map(escapeHtml).join('<br>') + '</p></div>';

    document.getElementById('declaration-legislation').innerHTML =
      '<div class="report-process"><strong>Weitere einschlägige Unionsrechtsakte</strong><p>' +
      escapeHtml(a.otherUnionLegislation || 'Keine weiteren Angaben hinterlegt.') + '</p></div>';

    document.getElementById('declaration-standards').innerHTML =
      '<div class="report-process"><p>' + escapeHtml(a.appliedStandards || 'Noch nicht hinterlegt.') + '</p></div>';

    document.getElementById('declaration-route').innerHTML =
      '<div class="report-process"><strong>' + escapeHtml(routeLabels[a.conformityRoute] || a.conformityRoute) + '</strong>' +
      (a.notifiedBodyName || a.notifiedBodyNumber || a.certificateReference
        ? '<p>Notifizierte Stelle: ' + escapeHtml(a.notifiedBodyName || '–') +
          (a.notifiedBodyNumber ? ' · Kennnummer ' + escapeHtml(a.notifiedBodyNumber) : '') +
          (a.certificateReference ? '<br>Zertifikat / Referenz: ' + escapeHtml(a.certificateReference) : '') + '</p>'
        : '<p>Keine notifizierte Stelle hinterlegt.</p>') +
      '</div>';

    const signature = [
      ['Ausgestellt in', a.declarationPlace || '–'],
      ['Datum', formatDate(a.declarationDate)],
      ['Name', a.declarationSigner || '–'],
      ['Funktion', a.declarationFunction || '–']
    ];
    document.getElementById('declaration-signature').innerHTML = signature.map(([label,value]) =>
      '<div class="report-data"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>'
    ).join('');

    const status = a.euDeclarationStatus === 'signed'
      ? 'Status: unterzeichnet'
      : a.euDeclarationStatus === 'prepared' ? 'Status: vorbereitet' : 'Status: offen';
    document.getElementById('declaration-status').textContent = status;
    document.getElementById('declaration-print').addEventListener('click', () => window.print());
  };

  init().catch(error => {
    console.error(error);
    document.getElementById('declaration-sheet').hidden = true;
    document.getElementById('declaration-error').hidden = false;
  });
})();