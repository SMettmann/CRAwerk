(() => {
  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const formatDate = value => {
    if (!value) return 'Noch offen';
    const parts = String(value).split('-');
    return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : value;
  };

  const yesNo = value => value === 'yes' ? 'Ja' : value === 'no' ? 'Nein' : 'Unklar';

  const requirementDocumented = item =>
    item.status !== 'open' &&
    (item.status !== 'not_applicable' || Boolean(item.justification)) &&
    (item.status !== 'fulfilled' || Boolean(item.justification || item.evidence));

  const supportCommunicationReadyFor = machine => {
    const support = machine.supportPeriod || {};
    const basicReady = Boolean(
      support.startDate &&
      support.endDate &&
      support.owner &&
      support.reason &&
      support.purchaseDisclosureMethod &&
      support.purchaseDisclosureLocation &&
      support.endNotificationFeasible &&
      support.endNotificationFeasible !== 'unknown'
    );
    if (!basicReady) return false;
    if (support.endNotificationFeasible === 'yes' && !support.endNotificationMethod) return false;
    if (support.endNotificationFeasible === 'no' && !support.endNotificationNotFeasibleReason) return false;

    const endReached = new Date(support.endDate + 'T23:59:59').getTime() <= Date.now();
    if (
      endReached &&
      support.endNotificationFeasible === 'yes' &&
      (!support.endNotificationAt || !support.endNotificationReference)
    ) return false;

    return true;
  };

  const craCompleteForMachine = machine => {
    const a = machine.craAssessment;
    if (!a) return false;
    const requirements = machine.craRequirements || [];
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
    const annexReady = Boolean(
      a.classificationReason &&
      a.intendedPurpose && a.securityEnvironment && a.securityProperties && a.foreseeableMisuse &&
      a.hardwareVisualsReference && a.architectureDescription && a.productionMonitoringProcess &&
      a.appliedStandards && a.testReportsSummary &&
      a.vulnerabilityContact && a.cvdPolicy && a.cvdPolicyLocation && a.secureUpdateDistribution &&
      a.thirdPartyComponentProcess && a.retentionProcess &&
      a.secureCommissioning && a.securityChangeEffects && a.updateInstallation &&
      a.secureDecommissioning && a.automaticUpdatesOptOut && a.integratorInformation && a.supportType &&
      machine.riskReviewComplete &&
      supportCommunicationReadyFor(machine) &&
      (machine.software === 'no' || (machine.softwareComplete && machine.softwareItems.length))
    );
    return Boolean(
      routeValid && classCategoryReady && routeDetailsReady &&
      requirementsComplete && annexReady && ceReady && declarationReady &&
      (machine.craReportingEvents || []).every(item => item.status === 'closed') &&
      (machine.craNonconformityEvents || []).every(item => item.status === 'closed') &&
      (machine.craAuthorityRequests || []).every(item => item.status === 'closed')
    );
  };

  const tasksForMachine = machine => {
    const basicReady = Boolean(machine.name && (machine.model || machine.productNumber) && machine.owner);
    const processReady = Boolean(machine.updateProcess.owner && machine.updateProcess.procedure);
    const noOpenUpdates = machine.updateItems.every(item => item.status === 'done');
    const noOpenRisks = machine.riskItems.every(item => item.status === 'done');
    const supportReady = supportCommunicationReadyFor(machine);
    return [
      {title:'Grunddaten prüfen', text:'Name, Modell bzw. Produktnummer und Verantwortlichkeit kontrollieren.', done:basicReady},
      {title:'Software & Versionen vollständig erfassen', text:'Alle Software- und Firmwarestände erfassen und die Liste als vollständig bestätigen.', done:machine.software === 'no' || machine.softwareComplete},
      {title:'Digitale Bauteile & Zulieferer vollständig erfassen', text:'Digitale Bauteile erfassen und die Liste anschließend als vollständig bestätigen.', done:machine.componentsComplete},
      {title:'Risikoprüfung abschließen', text:'Risiken prüfen, offene Maßnahmen erledigen und die Prüfung anschließend abschließen.', done:machine.riskReviewComplete && noOpenRisks},
      {title:'Sicherheitslücken & Updates bearbeiten', text:'Internen Ablauf festlegen und bekannte Sicherheitsprobleme bis zur Erledigung nachverfolgen.', done:processReady && noOpenUpdates},
      {title:'Unterlagen & Nachweise zusammenstellen', text:'Vorhandene Unterlagen der Maschine zuordnen und den Stand als vollständig bestätigen.', done:machine.documentsComplete},
      {title:'Unterstützungszeitraum festlegen', text:'Festhalten, wie lange die Maschine sicherheitsbezogen unterstützt wird.', done:supportReady},
      {title:'CRA-Prüfung & Konformitätsabschluss', text:'Einstufung, Anhang I, technische Dokumentation, Meldeprozess sowie EU-Erklärung und CE abschließen.', done:craCompleteForMachine(machine)}
    ];
  };

  const renderCompanyLogo = async company => {
    if (!company?.logo_path) return;
    const image = document.getElementById('short-company-logo');
    if (!image) return;
    try {
      image.src = await CRAwerkBackend.companyLogoSignedUrl(company.logo_path, 3600);
      image.hidden = false;
    } catch (error) {
      console.warn('Firmenlogo konnte nicht geladen werden.', error);
    }
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
      document.getElementById('short-sheet').hidden = true;
      document.getElementById('short-error').hidden = false;
      return;
    }

    await renderCompanyLogo(company);

    const tasks = tasksForMachine(machine);
    const openTasks = tasks.filter(task => !task.done);
    const progress = Math.round(tasks.filter(task => task.done).length / tasks.length * 100);
    const openRisks = machine.riskItems.filter(item => item.status !== 'done');
    const openUpdates = machine.updateItems.filter(item => item.status !== 'done');
    const openNonconformities = (machine.craNonconformityEvents || []).filter(item => item.status !== 'closed');
    const openAuthorityRequests = (machine.craAuthorityRequests || []).filter(item => item.status !== 'closed');
    const generated = new Intl.DateTimeFormat('de-DE', {
      day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'
    }).format(new Date());

    document.title = 'Kurzübersicht ' + machine.name + ' – CRAwerk';
    document.getElementById('short-back').href = 'maschine.html?id=' + encodeURIComponent(machine.id);
    document.getElementById('short-full').href = 'produktakte.html?id=' + encodeURIComponent(machine.id);
    document.getElementById('short-revision').textContent = 'Revision ' + machine.documentRevision;
    document.getElementById('short-generated').textContent = 'Stand: ' + generated;
    document.getElementById('short-name').textContent = machine.name;
    document.getElementById('short-subtitle').textContent =
      [machine.model, machine.productNumber ? 'Produktnummer ' + machine.productNumber : ''].filter(Boolean).join(' · ') || 'CRAwerk Kurzübersicht';
    document.getElementById('short-progress-value').textContent = progress + '%';
    document.getElementById('short-progress-bar').style.width = progress + '%';
    document.getElementById('short-footer-machine').textContent =
      machine.name + ' · Revision ' + machine.documentRevision + ' · Stand ' + generated;

    const companyAddress = [
      company.street,
      [company.zip, company.city].filter(Boolean).join(' '),
      company.country
    ].filter(Boolean);

    document.getElementById('short-company').innerHTML =
      '<div><span class="short-kicker">UNTERNEHMEN</span><strong>' + escapeHtml(company.name) + '</strong>' +
      (companyAddress.length ? '<p>' + companyAddress.map(escapeHtml).join('<br>') + '</p>' : '') +
      '</div><div class="short-company-contact">' +
      [company.contact_name, company.email, company.phone].filter(Boolean)
        .map(value => '<span>' + escapeHtml(value) + '</span>').join('') + '</div>';

    const classificationLabels = {
      unset:'Offen',
      standard:'Standardprodukt',
      important_i:'Wichtig · Klasse I',
      important_ii:'Wichtig · Klasse II',
      critical:'Kritisch'
    };

    const summary = [
      ['Modell / Baureihe', machine.model || '–'],
      ['Produktnummer', machine.productNumber || '–'],
      ['Verantwortlich', machine.owner || 'Noch offen'],
      ['Software / Firmware', yesNo(machine.software)],
      ['Netzwerk / Fernwartung', yesNo(machine.connected)],
      ['Softwarestände', String(machine.softwareItems.length)],
      ['Digitale Bauteile', String(machine.components.length)],
      ['Unterstützung bis', formatDate(machine.supportPeriod.endDate)],
      ['CRA-Einstufung', machine.craAssessment ? (classificationLabels[machine.craAssessment.classification] || 'Offen') : 'Offen'],
      ['Konformitätsabschluss', craCompleteForMachine(machine) ? 'Abgeschlossen' : 'Offen']
    ];
    document.getElementById('short-summary').innerHTML = summary.map(([label,value]) =>
      '<div class="short-stat"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>'
    ).join('');

    document.getElementById('short-open-count').textContent = openTasks.length + ' offen';
    document.getElementById('short-open-tasks').innerHTML = openTasks.length
      ? openTasks.map(task =>
          '<div class="short-row"><div><strong>' + escapeHtml(task.title) + '</strong><span>' +
          escapeHtml(task.text) + '</span></div><b>Offen</b></div>'
        ).join('')
      : '<div class="short-empty">Aktuell keine offene Aufgabe.</div>';

    document.getElementById('short-risks').innerHTML = openRisks.length
      ? openRisks.slice(0,5).map(item =>
          '<div class="short-row compact"><div><strong>' + escapeHtml(item.topic) + '</strong><span>' +
          escapeHtml(item.measure || '') + '</span></div><b>' + escapeHtml(item.level || 'Offen') + '</b></div>'
        ).join('')
      : '<div class="short-empty">Keine offenen Risiken oder Maßnahmen.</div>';

    const updateProcessReady = Boolean(machine.updateProcess.owner && machine.updateProcess.procedure);
    document.getElementById('short-updates').innerHTML =
      (!updateProcessReady
        ? '<div class="short-row compact"><div><strong>Interner Ablauf</strong><span>Noch nicht festgelegt.</span></div><b>Offen</b></div>'
        : '') +
      (openUpdates.length
        ? openUpdates.slice(0,5).map(item =>
            '<div class="short-row compact"><div><strong>' + escapeHtml(item.title) + '</strong><span>' +
            escapeHtml(item.action || '') + '</span></div><b>Offen</b></div>'
          ).join('')
        : (updateProcessReady ? '<div class="short-empty">Kein offenes Sicherheitsproblem dokumentiert.</div>' : ''));

    const docsState = machine.documentsComplete
      ? 'Vollständigkeit bestätigt'
      : (machine.documentItems.length ? machine.documentItems.length + ' Unterlagen erfasst' : 'Noch keine Unterlage erfasst');
    const supportState = machine.supportPeriod.endDate
      ? (
          supportReady
            ? 'Bis ' + formatDate(machine.supportPeriod.endDate)
            : 'Bis ' + formatDate(machine.supportPeriod.endDate) + ' · Kommunikation offen'
        )
      : 'Noch nicht festgelegt';

    document.getElementById('short-bottom').innerHTML =
      '<div class="short-bottom-card"><span>Unterlagen & Nachweise</span><strong>' + escapeHtml(docsState) + '</strong><small>' +
      machine.documentItems.length + ' Einträge</small></div>' +
      '<div class="short-bottom-card"><span>Unterstützungszeitraum</span><strong>' + escapeHtml(supportState) + '</strong><small>' +
      escapeHtml(machine.supportPeriod.owner || 'Verantwortung noch offen') + '</small></div>' +
      '<div class="short-bottom-card"><span>Risiken</span><strong>' + openRisks.length + ' offen</strong><small>' +
      machine.riskItems.length + ' insgesamt erfasst</small></div>' +
      '<div class="short-bottom-card"><span>Sicherheitsprobleme</span><strong>' + openUpdates.length + ' offen</strong><small>' +
      machine.updateItems.length + ' insgesamt erfasst</small></div>' +
      '<div class="short-bottom-card"><span>Nichtkonformität</span><strong>' + openNonconformities.length + ' offen</strong><small>' +
      (machine.craNonconformityEvents || []).length + ' Vorgänge insgesamt</small></div>' +
      '<div class="short-bottom-card"><span>Behördenanfragen</span><strong>' + openAuthorityRequests.length + ' offen</strong><small>' +
      (machine.craAuthorityRequests || []).length + ' Vorgänge insgesamt</small></div>';

    document.getElementById('short-print').addEventListener('click', () => window.print());
  };

  init().catch(error => {
    console.error(error);
    document.getElementById('short-sheet').hidden = true;
    document.getElementById('short-error').hidden = false;
  });
})();