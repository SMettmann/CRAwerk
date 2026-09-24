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

    const render = () => {
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