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

  const tasksForMachine = machine => {
    const processReady = Boolean(machine.updateProcess.owner && machine.updateProcess.procedure);
    const noOpenUpdates = machine.updateItems.every(item => item.status === 'done');
    const noOpenRisks = machine.riskItems.every(item => item.status === 'done');
    const supportReady = Boolean(machine.supportPeriod.startDate && machine.supportPeriod.endDate && machine.supportPeriod.owner);
    return [
      {title:'Grunddaten prüfen', text:'Name, Modell und Verantwortlichkeit kontrollieren.', done:true},
      {title:'Software & Versionen vollständig erfassen', text:'Alle Software- und Firmwarestände erfassen und die Liste als vollständig bestätigen.', done:machine.software === 'no' || machine.softwareComplete},
      {title:'Digitale Bauteile & Zulieferer vollständig erfassen', text:'Digitale Bauteile erfassen und die Liste anschließend als vollständig bestätigen.', done:machine.componentsComplete},
      {title:'Risikoprüfung abschließen', text:'Risiken prüfen, offene Maßnahmen erledigen und die Prüfung anschließend abschließen.', done:machine.riskReviewComplete && noOpenRisks},
      {title:'Sicherheitslücken & Updates bearbeiten', text:'Internen Ablauf festlegen und bekannte Sicherheitsprobleme bis zur Erledigung nachverfolgen.', done:processReady && noOpenUpdates},
      {title:'Unterlagen & Nachweise zusammenstellen', text:'Vorhandene Unterlagen der Maschine zuordnen und den Stand als vollständig bestätigen.', done:machine.documentsComplete},
      {title:'Unterstützungszeitraum festlegen', text:'Festhalten, wie lange die Maschine sicherheitsbezogen unterstützt wird.', done:supportReady}
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
      document.getElementById('short-sheet').hidden = true;
      document.getElementById('short-error').hidden = false;
      return;
    }

    const tasks = tasksForMachine(machine);
    const openTasks = tasks.filter(task => !task.done);
    const progress = Math.round(tasks.filter(task => task.done).length / tasks.length * 100);
    const openRisks = machine.riskItems.filter(item => item.status !== 'done');
    const openUpdates = machine.updateItems.filter(item => item.status !== 'done');
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

    const summary = [
      ['Modell / Baureihe', machine.model || '–'],
      ['Produktnummer', machine.productNumber || '–'],
      ['Verantwortlich', machine.owner || 'Noch offen'],
      ['Software / Firmware', yesNo(machine.software)],
      ['Netzwerk / Fernwartung', yesNo(machine.connected)],
      ['Softwarestände', String(machine.softwareItems.length)],
      ['Digitale Bauteile', String(machine.components.length)],
      ['Unterstützung bis', formatDate(machine.supportPeriod.endDate)]
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
      ? 'Bis ' + formatDate(machine.supportPeriod.endDate)
      : 'Noch nicht festgelegt';

    document.getElementById('short-bottom').innerHTML =
      '<div class="short-bottom-card"><span>Unterlagen & Nachweise</span><strong>' + escapeHtml(docsState) + '</strong><small>' +
      machine.documentItems.length + ' Einträge</small></div>' +
      '<div class="short-bottom-card"><span>Unterstützungszeitraum</span><strong>' + escapeHtml(supportState) + '</strong><small>' +
      escapeHtml(machine.supportPeriod.owner || 'Verantwortung noch offen') + '</small></div>' +
      '<div class="short-bottom-card"><span>Risiken</span><strong>' + openRisks.length + ' offen</strong><small>' +
      machine.riskItems.length + ' insgesamt erfasst</small></div>' +
      '<div class="short-bottom-card"><span>Sicherheitsprobleme</span><strong>' + openUpdates.length + ' offen</strong><small>' +
      machine.updateItems.length + ' insgesamt erfasst</small></div>';

    document.getElementById('short-print').addEventListener('click', () => window.print());
  };

  init().catch(error => {
    console.error(error);
    document.getElementById('short-sheet').hidden = true;
    document.getElementById('short-error').hidden = false;
  });
})();