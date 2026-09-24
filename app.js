(() => {
  const STORAGE_KEY = 'crawerk_machines_v1';

  const readMachines = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const writeMachines = (machines) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(machines));
  };

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const createTasks = (machine) => [
    {id:'basic', title:'Grunddaten prüfen', text:'Name, Modell und Verantwortlichkeit kontrollieren.', done:true},
    {id:'software', title:'Software & Versionen ergänzen', text:'Festhalten, welche Software und welche Version in der Maschine steckt.', done:machine.software === 'no'},
    {id:'supplier', title:'Zulieferer & digitale Bauteile ergänzen', text:'Steuerungen und andere digitale Bauteile der Maschine zuordnen.', done:false},
    {id:'risks', title:'Risiken & Aufgaben durchgehen', text:'Offene Punkte und Zuständigkeiten festhalten.', done:false},
    {id:'updates', title:'Ablauf für Sicherheitslücken & Updates festlegen', text:'Wer reagiert und wie wird ein Update dokumentiert?', done:false},
    {id:'documents', title:'Unterlagen & Nachweise zusammenstellen', text:'Vorhandene Unterlagen der Maschine zuordnen und den Stand als vollständig bestätigen.', done:false},
    {id:'support', title:'Unterstützungszeitraum festlegen', text:'Festhalten, wie lange die Maschine sicherheitsbezogen unterstützt wird.', done:false}
  ];

  const progressFor = (machine) => {
    const tasks = machine.tasks || [];
    if (!tasks.length) return 0;
    return Math.round(tasks.filter(t => t.done).length / tasks.length * 100);
  };

  const nextTaskFor = (machine) => (machine.tasks || []).find(t => !t.done);

  function initDashboard() {
    const list = document.getElementById('machines-list');
    const empty = document.getElementById('machines-empty');
    const dialog = document.getElementById('machine-dialog');
    const form = document.getElementById('machine-form');

    const openers = [
      document.getElementById('new-machine-button'),
      document.getElementById('new-machine-button-secondary'),
      document.getElementById('empty-new-machine')
    ].filter(Boolean);

    openers.forEach(btn => btn.addEventListener('click', () => dialog.showModal()));
    document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
    document.getElementById('dialog-cancel').addEventListener('click', () => dialog.close());

    const render = () => {
      const machines = readMachines();
      empty.hidden = machines.length > 0;
      list.hidden = machines.length === 0;

      const allTasks = machines.flatMap(m => m.tasks || []);
      const done = allTasks.filter(t => t.done).length;
      const open = allTasks.length - done;
      const overall = allTasks.length ? Math.round(done / allTasks.length * 100) : 0;

      document.getElementById('stat-machines').textContent = machines.length;
      document.getElementById('stat-open').textContent = open;
      document.getElementById('stat-done').textContent = done;
      document.getElementById('stat-progress').textContent = overall + '%';

      list.innerHTML = machines.map(machine => {
        const p = progressFor(machine);
        const next = nextTaskFor(machine);
        return '<a class="machine-row" href="maschine.html?id=' + encodeURIComponent(machine.id) + '">' +
          '<div class="machine-name"><strong>' + escapeHtml(machine.name) + '</strong><span>' + escapeHtml(machine.model || 'Keine Baureihe angegeben') + '</span></div>' +
          '<div class="machine-cell"><small>Arbeitsstand</small><strong>' + p + '%</strong><div class="row-progress"><span style="width:' + p + '%"></span></div></div>' +
          '<div class="machine-cell hide-tablet"><small>Verantwortlich</small><strong>' + escapeHtml(machine.owner || 'Noch offen') + '</strong></div>' +
          '<div class="machine-cell"><small>Offene Aufgaben</small><strong>' + (machine.tasks || []).filter(t => !t.done).length + '</strong></div>' +
          '<div>→</div>' +
        '</a>';
      }).join('');

      const machineWithNext = machines.find(m => nextTaskFor(m));
      const nextTitle = document.getElementById('next-work-title');
      const nextText = document.getElementById('next-work-text');
      const nextLink = document.getElementById('next-work-link');

      if (machineWithNext) {
        const task = nextTaskFor(machineWithNext);
        nextTitle.textContent = task.title;
        nextText.textContent = machineWithNext.name + ': ' + task.text;
        nextLink.href = 'maschine.html?id=' + encodeURIComponent(machineWithNext.id);
        nextLink.hidden = false;
      } else if (machines.length) {
        nextTitle.textContent = 'Aktuell keine offene Aufgabe';
        nextText.textContent = 'Alle angelegten Aufgaben sind erledigt.';
        nextLink.hidden = true;
      } else {
        nextTitle.textContent = 'Erste Maschine anlegen';
        nextText.textContent = 'Legen Sie Ihre erste Maschine an. Danach zeigt CRAwerk die nächsten offenen Schritte.';
        nextLink.hidden = true;
      }
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const machine = {
        id: 'm_' + Date.now(),
        name: data.get('name').trim(),
        model: data.get('model').trim(),
        productNumber: data.get('productNumber').trim(),
        owner: data.get('owner').trim(),
        software: data.get('software'),
        connected: data.get('connected'),
        createdAt: new Date().toISOString()
      };
      machine.tasks = createTasks(machine);

      const machines = readMachines();
      machines.unshift(machine);
      writeMachines(machines);
      form.reset();
      dialog.close();
      location.href = 'maschine.html?id=' + encodeURIComponent(machine.id);
    });

    render();
  }

  function showToast(message) {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(window.__crawerkToast);
    window.__crawerkToast = setTimeout(() => toast.hidden = true, 3200);
  }

  function initMachine() {
    const id = new URLSearchParams(location.search).get('id');
    const machines = readMachines();
    let machine = machines.find(m => m.id === id);

    if (machine) {
      machine.softwareItems = Array.isArray(machine.softwareItems) ? machine.softwareItems : [];
      machine.components = Array.isArray(machine.components) ? machine.components : [];
      machine.riskItems = Array.isArray(machine.riskItems) ? machine.riskItems : [];
      machine.updateItems = Array.isArray(machine.updateItems) ? machine.updateItems : [];
      machine.updateProcess = machine.updateProcess && typeof machine.updateProcess === 'object'
        ? machine.updateProcess
        : {owner:'', procedure:''};
      machine.documentItems = Array.isArray(machine.documentItems) ? machine.documentItems : [];
      machine.documentsComplete = machine.documentsComplete === true;
      machine.supportPeriod = machine.supportPeriod && typeof machine.supportPeriod === 'object'
        ? machine.supportPeriod
        : {startDate:'', endDate:'', owner:'', reason:''};

      if (!machine.tasks.some(task => task.id === 'documents')) {
        const supportIndex = machine.tasks.findIndex(task => task.id === 'support');
        const documentTask = {
          id:'documents',
          title:'Unterlagen & Nachweise zusammenstellen',
          text:'Vorhandene Unterlagen der Maschine zuordnen und den Stand als vollständig bestätigen.',
          done:false
        };
        if (supportIndex >= 0) machine.tasks.splice(supportIndex, 0, documentTask);
        else machine.tasks.push(documentTask);
      }
    }

    if (!machine) {
      document.querySelector('.machine-main').innerHTML =
        '<section class="empty-state"><strong>Maschine nicht gefunden.</strong><span>Die Daten liegen aktuell nur in diesem Browser.</span><a class="app-btn app-btn-dark" href="dashboard.html">Zur Übersicht</a></section>';
      return;
    }

    const persist = () => {
      const all = readMachines();
      const idx = all.findIndex(m => m.id === machine.id);
      if (idx >= 0) {
        all[idx] = machine;
        writeMachines(all);
      }
    };

    const syncModuleTasks = () => {
      const softwareTask = machine.tasks.find(t => t.id === 'software');
      const supplierTask = machine.tasks.find(t => t.id === 'supplier');
      const riskTask = machine.tasks.find(t => t.id === 'risks');
      const updateTask = machine.tasks.find(t => t.id === 'updates');
      const documentTask = machine.tasks.find(t => t.id === 'documents');
      const supportTask = machine.tasks.find(t => t.id === 'support');

      if (softwareTask) {
        softwareTask.done = machine.software === 'no' || machine.softwareItems.length > 0;
      }

      if (supplierTask) {
        supplierTask.done = machine.components.length > 0;
      }

      if (riskTask) {
        riskTask.done = machine.riskItems.length > 0 && machine.riskItems.every(item => item.status === 'done');
      }

      if (updateTask) {
        updateTask.title = 'Sicherheitslücken & Updates bearbeiten';
        updateTask.text = 'Internen Ablauf festlegen und bekannte Sicherheitsprobleme bis zur Erledigung nachverfolgen.';
        const processReady = Boolean(machine.updateProcess.owner && machine.updateProcess.procedure);
        const noOpenUpdates = machine.updateItems.every(item => item.status === 'done');
        updateTask.done = processReady && noOpenUpdates;
      }

      if (documentTask) {
        documentTask.done = machine.documentsComplete === true;
      }

      if (supportTask) {
        supportTask.done = Boolean(
          machine.supportPeriod.startDate &&
          machine.supportPeriod.endDate &&
          machine.supportPeriod.owner
        );
      }
    };

    const render = () => {
      syncModuleTasks();
      persist();

      const p = progressFor(machine);
      const done = machine.tasks.filter(t => t.done).length;
      const next = nextTaskFor(machine);

      document.title = machine.name + ' – CRAwerk';
      document.getElementById('machine-name').textContent = machine.name;
      document.getElementById('machine-meta').textContent =
        [machine.model, machine.productNumber ? 'Nr. ' + machine.productNumber : ''].filter(Boolean).join(' · ') || 'Produktakte';

      document.getElementById('machine-progress-value').textContent = p + '%';
      document.getElementById('machine-progress-bar').style.width = p + '%';
      document.getElementById('machine-progress-text').textContent = done + ' von ' + machine.tasks.length + ' Aufgaben erledigt.';

      if (next) {
        document.getElementById('machine-next-title').textContent = next.title;
        document.getElementById('machine-next-text').textContent = next.text;
      } else {
        document.getElementById('machine-next-title').textContent = 'Alle angelegten Aufgaben erledigt';
        document.getElementById('machine-next-text').textContent = 'Der aktuelle Arbeitsstand ist vollständig.';
      }

      document.getElementById('task-checklist').innerHTML = machine.tasks.map(task =>
        '<label class="task-check ' + (task.done ? 'done' : '') + '">' +
          '<input type="checkbox" data-task="' + task.id + '" ' + (task.done ? 'checked' : '') + '>' +
          '<span><strong>' + escapeHtml(task.title) + '</strong><span>' + escapeHtml(task.text) + '</span></span>' +
        '</label>'
      ).join('');

      const yesNo = value => value === 'yes' ? 'Ja' : value === 'no' ? 'Nein' : 'Unklar';
      document.getElementById('machine-data').innerHTML =
        '<div><dt>Modell</dt><dd>' + escapeHtml(machine.model || '–') + '</dd></div>' +
        '<div><dt>Produktnummer</dt><dd>' + escapeHtml(machine.productNumber || '–') + '</dd></div>' +
        '<div><dt>Verantwortlich</dt><dd>' + escapeHtml(machine.owner || '–') + '</dd></div>' +
        '<div><dt>Software</dt><dd>' + yesNo(machine.software) + '</dd></div>' +
        '<div><dt>Verbindung</dt><dd>' + yesNo(machine.connected) + '</dd></div>' +
        '<div><dt>Unterstützung bis</dt><dd>' + escapeHtml(machine.supportPeriod.endDate || '–') + '</dd></div>';

      const softwareList = document.getElementById('software-list');
      const componentList = document.getElementById('component-list');
      const riskList = document.getElementById('risk-list');
      const updateList = document.getElementById('update-list');
      const updateProcessBox = document.getElementById('update-process');
      const documentList = document.getElementById('document-list');
      const supportSummary = document.getElementById('support-summary');

      document.getElementById('software-status').textContent =
        machine.software === 'no' ? 'Nicht erforderlich' :
        machine.softwareItems.length ? machine.softwareItems.length + ' erfasst' : 'Noch offen';

      document.getElementById('component-status').textContent =
        machine.components.length ? machine.components.length + ' erfasst' : 'Noch offen';

      const openRisks = machine.riskItems.filter(item => item.status !== 'done').length;
      document.getElementById('risk-status').textContent =
        machine.riskItems.length
          ? (openRisks ? openRisks + ' offen' : 'Erledigt')
          : 'Noch offen';

      const processReady = Boolean(machine.updateProcess.owner && machine.updateProcess.procedure);
      const openUpdates = machine.updateItems.filter(item => item.status !== 'done').length;
      document.getElementById('update-status').textContent =
        !processReady
          ? 'Ablauf fehlt'
          : (openUpdates ? openUpdates + ' offen' : 'Bereit');

      document.getElementById('document-status').textContent =
        machine.documentsComplete
          ? 'Vollständig'
          : (machine.documentItems.length ? machine.documentItems.length + ' erfasst' : 'Noch offen');

      document.getElementById('toggle-documents-complete').textContent =
        machine.documentsComplete ? 'Vollständigkeit aufheben' : 'Unterlagen vollständig';

      const supportReady = Boolean(
        machine.supportPeriod.startDate &&
        machine.supportPeriod.endDate &&
        machine.supportPeriod.owner
      );

      document.getElementById('support-status').textContent =
        supportReady ? 'Festgelegt' : 'Noch offen';

      supportSummary.innerHTML = supportReady
        ? '<div class="support-card">' +
            '<div><span>Beginn</span><strong>' + escapeHtml(machine.supportPeriod.startDate) + '</strong></div>' +
            '<div><span>Ende</span><strong>' + escapeHtml(machine.supportPeriod.endDate) + '</strong></div>' +
            '<div><span>Verantwortlich</span><strong>' + escapeHtml(machine.supportPeriod.owner) + '</strong></div>' +
            (machine.supportPeriod.reason
              ? '<p>' + escapeHtml(machine.supportPeriod.reason) + '</p>'
              : '') +
          '</div>'
        : '<div class="module-empty">Noch kein Unterstützungszeitraum festgelegt.</div>';

      softwareList.innerHTML = machine.softwareItems.length
        ? machine.softwareItems.map(item =>
            '<div class="module-item">' +
              '<div><strong>' + escapeHtml(item.name) + '</strong>' +
              '<span>' + escapeHtml(item.type) + ' · Version ' + escapeHtml(item.version) +
              (item.vendor ? ' · ' + escapeHtml(item.vendor) : '') + '</span></div>' +
              '<button type="button" class="item-remove" data-remove-software="' + escapeHtml(item.id) + '" aria-label="Software löschen">×</button>' +
            '</div>'
          ).join('')
        : '<div class="module-empty">' + (machine.software === 'no' ? 'Für diese Maschine wurde „keine Software/Firmware“ angegeben.' : 'Noch keine Software erfasst.') + '</div>';

      componentList.innerHTML = machine.components.length
        ? machine.components.map(item =>
            '<div class="module-item">' +
              '<div><strong>' + escapeHtml(item.name) + '</strong>' +
              '<span>' + escapeHtml(item.vendor) +
              (item.model ? ' · ' + escapeHtml(item.model) : '') +
              (item.version ? ' · Version ' + escapeHtml(item.version) : '') +
              ' · Unterlagen: ' + (item.documents === 'yes' ? 'Ja' : item.documents === 'no' ? 'Nein' : 'Unklar') +
              '</span></div>' +
              '<button type="button" class="item-remove" data-remove-component="' + escapeHtml(item.id) + '" aria-label="Bauteil löschen">×</button>' +
            '</div>'
          ).join('')
        : '<div class="module-empty">Noch kein digitales Bauteil erfasst.</div>';

      riskList.innerHTML = machine.riskItems.length
        ? machine.riskItems.map(item =>
            '<div class="risk-item ' + (item.status === 'done' ? 'risk-done' : '') + '">' +
              '<div class="risk-top">' +
                '<div><strong>' + escapeHtml(item.topic) + '</strong>' +
                '<span class="risk-meta">' + escapeHtml(item.level) +
                (item.owner ? ' · ' + escapeHtml(item.owner) : '') + '</span></div>' +
                '<span class="risk-pill ' + (item.status === 'done' ? 'done' : 'open') + '">' +
                  (item.status === 'done' ? 'Erledigt' : 'Offen') +
                '</span>' +
              '</div>' +
              '<p>' + escapeHtml(item.measure) + '</p>' +
              '<div class="risk-actions">' +
                '<button type="button" class="text-button" data-toggle-risk="' + escapeHtml(item.id) + '">' +
                  (item.status === 'done' ? 'Wieder öffnen' : 'Als erledigt markieren') +
                '</button>' +
                '<button type="button" class="item-remove" data-remove-risk="' + escapeHtml(item.id) + '" aria-label="Punkt löschen">×</button>' +
              '</div>' +
            '</div>'
          ).join('')
        : '<div class="module-empty">Noch kein Risiko oder offener Punkt erfasst.</div>';

      updateProcessBox.innerHTML = processReady
        ? '<div class="process-card"><span>Interner Ablauf</span><strong>' + escapeHtml(machine.updateProcess.owner) + '</strong><p>' + escapeHtml(machine.updateProcess.procedure) + '</p></div>'
        : '<div class="module-empty">Noch kein interner Ablauf festgelegt.</div>';

      updateList.innerHTML = machine.updateItems.length
        ? machine.updateItems.map(item =>
            '<div class="risk-item ' + (item.status === 'done' ? 'risk-done' : '') + '">' +
              '<div class="risk-top">' +
                '<div><strong>' + escapeHtml(item.title) + '</strong>' +
                '<span class="risk-meta">' +
                  (item.date ? escapeHtml(item.date) : 'Datum offen') +
                  (item.affected ? ' · ' + escapeHtml(item.affected) : '') +
                '</span></div>' +
                '<span class="risk-pill ' + (item.status === 'done' ? 'done' : 'open') + '">' +
                  (item.status === 'done' ? 'Erledigt' : 'Offen') +
                '</span>' +
              '</div>' +
              '<p>' + escapeHtml(item.action) + '</p>' +
              '<div class="risk-actions">' +
                '<button type="button" class="text-button" data-toggle-update="' + escapeHtml(item.id) + '">' +
                  (item.status === 'done' ? 'Wieder öffnen' : 'Als erledigt markieren') +
                '</button>' +
                '<button type="button" class="item-remove" data-remove-update="' + escapeHtml(item.id) + '" aria-label="Sicherheitsproblem löschen">×</button>' +
              '</div>' +
            '</div>'
          ).join('')
        : '<div class="module-empty">Aktuell kein Sicherheitsproblem dokumentiert.</div>';

      documentList.innerHTML = machine.documentItems.length
        ? machine.documentItems.map(item =>
            '<div class="module-item document-item">' +
              '<div><strong>' + escapeHtml(item.title) + '</strong>' +
              '<span>' + escapeHtml(item.type) +
                ' · ' + escapeHtml(item.related || 'Gesamtmaschine') +
                (item.date ? ' · ' + escapeHtml(item.date) : '') +
                (item.note ? '<br>' + escapeHtml(item.note) : '') +
              '</span></div>' +
              '<button type="button" class="item-remove" data-remove-document="' + escapeHtml(item.id) + '" aria-label="Unterlage löschen">×</button>' +
            '</div>'
          ).join('')
        : '<div class="module-empty">Noch keine Unterlage erfasst.</div>';
    };

    document.getElementById('task-checklist').addEventListener('change', (event) => {
      const input = event.target.closest('input[data-task]');
      if (!input) return;
      const task = machine.tasks.find(t => t.id === input.dataset.task);
      if (!task) return;
      task.done = input.checked;
      persist();
      render();
    });

    document.getElementById('print-machine').addEventListener('click', () => window.print());

    const softwareDialog = document.getElementById('software-dialog');
    const componentDialog = document.getElementById('component-dialog');
    const riskDialog = document.getElementById('risk-dialog');
    const updateProcessDialog = document.getElementById('update-process-dialog');
    const updateDialog = document.getElementById('update-dialog');
    const documentDialog = document.getElementById('document-dialog');
    const supportDialog = document.getElementById('support-dialog');
    const softwareForm = document.getElementById('software-form');
    const componentForm = document.getElementById('component-form');
    const riskForm = document.getElementById('risk-form');
    const updateProcessForm = document.getElementById('update-process-form');
    const updateForm = document.getElementById('update-form');
    const documentForm = document.getElementById('document-form');
    const supportForm = document.getElementById('support-form');

    document.getElementById('add-software').addEventListener('click', () => softwareDialog.showModal());
    document.getElementById('add-component').addEventListener('click', () => componentDialog.showModal());
    document.getElementById('add-risk').addEventListener('click', () => riskDialog.showModal());
    document.getElementById('set-update-process').addEventListener('click', () => {
      updateProcessForm.elements.owner.value = machine.updateProcess.owner || '';
      updateProcessForm.elements.procedure.value = machine.updateProcess.procedure || '';
      updateProcessDialog.showModal();
    });
    document.getElementById('add-update').addEventListener('click', () => updateDialog.showModal());
    document.getElementById('add-document').addEventListener('click', () => {
      const related = document.getElementById('document-related');
      related.innerHTML = '';
      related.add(new Option('Gesamtmaschine', 'Gesamtmaschine'));
      machine.components.forEach(item => related.add(new Option('Bauteil: ' + item.name, 'Bauteil: ' + item.name)));
      machine.softwareItems.forEach(item => related.add(new Option('Software: ' + item.name, 'Software: ' + item.name)));
      documentDialog.showModal();
    });

    document.getElementById('toggle-documents-complete').addEventListener('click', () => {
      if (!machine.documentsComplete && machine.documentItems.length === 0) {
        showToast('Bitte zuerst mindestens eine vorhandene Unterlage erfassen.');
        return;
      }
      machine.documentsComplete = !machine.documentsComplete;
      persist();
      render();
      showToast(machine.documentsComplete ? 'Unterlagen wurden als vollständig markiert.' : 'Vollständigkeit wurde aufgehoben.');
    });

    document.getElementById('set-support').addEventListener('click', () => {
      supportForm.elements.startDate.value = machine.supportPeriod.startDate || '';
      supportForm.elements.endDate.value = machine.supportPeriod.endDate || '';
      supportForm.elements.owner.value = machine.supportPeriod.owner || '';
      supportForm.elements.reason.value = machine.supportPeriod.reason || '';
      supportDialog.showModal();
    });

    document.querySelectorAll('[data-close-dialog]').forEach(button => {
      button.addEventListener('click', () => {
        const dialog = document.getElementById(button.dataset.closeDialog);
        if (dialog) dialog.close();
      });
    });

    softwareForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(softwareForm);

      machine.softwareItems.push({
        id: 's_' + Date.now(),
        name: data.get('name').trim(),
        version: data.get('version').trim(),
        type: data.get('type'),
        vendor: data.get('vendor').trim()
      });

      softwareForm.reset();
      softwareDialog.close();
      persist();
      render();
      showToast('Software wurde der Maschine hinzugefügt.');
    });

    componentForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(componentForm);

      machine.components.push({
        id: 'c_' + Date.now(),
        name: data.get('name').trim(),
        vendor: data.get('vendor').trim(),
        model: data.get('model').trim(),
        version: data.get('version').trim(),
        documents: data.get('documents')
      });

      componentForm.reset();
      componentDialog.close();
      persist();
      render();
      showToast('Bauteil wurde der Maschine hinzugefügt.');
    });

    riskForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(riskForm);

      machine.riskItems.push({
        id: 'r_' + Date.now(),
        topic: data.get('topic').trim(),
        level: data.get('level'),
        owner: data.get('owner').trim(),
        measure: data.get('measure').trim(),
        status: data.get('status')
      });

      riskForm.reset();
      riskDialog.close();
      persist();
      render();
      showToast('Risiko / Aufgabe wurde hinzugefügt.');
    });

    updateProcessForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(updateProcessForm);

      machine.updateProcess = {
        owner: data.get('owner').trim(),
        procedure: data.get('procedure').trim()
      };

      updateProcessDialog.close();
      persist();
      render();
      showToast('Interner Ablauf wurde gespeichert.');
    });

    updateForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(updateForm);

      machine.updateItems.push({
        id: 'u_' + Date.now(),
        title: data.get('title').trim(),
        date: data.get('date'),
        affected: data.get('affected').trim(),
        action: data.get('action').trim(),
        status: data.get('status')
      });

      updateForm.reset();
      updateDialog.close();
      persist();
      render();
      showToast('Sicherheitsproblem wurde dokumentiert.');
    });

    documentForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(documentForm);

      machine.documentItems.push({
        id: 'd_' + Date.now(),
        title: data.get('title').trim(),
        type: data.get('type'),
        date: data.get('date'),
        related: data.get('related'),
        note: data.get('note').trim()
      });

      machine.documentsComplete = false;
      documentForm.reset();
      documentDialog.close();
      persist();
      render();
      showToast('Unterlage wurde der Maschine zugeordnet.');
    });

    supportForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(supportForm);
      const startDate = data.get('startDate');
      const endDate = data.get('endDate');

      if (endDate < startDate) {
        supportForm.elements.endDate.setCustomValidity('Das Enddatum darf nicht vor dem Beginn liegen.');
        supportForm.elements.endDate.reportValidity();
        return;
      }

      supportForm.elements.endDate.setCustomValidity('');

      machine.supportPeriod = {
        startDate,
        endDate,
        owner: data.get('owner').trim(),
        reason: data.get('reason').trim()
      };

      supportDialog.close();
      persist();
      render();
      showToast('Unterstützungszeitraum wurde gespeichert.');
    });

    supportForm.elements.endDate.addEventListener('input', () => {
      supportForm.elements.endDate.setCustomValidity('');
    });

    document.getElementById('software-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-software]');
      if (!button) return;

      machine.softwareItems = machine.softwareItems.filter(item => item.id !== button.dataset.removeSoftware);
      persist();
      render();
      showToast('Software wurde entfernt.');
    });

    document.getElementById('component-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-component]');
      if (!button) return;

      machine.components = machine.components.filter(item => item.id !== button.dataset.removeComponent);
      persist();
      render();
      showToast('Bauteil wurde entfernt.');
    });

    document.getElementById('risk-list').addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-risk]');
      if (removeButton) {
        machine.riskItems = machine.riskItems.filter(item => item.id !== removeButton.dataset.removeRisk);
        persist();
        render();
        showToast('Risiko / Aufgabe wurde entfernt.');
        return;
      }

      const toggleButton = event.target.closest('[data-toggle-risk]');
      if (!toggleButton) return;

      const item = machine.riskItems.find(entry => entry.id === toggleButton.dataset.toggleRisk);
      if (!item) return;

      item.status = item.status === 'done' ? 'open' : 'done';
      persist();
      render();
      showToast(item.status === 'done' ? 'Punkt wurde erledigt.' : 'Punkt wurde wieder geöffnet.');
    });

    document.getElementById('update-list').addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-update]');
      if (removeButton) {
        machine.updateItems = machine.updateItems.filter(item => item.id !== removeButton.dataset.removeUpdate);
        persist();
        render();
        showToast('Sicherheitsproblem wurde entfernt.');
        return;
      }

      const toggleButton = event.target.closest('[data-toggle-update]');
      if (!toggleButton) return;

      const item = machine.updateItems.find(entry => entry.id === toggleButton.dataset.toggleUpdate);
      if (!item) return;

      item.status = item.status === 'done' ? 'open' : 'done';
      persist();
      render();
      showToast(item.status === 'done' ? 'Sicherheitsproblem wurde erledigt.' : 'Sicherheitsproblem wurde wieder geöffnet.');
    });

    document.getElementById('document-list').addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-document]');
      if (!button) return;

      machine.documentItems = machine.documentItems.filter(item => item.id !== button.dataset.removeDocument);
      machine.documentsComplete = false;
      persist();
      render();
      showToast('Unterlage wurde entfernt.');
    });

    document.querySelectorAll('.module-action').forEach(button => {
      button.addEventListener('click', () => {
        showToast(button.dataset.placeholder + ' bauen wir als nächsten Schritt aus.');
      });
    });

    render();
  }

  const page = document.body.dataset.page;
  if (page === 'dashboard') initDashboard();
  if (page === 'machine') initMachine();
})();