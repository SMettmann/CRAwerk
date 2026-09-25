(() => {
  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const formatDate = value => {
    if (!value) return '–';
    const parts = String(value).split('-');
    return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : value;
  };

  const yesNo = value => value === 'yes' ? 'Ja' : value === 'no' ? 'Nein' : 'Unklar';

  const requirementDocumented = item =>
    item.status !== 'open' &&
    (item.status !== 'not_applicable' || Boolean(item.justification)) &&
    (item.status !== 'fulfilled' || Boolean(item.justification || item.evidence));

  const craCompleteForMachine = machine => {
    const a = machine.craAssessment;
    if (!a) return false;
    const requirements = machine.craRequirements || [];
    const reporting = machine.craReportingEvents || [];
    const requirementsComplete = requirements.length >= 22 && requirements.every(requirementDocumented);
    const classCategoryReady = a.classification === 'standard' || Boolean(a.classificationCategory);
    const routeDetailsReady =
      a.conformityRoute === 'module_a' ? true :
      ['module_bc','module_h'].includes(a.conformityRoute)
        ? Boolean(a.notifiedBodyName && a.notifiedBodyNumber && a.certificateReference)
        : a.conformityRoute === 'eu_certification'
          ? Boolean(a.certificateReference)
          : false;
    const declarationReady = Boolean(
      a.euDeclarationStatus === 'signed' &&
      a.declarationPlace && a.declarationDate && a.declarationSigner && a.declarationFunction &&
      a.declarationSignedCopyReference
    );
    const ceReady = Boolean(a.ceStatus === 'marked' && a.ceMarkingLocation);
    const routeValid =
      a.classification !== 'unset' &&
      a.conformityRoute !== 'unset' &&
      !(a.classification === 'important_i' && a.conformityRoute === 'module_a' && a.standardsCoverage !== 'full') &&
      !(['important_ii','critical'].includes(a.classification) && a.conformityRoute === 'module_a');
    const userInfo = Boolean(
      a.secureCommissioning && a.securityChangeEffects && a.updateInstallation &&
      a.secureDecommissioning && a.automaticUpdatesOptOut && a.supportType
    );
    const annexViiReady = Boolean(
      a.intendedPurpose && a.securityEnvironment && a.securityProperties &&
      a.foreseeableMisuse && a.hardwareVisualsReference && userInfo &&
      a.architectureDescription && a.productionMonitoringProcess &&
      a.vulnerabilityContact && a.cvdPolicy && a.secureUpdateDistribution &&
      machine.riskReviewComplete &&
      machine.supportPeriod.startDate && machine.supportPeriod.endDate &&
      machine.supportPeriod.owner && machine.supportPeriod.reason &&
      a.appliedStandards && a.testReportsSummary &&
      (machine.software === 'no' || (machine.softwareComplete && machine.softwareItems.length))
    );
    return Boolean(
      routeValid && classCategoryReady && routeDetailsReady &&
      a.classificationReason && requirementsComplete && annexViiReady &&
      ceReady && declarationReady &&
      reporting.every(item => item.status === 'closed')
    );
  };

  const tasksForMachine = machine => {
    const processReady = Boolean(machine.updateProcess.owner && machine.updateProcess.procedure);
    const noOpenUpdates = machine.updateItems.every(item => item.status === 'done');
    const noOpenRisks = machine.riskItems.every(item => item.status === 'done');
    const supportReady = Boolean(machine.supportPeriod.startDate && machine.supportPeriod.endDate && machine.supportPeriod.owner && machine.supportPeriod.reason);
    return [
      {title:'Grunddaten prüfen', text:'Name, Modell und Verantwortlichkeit kontrollieren.', done:true},
      {title:'Software & Versionen vollständig erfassen', text:'Alle Software- und Firmwarestände erfassen und die Liste als vollständig bestätigen.', done:machine.software === 'no' || machine.softwareComplete},
      {title:'Digitale Bauteile & Zulieferer vollständig erfassen', text:'Digitale Bauteile erfassen und die Liste anschließend als vollständig bestätigen.', done:machine.componentsComplete},
      {title:'Risikoprüfung abschließen', text:'Risiken prüfen, offene Maßnahmen erledigen und die Prüfung anschließend abschließen.', done:machine.riskReviewComplete && noOpenRisks},
      {title:'Sicherheitslücken & Updates bearbeiten', text:'Internen Ablauf festlegen und bekannte Sicherheitsprobleme bis zur Erledigung nachverfolgen.', done:processReady && noOpenUpdates},
      {title:'Unterlagen & Nachweise zusammenstellen', text:'Vorhandene Unterlagen der Maschine zuordnen und den Stand als vollständig bestätigen.', done:machine.documentsComplete},
      {title:'Unterstützungszeitraum festlegen', text:'Festhalten, wie lange die Maschine sicherheitsbezogen unterstützt wird.', done:supportReady},
      {title:'CRA-Prüfung & Konformitätsabschluss', text:'Einstufung, Anhang I, technische Dokumentation, Meldeprozess sowie EU-Erklärung und CE abschließen.', done:craCompleteForMachine(machine)}
    ];
  };

  const init = async () => {
    const session = await CRAwerkSupabase.requireSession();
    if (!session) return;

    const id = new URLSearchParams(location.search).get('id');
    const [machine, company] = await Promise.all([
      CRAwerkBackend.loadMachine(id),
      CRAwerkBackend.currentCompany()
    ]);

    if (!machine) {
      document.getElementById('report-sheet').hidden = true;
      document.getElementById('report-error').hidden = false;
      return;
    }

    const tasks = tasksForMachine(machine);
    const progress = Math.round(tasks.filter(task => task.done).length / tasks.length * 100);
    const generated = new Intl.DateTimeFormat('de-DE', {
      day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
    }).format(new Date());

    document.title = 'Produktakte ' + machine.name + ' – CRAwerk';
    document.getElementById('report-revision').textContent = 'Revision ' + machine.documentRevision;
    document.getElementById('report-generated').textContent = 'Stand: ' + generated;
    document.getElementById('report-name').textContent = machine.name;
    document.getElementById('report-subtitle').textContent =
      [machine.model, machine.productNumber ? 'Produktnummer ' + machine.productNumber : ''].filter(Boolean).join(' · ') || 'CRAwerk Produktakte';
    document.getElementById('report-progress').textContent = progress + '%';
    document.getElementById('report-progress-bar').style.width = progress + '%';
    document.getElementById('report-footer-machine').textContent =
      machine.name + ' · Revision ' + machine.documentRevision + ' · Stand ' + generated;
    document.getElementById('report-back').href = 'maschine.html?id=' + encodeURIComponent(machine.id);
    document.getElementById('report-short').href = 'kurzakte.html?id=' + encodeURIComponent(machine.id);

    const companyLines = [
      company.street,
      [company.zip, company.city].filter(Boolean).join(' '),
      company.country
    ].filter(Boolean);
    const contactLines = [
      company.contact_name ? 'Ansprechpartner: ' + company.contact_name : '',
      company.email,
      company.phone
    ].filter(Boolean);

    document.getElementById('report-company').innerHTML =
      '<div class="report-company-main"><span class="report-kicker">UNTERNEHMEN</span><strong>' +
      escapeHtml(company.name) + '</strong>' +
      (companyLines.length ? '<p>' + companyLines.map(escapeHtml).join('<br>') + '</p>' : '') +
      '</div><div class="report-company-contact">' +
      (contactLines.length ? contactLines.map(line => '<span>' + escapeHtml(line) + '</span>').join('') : '<span>Keine Kontaktdaten hinterlegt</span>') +
      '</div>';

    const basicData = [
      ['Maschine', machine.name],
      ['Modell / Baureihe', machine.model || '–'],
      ['Produktnummer', machine.productNumber || '–'],
      ['Verantwortlich', machine.owner || '–'],
      ['Software / Firmware', yesNo(machine.software)],
      ['Netzwerk / Fernwartung', yesNo(machine.connected)]
    ];
    document.getElementById('report-basic').innerHTML = basicData.map(([label,value]) =>
      '<div class="report-data"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>'
    ).join('');

    document.getElementById('report-tasks').innerHTML =
      '<div class="report-list">' + tasks.map(task =>
        '<div class="report-item"><div><strong>' + escapeHtml(task.title) + '</strong><span>' +
        escapeHtml(task.text) + '</span></div><span class="report-badge ' + (task.done ? '' : 'open') + '">' +
        (task.done ? 'Erledigt' : 'Offen') + '</span></div>'
      ).join('') + '</div>';

    document.getElementById('report-software').innerHTML = machine.softwareItems.length
      ? machine.softwareItems.map(item =>
          '<div class="report-item"><div><strong>' + escapeHtml(item.name) + '</strong><span>' +
          escapeHtml(item.type || 'Software') + (item.version ? ' · Version ' + escapeHtml(item.version) : '') +
          (item.vendor ? ' · ' + escapeHtml(item.vendor) : '') +
          (item.purl ? ' · ' + escapeHtml(item.purl) : '') + '</span></div></div>'
        ).join('')
      : '<div class="report-empty">' + (machine.software === 'no' ? 'Für diese Maschine wurde keine Software/Firmware angegeben.' : 'Keine Software erfasst.') + '</div>';

    document.getElementById('report-components').innerHTML = machine.components.length
      ? machine.components.map(item =>
          '<div class="report-item"><div><strong>' + escapeHtml(item.name) + '</strong><span>' +
          escapeHtml(item.vendor || 'Hersteller offen') + (item.model ? ' · ' + escapeHtml(item.model) : '') +
          (item.version ? ' · Version ' + escapeHtml(item.version) : '') +
          ' · Unterlagen: ' + (item.documents === 'yes' ? 'Ja' : item.documents === 'no' ? 'Nein' : 'Unklar') +
          '</span></div></div>'
        ).join('')
      : '<div class="report-empty">Keine digitalen Bauteile erfasst.</div>';

    document.getElementById('report-risks').innerHTML = machine.riskItems.length
      ? machine.riskItems.map(item =>
          '<div class="report-item"><div><strong>' + escapeHtml(item.topic) + '</strong><span>' +
          escapeHtml(item.level || 'Ohne Einschätzung') + (item.owner ? ' · Verantwortlich: ' + escapeHtml(item.owner) : '') +
          '</span><p>' + escapeHtml(item.measure || '') + '</p></div><span class="report-badge ' +
          (item.status === 'done' ? '' : 'open') + '">' + (item.status === 'done' ? 'Erledigt' : 'Offen') + '</span></div>'
        ).join('')
      : '<div class="report-empty">Keine Risiken oder Aufgaben erfasst.</div>';

    const processReady = machine.updateProcess.owner && machine.updateProcess.procedure;
    document.getElementById('report-update-process').innerHTML = processReady
      ? '<div class="report-process"><span>Interner Ablauf</span><strong>' +
        escapeHtml(machine.updateProcess.owner) + '</strong><p>' + escapeHtml(machine.updateProcess.procedure) + '</p></div>'
      : '<div class="report-empty">Kein interner Ablauf für Sicherheitslücken und Updates festgelegt.</div>';

    document.getElementById('report-updates').innerHTML = machine.updateItems.length
      ? machine.updateItems.map(item =>
          '<div class="report-item"><div><strong>' + escapeHtml(item.title) + '</strong><span>' +
          (item.date ? 'Bekannt seit ' + formatDate(item.date) : 'Datum offen') +
          (item.affected ? ' · Betroffen: ' + escapeHtml(item.affected) : '') +
          '</span><p>' +
          (item.assessment ? '<strong>Bewertung:</strong> ' + escapeHtml(item.assessment) + '<br>' : '') +
          '<strong>Maßnahme:</strong> ' + escapeHtml(item.action || '') +
          (item.patchVersion ? '<br><strong>Patch / Zielversion:</strong> ' + escapeHtml(item.patchVersion) : '') +
          (item.remediatedAt ? '<br><strong>Behoben am:</strong> ' + escapeHtml(formatDate(item.remediatedAt)) : '') +
          '</p></div><span class="report-badge ' +
          (item.status === 'done' ? '' : 'open') + '">' + (item.status === 'done' ? 'Erledigt' : 'Offen') + '</span></div>'
        ).join('')
      : '<div class="report-empty">Kein Sicherheitsproblem dokumentiert.</div>';

    document.getElementById('report-documents-status').textContent =
      'Vollständigkeit: ' + (machine.documentsComplete ? 'vom Nutzer bestätigt' : 'noch nicht bestätigt');

    document.getElementById('report-documents').innerHTML = machine.documentItems.length
      ? machine.documentItems.map(item =>
          '<div class="report-item"><div><strong>' + escapeHtml(item.title) + '</strong><span>' +
          escapeHtml(item.type || 'Unterlage') + ' · ' + escapeHtml(item.related || 'Gesamtmaschine') +
          (item.date ? ' · Stand ' + formatDate(item.date) : '') + '</span>' +
          (item.note ? '<p>' + escapeHtml(item.note) + '</p>' : '') + '</div></div>'
        ).join('')
      : '<div class="report-empty">Keine Unterlagen erfasst.</div>';

    const support = machine.supportPeriod;
    const supportReady = support.startDate && support.endDate && support.owner;
    document.getElementById('report-support').innerHTML = supportReady
      ? '<div class="report-support"><div class="report-support-grid">' +
        '<div><span>Beginn</span><strong>' + formatDate(support.startDate) + '</strong></div>' +
        '<div><span>Geplantes Ende</span><strong>' + formatDate(support.endDate) + '</strong></div>' +
        '<div><span>Verantwortlich</span><strong>' + escapeHtml(support.owner) + '</strong></div></div>' +
        (support.reason ? '<p>' + escapeHtml(support.reason) + '</p>' : '') + '</div>'
      : '<div class="report-empty">Kein Unterstützungszeitraum festgelegt.</div>';


    const classificationLabels = {
      unset:'Noch nicht festgelegt',
      standard:'Standardprodukt',
      important_i:'Wichtiges Produkt · Klasse I',
      important_ii:'Wichtiges Produkt · Klasse II',
      critical:'Kritisches Produkt'
    };
    const routeLabels = {
      unset:'Noch nicht festgelegt',
      module_a:'Interne Kontrolle · Modul A',
      module_bc:'EU-Baumusterprüfung B + interne Fertigungskontrolle C',
      module_h:'Umfassende Qualitätssicherung · Modul H',
      eu_certification:'Europäisches Cybersicherheitszertifizierungsschema'
    };

    const a = machine.craAssessment;
    document.getElementById('report-cra-classification').innerHTML = a
      ? '<dl class="report-data-grid">' +
          [
            ['Einstufung', classificationLabels[a.classification] || a.classification],
            ['Kategorie / Kernfunktion', a.classificationCategory || '–'],
            ['Begründung', a.classificationReason || '–'],
            ['Konformitätsverfahren', routeLabels[a.conformityRoute] || a.conformityRoute],
            ['Normenabdeckung', a.standardsCoverage || '–']
          ].map(([label,value]) =>
            '<div class="report-data"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>'
          ).join('') + '</dl>'
      : '<div class="report-empty">CRA-Einstufung noch nicht dokumentiert.</div>';

    const reqLabels = {
      'I-1':'Angemessenes Cybersicherheitsniveau',
      'I-2a':'Keine bekannten ausnutzbaren Schwachstellen',
      'I-2b':'Sichere Standardkonfiguration',
      'I-2c':'Sicherheitsaktualisierungen',
      'I-2d':'Schutz vor unbefugtem Zugriff',
      'I-2e':'Vertraulichkeit von Daten',
      'I-2f':'Integrität von Daten und Konfigurationen',
      'I-2g':'Datenminimierung',
      'I-2h':'Verfügbarkeit & Widerstandsfähigkeit',
      'I-2i':'Auswirkungen auf andere Dienste minimieren',
      'I-2j':'Angriffsfläche begrenzen',
      'I-2k':'Auswirkungen von Vorfällen begrenzen',
      'I-2l':'Sicherheitsrelevante Protokollierung',
      'I-2m':'Sichere Datenlöschung und Übertragung',
      'II-1':'Komponenten & SBOM',
      'II-2':'Schwachstellen behandeln und beheben',
      'II-3':'Regelmäßige Sicherheitstests',
      'II-4':'Information zu behobenen Schwachstellen',
      'II-5':'Koordinierte Offenlegung (CVD)',
      'II-6':'Kontakt für Schwachstellenmeldungen',
      'II-7':'Sichere Update-Verteilung',
      'II-8':'Sicherheitsupdates bereitstellen'
    };

    const requirements = machine.craRequirements || [];
    document.getElementById('report-annex-i').innerHTML = requirements.length
      ? requirements.map(item =>
          '<div class="report-item"><div><strong>' + escapeHtml(item.key + ' · ' + (reqLabels[item.key] || 'Anforderung')) + '</strong>' +
          '<span>' + (item.justification ? escapeHtml(item.justification) : 'Keine Begründung hinterlegt') + '</span>' +
          (item.evidence ? '<p>Nachweis: ' + escapeHtml(item.evidence) + '</p>' : '') +
          '</div><span class="report-badge ' + (item.status === 'open' ? 'open' : '') + '">' +
          (item.status === 'fulfilled' ? 'Erfüllt' : item.status === 'not_applicable' ? 'Nicht anwendbar' : 'Offen') +
          '</span></div>'
        ).join('')
      : '<div class="report-empty">Anhang-I-Anforderungen noch nicht bewertet.</div>';

    document.getElementById('report-vulnerability-process').innerHTML = a
      ? '<div class="report-process"><span>Schwachstellenprozess</span>' +
        '<strong>' + escapeHtml(a.vulnerabilityContact || 'Kontakt noch offen') + '</strong>' +
        '<p><strong>CVD:</strong> ' + escapeHtml(a.cvdPolicy || 'Noch nicht dokumentiert') +
        '<br><strong>Sichere Update-Verteilung:</strong> ' + escapeHtml(a.secureUpdateDistribution || 'Noch nicht dokumentiert') +
        '</p></div>'
      : '<div class="report-empty">Schwachstellenprozess noch nicht dokumentiert.</div>';

    document.getElementById('report-reporting').innerHTML = (machine.craReportingEvents || []).length
      ? machine.craReportingEvents.map(item =>
          '<div class="report-item"><div><strong>' + escapeHtml(item.title) + '</strong>' +
          '<span>' + (item.eventType === 'actively_exploited_vulnerability' ? 'Aktiv ausgenutzte Schwachstelle' : 'Schwerwiegender Sicherheitsvorfall') +
          ' · Kenntnis: ' + escapeHtml(item.awarenessAt ? new Date(item.awarenessAt).toLocaleString('de-DE') : '–') + '</span>' +
          '<p>24-h-Frühwarnung: ' + escapeHtml(item.earlyWarningAt ? new Date(item.earlyWarningAt).toLocaleString('de-DE') : 'offen') +
          '<br>72-h-Meldung: ' + escapeHtml(item.fullNotificationAt ? new Date(item.fullNotificationAt).toLocaleString('de-DE') : 'offen') +
          '<br>Abschlussbericht: ' + escapeHtml(item.finalReportAt ? new Date(item.finalReportAt).toLocaleString('de-DE') : 'offen') +
          '</p></div><span class="report-badge ' + (item.status === 'closed' ? '' : 'open') + '">' +
          (item.status === 'closed' ? 'Abgeschlossen' : 'Offen') + '</span></div>'
        ).join('')
      : '<div class="report-empty">Kein CRA-Meldevorgang dokumentiert.</div>';

    const annexViiRows = a ? [
      ['Zweckbestimmung', a.intendedPurpose],
      ['Sicherheitsumgebung', a.securityEnvironment],
      ['Wesentliche Funktionen & Sicherheitseigenschaften', a.securityProperties],
      ['Vorhersehbare Fehlanwendung / Risiken', a.foreseeableMisuse],
      ['Systemarchitektur', a.architectureDescription],
      ['Fotos / Zeichnungen / Layout – Verweis', a.hardwareVisualsReference],
      ['Produktions- und Überwachungsprozess', a.productionMonitoringProcess],
      ['Normen / Spezifikationen / technische Lösungen', a.appliedStandards],
      ['Prüf- / Testberichte', a.testReportsSummary],
      ['Sichere Erstinbetriebnahme', a.secureCommissioning],
      ['Auswirkungen von Änderungen auf Sicherheit', a.securityChangeEffects],
      ['Installation von Sicherheitsupdates', a.updateInstallation],
      ['Sichere Außerbetriebnahme / Datenlöschung', a.secureDecommissioning],
      ['Automatische Updates / Opt-out', a.automaticUpdatesOptOut],
      ['Informationen für Integratoren', a.integratorInformation || 'Soweit anwendbar: keine Angabe'],
      ['Art des Sicherheitssupports', a.supportType],
      ['URL der EU-Konformitätserklärung', a.declarationUrl || 'Soweit anwendbar: keine URL hinterlegt']
    ] : [];

    document.getElementById('report-annex-vii').innerHTML = annexViiRows.length
      ? annexViiRows.map(([label,value]) =>
          '<div class="report-item"><div><strong>' + escapeHtml(label) + '</strong><span>' +
          escapeHtml(value || 'Offen') + '</span></div></div>'
        ).join('')
      : '<div class="report-empty">Ergänzende Anhang-VII-Angaben noch nicht hinterlegt.</div>';

    document.getElementById('report-conformity').innerHTML = a
      ? '<dl class="report-data-grid">' +
        [
          ['CE-Status', a.ceStatus === 'marked' ? 'CE-Kennzeichnung angebracht' : 'Offen'],
          ['Ort der CE-Kennzeichnung', a.ceMarkingLocation || '–'],
          ['EU-Konformitätserklärung', a.euDeclarationStatus === 'signed' ? 'Unterzeichnet' : a.euDeclarationStatus === 'prepared' ? 'Vorbereitet' : 'Offen'],
          ['Ausstellungsort / Datum', [a.declarationPlace, formatDate(a.declarationDate)].filter(Boolean).join(' · ') || '–'],
          ['Unterzeichnende Person', [a.declarationSigner, a.declarationFunction].filter(Boolean).join(' · ') || '–'],
          ['Unterzeichnete Fassung / Ablage', a.declarationSignedCopyReference || '–'],
          ['Weitere Unionsrechtsakte', a.otherUnionLegislation || '–'],
          ['Notifizierte Stelle', [a.notifiedBodyName, a.notifiedBodyNumber].filter(Boolean).join(' · ') || '–'],
          ['Zertifikat / Referenz', a.certificateReference || '–']
        ].map(([label,value]) =>
          '<div class="report-data"><dt>' + escapeHtml(label) + '</dt><dd>' + escapeHtml(value) + '</dd></div>'
        ).join('') + '</dl>'
      : '<div class="report-empty">Konformitätsabschluss noch nicht dokumentiert.</div>';

    document.getElementById('report-print').addEventListener('click', () => window.print());
  };

  init().catch(error => {
    console.error(error);
    document.getElementById('report-sheet').hidden = true;
    document.getElementById('report-error').hidden = false;
  });
})();