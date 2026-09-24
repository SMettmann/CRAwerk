(() => {
  const STORAGE_KEY = 'crawerk_machines_v1';

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const readMachines = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const formatDate = (value) => {
    if (!value) return '–';
    const parts = String(value).split('-');
    if (parts.length === 3) return parts[2] + '.' + parts[1] + '.' + parts[0];
    return value;
  };

  const yesNo = (value) => value === 'yes' ? 'Ja' : value === 'no' ? 'Nein' : 'Unklar';

  const id = new URLSearchParams(location.search).get('id');
  const machine = readMachines().find(item => item.id === id);

  if (!machine) {
    document.getElementById('report-sheet').hidden = true;
    document.getElementById('report-error').hidden = false;
    return;
  }

  machine.softwareItems = Array.isArray(machine.softwareItems) ? machine.softwareItems : [];
  machine.components = Array.isArray(machine.components) ? machine.components : [];
  machine.riskItems = Array.isArray(machine.riskItems) ? machine.riskItems : [];
  machine.updateItems = Array.isArray(machine.updateItems) ? machine.updateItems : [];
  machine.documentItems = Array.isArray(machine.documentItems) ? machine.documentItems : [];
  machine.tasks = Array.isArray(machine.tasks) ? machine.tasks : [];
  machine.updateProcess = machine.updateProcess || {owner:'', procedure:''};
  machine.supportPeriod = machine.supportPeriod || {startDate:'', endDate:'', owner:'', reason:''};

  const progress = machine.tasks.length
    ? Math.round(machine.tasks.filter(task => task.done).length / machine.tasks.length * 100)
    : 0;

  const now = new Date();
  const generated = new Intl.DateTimeFormat('de-DE', {
    day:'2-digit',
    month:'2-digit',
    year:'numeric',
    hour:'2-digit',
    minute:'2-digit'
  }).format(now);

  document.title = 'Produktakte ' + machine.name + ' – CRAwerk';
  document.getElementById('report-generated').textContent = 'Stand: ' + generated;
  document.getElementById('report-name').textContent = machine.name;
  document.getElementById('report-subtitle').textContent =
    [machine.model, machine.productNumber ? 'Produktnummer ' + machine.productNumber : ''].filter(Boolean).join(' · ') || 'CRAwerk Produktakte';
  document.getElementById('report-progress').textContent = progress + '%';
  document.getElementById('report-progress-bar').style.width = progress + '%';
  document.getElementById('report-footer-machine').textContent = machine.name + ' · Stand ' + generated;
  document.getElementById('report-back').href = 'maschine.html?id=' + encodeURIComponent(machine.id);

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

  const tasks = machine.tasks;
  document.getElementById('report-tasks').innerHTML = tasks.length
    ? '<div class="report-list">' + tasks.map(task =>
        '<div class="report-item"><div><strong>' + escapeHtml(task.title) + '</strong>' +
        '<span>' + escapeHtml(task.text || '') + '</span></div>' +
        '<span class="report-badge ' + (task.done ? '' : 'open') + '">' + (task.done ? 'Erledigt' : 'Offen') + '</span></div>'
      ).join('') + '</div>'
    : '<div class="report-empty">Keine Aufgaben erfasst.</div>';

  document.getElementById('report-software').innerHTML = machine.softwareItems.length
    ? machine.softwareItems.map(item =>
        '<div class="report-item"><div><strong>' + escapeHtml(item.name) + '</strong>' +
        '<span>' + escapeHtml(item.type || 'Software') +
        (item.version ? ' · Version ' + escapeHtml(item.version) : '') +
        (item.vendor ? ' · ' + escapeHtml(item.vendor) : '') +
        '</span></div></div>'
      ).join('')
    : '<div class="report-empty">' + (machine.software === 'no' ? 'Für diese Maschine wurde keine Software/Firmware angegeben.' : 'Keine Software erfasst.') + '</div>';

  document.getElementById('report-components').innerHTML = machine.components.length
    ? machine.components.map(item =>
        '<div class="report-item"><div><strong>' + escapeHtml(item.name) + '</strong>' +
        '<span>' + escapeHtml(item.vendor || 'Hersteller offen') +
        (item.model ? ' · ' + escapeHtml(item.model) : '') +
        (item.version ? ' · Version ' + escapeHtml(item.version) : '') +
        ' · Unterlagen: ' + (item.documents === 'yes' ? 'Ja' : item.documents === 'no' ? 'Nein' : 'Unklar') +
        '</span></div></div>'
      ).join('')
    : '<div class="report-empty">Keine digitalen Bauteile erfasst.</div>';

  document.getElementById('report-risks').innerHTML = machine.riskItems.length
    ? machine.riskItems.map(item =>
        '<div class="report-item"><div><strong>' + escapeHtml(item.topic) + '</strong>' +
        '<span>' + escapeHtml(item.level || 'Ohne Einschätzung') +
        (item.owner ? ' · Verantwortlich: ' + escapeHtml(item.owner) : '') + '</span>' +
        '<p>' + escapeHtml(item.measure || '') + '</p></div>' +
        '<span class="report-badge ' + (item.status === 'done' ? '' : 'open') + '">' +
        (item.status === 'done' ? 'Erledigt' : 'Offen') + '</span></div>'
      ).join('')
    : '<div class="report-empty">Keine Risiken oder Aufgaben erfasst.</div>';

  const processReady = machine.updateProcess.owner && machine.updateProcess.procedure;
  document.getElementById('report-update-process').innerHTML = processReady
    ? '<div class="report-process"><span>Interner Ablauf</span><strong>' +
      escapeHtml(machine.updateProcess.owner) + '</strong><p>' +
      escapeHtml(machine.updateProcess.procedure) + '</p></div>'
    : '<div class="report-empty">Kein interner Ablauf für Sicherheitslücken und Updates festgelegt.</div>';

  document.getElementById('report-updates').innerHTML = machine.updateItems.length
    ? machine.updateItems.map(item =>
        '<div class="report-item"><div><strong>' + escapeHtml(item.title) + '</strong>' +
        '<span>' + (item.date ? 'Bekannt seit ' + formatDate(item.date) : 'Datum offen') +
        (item.affected ? ' · Betroffen: ' + escapeHtml(item.affected) : '') + '</span>' +
        '<p>' + escapeHtml(item.action || '') + '</p></div>' +
        '<span class="report-badge ' + (item.status === 'done' ? '' : 'open') + '">' +
        (item.status === 'done' ? 'Erledigt' : 'Offen') + '</span></div>'
      ).join('')
    : '<div class="report-empty">Kein Sicherheitsproblem dokumentiert.</div>';

  document.getElementById('report-documents-status').textContent =
    'Vollständigkeit: ' + (machine.documentsComplete ? 'vom Nutzer bestätigt' : 'noch nicht bestätigt');

  document.getElementById('report-documents').innerHTML = machine.documentItems.length
    ? machine.documentItems.map(item =>
        '<div class="report-item"><div><strong>' + escapeHtml(item.title) + '</strong>' +
        '<span>' + escapeHtml(item.type || 'Unterlage') +
        ' · ' + escapeHtml(item.related || 'Gesamtmaschine') +
        (item.date ? ' · Stand ' + formatDate(item.date) : '') + '</span>' +
        (item.note ? '<p>' + escapeHtml(item.note) + '</p>' : '') +
        '</div></div>'
      ).join('')
    : '<div class="report-empty">Keine Unterlagen erfasst.</div>';

  const support = machine.supportPeriod;
  const supportReady = support.startDate && support.endDate && support.owner;
  document.getElementById('report-support').innerHTML = supportReady
    ? '<div class="report-support"><div class="report-support-grid">' +
        '<div><span>Beginn</span><strong>' + formatDate(support.startDate) + '</strong></div>' +
        '<div><span>Geplantes Ende</span><strong>' + formatDate(support.endDate) + '</strong></div>' +
        '<div><span>Verantwortlich</span><strong>' + escapeHtml(support.owner) + '</strong></div>' +
      '</div>' +
      (support.reason ? '<p>' + escapeHtml(support.reason) + '</p>' : '') +
      '</div>'
    : '<div class="report-empty">Kein Unterstützungszeitraum festgelegt.</div>';

  document.getElementById('report-print').addEventListener('click', () => window.print());
})();