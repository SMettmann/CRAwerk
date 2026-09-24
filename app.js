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

      if (softwareTask) {
        softwareTask.done = machine.software === 'no' || machine.softwareItems.length > 0;
      }

      if (supplierTask) {
        supplierTask.done = machine.components.length > 0;
      }

      if (riskTask) {
        riskTask.done = machine.riskItems.length > 0 && machine.riskItems.every(item => item.status === 'done');
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
        '<div><dt>Verbindung</dt><dd>' + yesNo(machine.connected) + '</dd></div>';

      const softwareList = document.getElementById('software-list');
      const componentList = document.getElementById('component-list');
      const riskList = document.getElementById('risk-list');

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
    const softwareForm = document.getElementById('software-form');
    const componentForm = document.getElementById('component-form');
    const riskForm = document.getElementById('risk-form');

    document.getElementById('add-software').addEventListener('click', () => softwareDialog.showModal());
    document.getElementById('add-component').addEventListener('click', () => componentDialog.showModal());
    document.getElementById('add-risk').addEventListener('click', () => riskDialog.showModal());

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