(() => {
  const backend = window.CRAwerkBackend;
  const auth = window.CRAwerkSupabase;

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');

  const yesNo = value => value === 'yes' ? 'Ja' : value === 'no' ? 'Nein' : 'Unklar';

  const formatDate = value => {
    if (!value) return '–';
    const parts = String(value).split('-');
    return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : value;
  };

  const craCompleteForMachine = machine => {
    const a = machine.craAssessment;
    const requirements = machine.craRequirements || [];
    const reporting = machine.craReportingEvents || [];
    const nonconformities = machine.craNonconformityEvents || [];
    const noOpenNonconformities = nonconformities.every(item => item.status === 'closed');
    if (!a) return false;

    const company = machine.company || {};
    const manufacturerReady = Boolean(
      company.name && company.street && company.zip && company.city && company.country && company.email
    );
    const productIdentityReady = Boolean(
      machine.name && (machine.model || machine.productNumber)
    );

    const requirementsComplete =
      requirements.length >= 22 &&
      requirements.every(item =>
        item.status !== 'open' &&
        (item.status !== 'not_applicable' || Boolean(item.justification)) &&
        (item.status !== 'fulfilled' || Boolean(item.justification || item.evidence))
      );

    const classCategoryReady =
      a.classification === 'standard' || Boolean(a.classificationCategory);

    const routeDetailsReady =
      a.conformityRoute === 'module_a' ? true :
      ['module_bc','module_h'].includes(a.conformityRoute)
        ? Boolean(a.notifiedBodyName && a.notifiedBodyNumber && a.certificateReference)
        : a.conformityRoute === 'eu_certification'
          ? Boolean(a.certificateReference)
          : false;

    const declarationReady = Boolean(
      a.euDeclarationStatus === 'signed' &&
      a.declarationPlace &&
      a.declarationDate &&
      a.declarationSigner &&
      a.declarationFunction &&
      a.declarationSignedCopyReference
    );

    const ceReady = Boolean(a.ceStatus === 'marked' && a.ceMarkingLocation);

    const routeValid =
      a.classification !== 'unset' &&
      a.conformityRoute !== 'unset' &&
      !(a.classification === 'important_i' &&
        a.conformityRoute === 'module_a' &&
        a.standardsCoverage !== 'full') &&
      !(['important_ii','critical'].includes(a.classification) && a.conformityRoute === 'module_a');

    const userInfoReady = Boolean(
      a.secureCommissioning &&
      a.securityChangeEffects &&
      a.updateInstallation &&
      a.secureDecommissioning &&
      a.automaticUpdatesOptOut &&
      a.integratorInformation &&
      a.supportType
    );

    const annexViiReady = Boolean(
      a.intendedPurpose &&
      a.securityEnvironment &&
      a.securityProperties &&
      a.foreseeableMisuse &&
      a.hardwareVisualsReference &&
      userInfoReady &&
      a.architectureDescription &&
      a.productionMonitoringProcess &&
      a.vulnerabilityContact &&
      a.cvdPolicy &&
      a.cvdPolicyLocation &&
      a.secureUpdateDistribution &&
      a.thirdPartyComponentProcess &&
      a.retentionProcess &&
      machine.riskReviewComplete &&
      machine.supportPeriod.startDate &&
      machine.supportPeriod.endDate &&
      machine.supportPeriod.owner &&
      machine.supportPeriod.reason &&
      a.appliedStandards &&
      a.testReportsSummary &&
      (machine.software === 'no' || (machine.softwareComplete && machine.softwareItems.length > 0))
    );

    return Boolean(
      manufacturerReady &&
      productIdentityReady &&
      routeValid &&
      classCategoryReady &&
      routeDetailsReady &&
      a.classificationReason &&
      requirementsComplete &&
      annexViiReady &&
      ceReady &&
      declarationReady &&
      reporting.every(item => item.status === 'closed') &&
      noOpenNonconformities
    );
  };

  const tasksForMachine = machine => {
    const basicReady = Boolean(machine.name && (machine.model || machine.productNumber) && machine.owner);
    const processReady = Boolean(machine.updateProcess && machine.updateProcess.owner && machine.updateProcess.procedure);
    const noOpenUpdates = (machine.updateItems || []).every(item => item.status === 'done');
    const noOpenRisks = (machine.riskItems || []).every(item => item.status === 'done');
    const supportReady = Boolean(
      machine.supportPeriod &&
      machine.supportPeriod.startDate &&
      machine.supportPeriod.endDate &&
      machine.supportPeriod.owner
    );

    return [
      {
        id:'basic',
        title:'Grunddaten prüfen',
        text:'Name, Modell und Verantwortlichkeit kontrollieren.',
        done:basicReady
      },
      {
        id:'software',
        title:'Software & Versionen vollständig erfassen',
        text:'Alle Software- und Firmwarestände erfassen und die Liste als vollständig bestätigen.',
        done:machine.software === 'no' || machine.softwareComplete === true
      },
      {
        id:'supplier',
        title:'Digitale Bauteile & Zulieferer vollständig erfassen',
        text:'Digitale Bauteile erfassen und die Liste anschließend als vollständig bestätigen.',
        done:machine.componentsComplete === true
      },
      {
        id:'risks',
        title:'Risikoprüfung abschließen',
        text:'Risiken prüfen, offene Maßnahmen erledigen und die Prüfung anschließend abschließen.',
        done:machine.riskReviewComplete === true && noOpenRisks
      },
      {
        id:'updates',
        title:'Sicherheitslücken & Updates bearbeiten',
        text:'Internen Ablauf festlegen und bekannte Sicherheitsprobleme bis zur Erledigung nachverfolgen.',
        done:processReady && noOpenUpdates
      },
      {
        id:'documents',
        title:'Unterlagen & Nachweise zusammenstellen',
        text:'Vorhandene Unterlagen der Maschine zuordnen und den Stand als vollständig bestätigen.',
        done:machine.documentsComplete === true
      },
      {
        id:'support',
        title:'Unterstützungszeitraum festlegen',
        text:'Festhalten, wie lange die Maschine sicherheitsbezogen unterstützt wird.',
        done:supportReady
      },
      {
        id:'cra',
        title:'CRA-Prüfung & Konformitätsabschluss',
        text:'Produktklasse, Anhang-I-Nachweis, technische Dokumentation, Meldeprozess sowie EU-Erklärung und CE abschließen.',
        done:craCompleteForMachine(machine)
      }
    ];
  };

  const progressFor = machine => {
    const tasks = tasksForMachine(machine);
    return Math.round(tasks.filter(t => t.done).length / tasks.length * 100);
  };

  const nextTaskFor = machine => tasksForMachine(machine).find(t => !t.done);

  const GUIDE_CONTENT = {
    basic:{
      title:'Grunddaten der Maschine prüfen',
      why:'Damit jede spätere Angabe eindeutig der richtigen Maschine und der zuständigen Person zugeordnet ist.',
      what:'Name, Modell, Produktnummer und verantwortliche Person.',
      example:'Fräsanlage MX200 · Modell MX200 · Verantwortlich: Max Mustermann',
      action:'Grunddaten bearbeiten'
    },
    software:{
      title:'Software der Maschine vollständig erfassen',
      why:'Damit nachvollziehbar ist, welche Software- und Firmwarestände zu dieser Maschine gehören.',
      what:'Bezeichnung und Version der eingesetzten Software oder Firmware. Danach bestätigen Sie, dass die Liste vollständig ist.',
      example:'HMI Runtime · Version 3.4.1 · Hersteller ABC',
      action:'Software erfassen'
    },
    supplier:{
      title:'Digitale Bauteile und Zulieferer erfassen',
      why:'Damit Sie später schnell erkennen können, welche Maschine von einer Meldung oder Änderung eines Zulieferers betroffen sein kann.',
      what:'Digitale Bauteile wie Steuerungen, Gateways oder vernetzte Komponenten mit Hersteller und Typ.',
      example:'SIMATIC S7-1500 · Siemens · Typ CPU 1511',
      action:'Bauteile erfassen'
    },
    risks:{
      title:'Sicherheitsrisiken der Maschine durchgehen',
      why:'Damit bekannte Sicherheitsfragen eine klare Maßnahme und Zuständigkeit bekommen und nicht nur im Kopf einzelner Personen bleiben.',
      what:'Prüfen Sie die Maschine auf relevante Risiken. Gefundene Punkte werden mit Maßnahme und Verantwortlichem erfasst. Wenn keine offenen Punkte mehr bestehen, schließen Sie die Prüfung ab.',
      example:'Fernwartungszugang · Maßnahme: Zugang absichern · Verantwortlich: Entwicklung',
      action:'Risikoprüfung öffnen'
    },
    updates:{
      title:'Umgang mit Sicherheitsproblemen festlegen',
      why:'Damit im Fall eines Sicherheitsproblems sofort klar ist, wer reagiert und wie der Vorgang dokumentiert wird.',
      what:'Einmal den internen Ablauf und die verantwortliche Stelle festlegen. Bekannte Sicherheitsprobleme werden anschließend nur bei Bedarf ergänzt.',
      example:'Meldung prüfen → betroffene Maschinen ermitteln → Maßnahme festlegen → Umsetzung dokumentieren',
      action:'Ablauf festlegen'
    },
    documents:{
      title:'Vorhandene Unterlagen zuordnen',
      why:'Damit relevante Nachweise nicht verteilt liegen, sondern nachvollziehbar zu dieser Maschine gehören.',
      what:'Vorhandene Lieferantenunterlagen, Prüfungen, Versionsnachweise oder Risikodokumente erfassen. Danach bestätigen Sie die Vollständigkeit.',
      example:'Sicherheitsinformation Steuerung · Lieferantenunterlage · Stand 09/2026',
      action:'Unterlagen erfassen'
    },
    support:{
      title:'Unterstützungszeitraum festlegen',
      why:'Damit intern eindeutig dokumentiert ist, bis wann Sicherheitsprobleme und notwendige Updates für diese Maschine betreut werden sollen.',
      what:'Beginn, geplantes Ende und die verantwortliche Person.',
      example:'Beginn 01.01.2027 · Ende 31.12.2032 · Verantwortlich: Produktmanagement',
      action:'Zeitraum festlegen'
    },
    cra:{
      title:'CRA-Prüfung und Konformitätsabschluss',
      why:'Damit die bereits erfassten Maschinendaten mit den verbleibenden CRA-Pflichtnachweisen zusammengeführt werden.',
      what:'Einstufung, Anhang-I-Anforderungen, technische Dokumentation, Meldeworkflow sowie EU-Konformitätserklärung und CE.',
      example:'Standardprodukt · Modul A · Anhang I vollständig bewertet · EU-Erklärung unterzeichnet',
      action:'CRA-Prüfung öffnen'
    }
  };

  const showToast = message => {
    const toast = document.getElementById('app-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(window.__crawerkToast);
    window.__crawerkToast = setTimeout(() => toast.hidden = true, 3200);
  };

  const setCompanyHeader = async () => {
    try {
      const company = await backend.currentCompany();
      document.querySelectorAll('.app-account').forEach(link => {
        link.textContent = company.name || 'Unternehmen';
      });
    } catch (error) {
      console.error(error);
    }
  };

  const requireApp = async () => {
    if (!auth || !backend) {
      location.replace('login.html');
      return false;
    }
    const session = await auth.requireSession();
    if (!session) return false;
    await setCompanyHeader();
    try {
      const systemAdmin = await backend.isSystemAdmin();
      if (systemAdmin) {
        document.querySelectorAll('[data-system-admin-link]').forEach(link => link.hidden = false);
      }
    } catch (error) {
      console.error(error);
    }
    return true;
  };

  async function initDashboard() {
    if (!await requireApp()) return;

    const list = document.getElementById('machines-list');
    const empty = document.getElementById('machines-empty');
    const dialog = document.getElementById('machine-dialog');
    const form = document.getElementById('machine-form');
    let machines = [];

    const openers = [
      document.getElementById('new-machine-button'),
      document.getElementById('new-machine-button-secondary'),
      document.getElementById('empty-new-machine')
    ].filter(Boolean);

    openers.forEach(btn => btn.addEventListener('click', () => dialog.showModal()));
    document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
    document.getElementById('dialog-cancel').addEventListener('click', () => dialog.close());

    const daysUntil = value => {
      if (!value) return null;
      const target = new Date(value + 'T00:00:00');
      const today = new Date();
      today.setHours(0,0,0,0);
      return Math.ceil((target - today) / 86400000);
    };

    const render = () => {
      empty.hidden = machines.length > 0;
      list.hidden = machines.length === 0;

      const openCountFor = machine => tasksForMachine(machine).filter(task => !task.done).length;
      const readyMachines = machines.filter(machine => openCountFor(machine) === 0);
      const openTasks = machines.reduce((sum, machine) => sum + openCountFor(machine), 0);

      const supportSoon = machines.filter(machine => {
        const days = daysUntil(machine.supportPeriod && machine.supportPeriod.endDate);
        return days !== null && days >= 0 && days <= 180;
      }).length;

      document.getElementById('stat-machines').textContent = machines.length;
      document.getElementById('stat-open').textContent = openTasks;
      document.getElementById('stat-ready').textContent = readyMachines.length;
      document.getElementById('stat-support-soon').textContent = supportSoon;

      const attentionList = document.getElementById('attention-list');
      const attentionMachines = machines
        .filter(machine => openCountFor(machine) > 0)
        .sort((a,b) => openCountFor(b) - openCountFor(a))
        .slice(0,5);

      attentionList.innerHTML = attentionMachines.length
        ? attentionMachines.map(machine => {
            const task = nextTaskFor(machine);
            const open = openCountFor(machine);
            return '<a class="focus-row" href="maschine.html?id=' + encodeURIComponent(machine.id) + '">' +
              '<div><strong>' + escapeHtml(machine.name) + '</strong>' +
              '<span>' + escapeHtml(task ? task.title : 'Offene Punkte prüfen') + '</span></div>' +
              '<div class="focus-row-right"><span class="status-chip open">' + open + ' offen</span><b>→</b></div>' +
            '</a>';
          }).join('')
        : '<div class="focus-empty">Aktuell keine offene Aufgabe.</div>';

      const supportList = document.getElementById('support-list');
      const supportMachines = machines
        .filter(machine => machine.supportPeriod && machine.supportPeriod.endDate)
        .sort((a,b) => a.supportPeriod.endDate.localeCompare(b.supportPeriod.endDate))
        .slice(0,5);

      supportList.innerHTML = supportMachines.length
        ? supportMachines.map(machine => {
            const endDate = machine.supportPeriod.endDate;
            const days = daysUntil(endDate);
            let label = formatDate(endDate);
            let chipClass = '';
            if (days < 0) {
              label = 'abgelaufen · ' + formatDate(endDate);
              chipClass = 'alert';
            } else if (days === 0) {
              label = 'endet heute';
              chipClass = 'alert';
            } else if (days <= 180) {
              label = 'in ' + days + ' Tagen';
              chipClass = 'soon';
            }
            return '<a class="focus-row" href="maschine.html?id=' + encodeURIComponent(machine.id) + '">' +
              '<div><strong>' + escapeHtml(machine.name) + '</strong>' +
              '<span>Unterstützung bis ' + escapeHtml(formatDate(endDate)) + '</span></div>' +
              '<div class="focus-row-right"><span class="status-chip ' + chipClass + '">' + escapeHtml(label) + '</span><b>→</b></div>' +
            '</a>';
          }).join('')
        : '<div class="focus-empty">Noch kein Unterstützungszeitraum festgelegt.</div>';

      list.innerHTML = machines.map(machine => {
        const p = progressFor(machine);
        const open = openCountFor(machine);
        const supportEnd = machine.supportPeriod && machine.supportPeriod.endDate
          ? formatDate(machine.supportPeriod.endDate)
          : 'Noch offen';
        const status = open === 0
          ? '<span class="status-chip ready">Arbeitsstand vollständig</span>'
          : '<span class="status-chip open">' + open + ' offen</span>';

        return '<a class="machine-row dashboard-machine-row" href="maschine.html?id=' + encodeURIComponent(machine.id) + '">' +
          '<div class="machine-name"><strong>' + escapeHtml(machine.name) + '</strong><span>' + escapeHtml(machine.model || 'Keine Baureihe angegeben') + '</span></div>' +
          '<div class="machine-status-cell">' + status + '</div>' +
          '<div class="machine-cell"><small>Arbeitsstand</small><strong>' + p + '%</strong><div class="row-progress"><span style="width:' + p + '%"></span></div></div>' +
          '<div class="machine-cell hide-tablet"><small>Unterstützung bis</small><strong>' + escapeHtml(supportEnd) + '</strong></div>' +
          '<div class="machine-cell hide-tablet"><small>Verantwortlich</small><strong>' + escapeHtml(machine.owner || 'Noch offen') + '</strong></div>' +
          '<div class="machine-row-arrow">→</div>' +
        '</a>';
      }).join('');

      const machineWithNext = machines.find(machine => nextTaskFor(machine));
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
        nextText.textContent = 'Die angelegten Arbeitspunkte sind bei allen Maschinen erledigt.';
        nextLink.hidden = true;
      } else {
        nextTitle.textContent = 'Erste Maschine anlegen';
        nextText.textContent = 'Legen Sie Ihre erste Maschine an. Danach zeigt CRAwerk die nächsten offenen Schritte.';
        nextLink.hidden = true;
      }
    };

    const reload = async () => {
      machines = await backend.loadMachines();
      render();
    };

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const data = new FormData(form);
      submit.disabled = true;
      submit.textContent = 'Wird angelegt…';
      try {
        const id = await backend.createMachine({
          name:data.get('name').trim(),
          model:data.get('model').trim(),
          productNumber:data.get('productNumber').trim(),
          owner:data.get('owner').trim(),
          software:data.get('software'),
          connected:data.get('connected')
        });
        location.href = 'maschine.html?id=' + encodeURIComponent(id);
      } catch (error) {
        console.error(error);
        showToast('Maschine konnte nicht angelegt werden.');
        submit.disabled = false;
        submit.textContent = 'Maschine anlegen';
      }
    });

    try {
      await reload();
    } catch (error) {
      console.error(error);
      showToast('Maschinen konnten nicht geladen werden.');
    }
  }

  async function initMachine() {
    if (!await requireApp()) return;

    const id = new URLSearchParams(location.search).get('id');
    let machine = null;

    try {
      machine = await backend.loadMachine(id);
    } catch (error) {
      console.error(error);
    }

    if (!machine) {
      document.querySelector('.machine-main').innerHTML =
        '<section class="empty-state"><strong>Maschine nicht gefunden.</strong><span>Die Maschine existiert nicht oder gehört nicht zu Ihrem Unternehmen.</span><a class="app-btn app-btn-dark" href="dashboard.html">Zur Übersicht</a></section>';
      return;
    }

    const editMachineDialog = document.getElementById('edit-machine-dialog');
    const deleteMachineDialog = document.getElementById('delete-machine-dialog');
    const editMachineForm = document.getElementById('edit-machine-form');
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

    let editingSoftwareId = null;
    let editingComponentId = null;
    let editingRiskId = null;
    let editingUpdateId = null;
    let editingDocumentId = null;

    const setDialogMode = (dialog, form, title, submitLabel) => {
      const heading = dialog.querySelector('.dialog-head h2');
      const submit = form.querySelector('button[type="submit"]');
      if (heading) heading.textContent = title;
      if (submit) submit.textContent = submitLabel;
    };

    const populateDocumentRelated = (selectedValue = 'Gesamtmaschine') => {
      const related = document.getElementById('document-related');
      related.innerHTML = '';
      const values = ['Gesamtmaschine'];
      machine.components.forEach(item => values.push('Bauteil: ' + item.name));
      machine.softwareItems.forEach(item => values.push('Software: ' + item.name));
      if (selectedValue && !values.includes(selectedValue)) values.push(selectedValue);
      values.forEach(value => related.add(new Option(value, value)));
      related.value = selectedValue || 'Gesamtmaschine';
    };

    const render = () => {
      const tasks = tasksForMachine(machine);
      const p = progressFor(machine);
      const done = tasks.filter(t => t.done).length;
      const next = tasks.find(t => !t.done);

      document.title = machine.name + ' – CRAwerk';
      document.getElementById('machine-name').textContent = machine.name;
      document.getElementById('machine-meta').textContent =
        [machine.model, machine.productNumber ? 'Nr. ' + machine.productNumber : ''].filter(Boolean).join(' · ') || 'Produktakte';

      document.getElementById('machine-progress-value').textContent = p + '%';
      document.getElementById('machine-progress-bar').style.width = p + '%';
      document.getElementById('machine-progress-text').textContent = done + ' von ' + tasks.length + ' Aufgaben erledigt.';

      const guideAction = document.getElementById('guide-action');
      const guideStepLabel = document.getElementById('guide-step-label');
      const guideProgressLabel = document.getElementById('guide-progress-label');

      if (next) {
        const guide = GUIDE_CONTENT[next.id];
        const stepIndex = tasks.findIndex(task => task.id === next.id) + 1;
        guideStepLabel.textContent = 'IHR NÄCHSTER SCHRITT';
        guideProgressLabel.textContent = 'Schritt ' + stepIndex + ' von ' + tasks.length;
        document.getElementById('machine-next-title').textContent = guide.title;
        document.getElementById('machine-next-text').textContent = 'Sie brauchen dafür kein CRA-Fachwissen. Beantworten bzw. erfassen Sie nur die folgenden Angaben.';
        document.getElementById('guide-why').textContent = guide.why;
        document.getElementById('guide-what').textContent = guide.what;
        document.getElementById('guide-example').textContent = guide.example;
        guideAction.textContent = guide.action;
        guideAction.dataset.guideTask = next.id;
      } else {
        guideStepLabel.textContent = 'AKTUELLER ARBEITSSTAND';
        guideProgressLabel.textContent = tasks.length + ' von ' + tasks.length + ' Schritten';
        document.getElementById('machine-next-title').textContent = 'Diese Maschinenakte hat einen vollständigen Arbeitsstand';
        document.getElementById('machine-next-text').textContent = 'Alle vorgesehenen Bereiche haben derzeit einen nachvollziehbaren Stand.';
        document.getElementById('guide-why').textContent = 'Sie sehen auf einen Blick, welche Angaben für diese Maschine erfasst und welche offenen Punkte abgeschlossen wurden.';
        document.getElementById('guide-what').textContent = 'Bei Änderungen an Software, Bauteilen, Risiken oder Unterlagen öffnen Sie einfach den jeweiligen Bereich erneut.';
        document.getElementById('guide-example').textContent = 'Für Weitergabe oder Ablage können Sie jetzt die Kurzübersicht oder die vollständige Produktakte erzeugen.';
        guideAction.textContent = 'Kurzübersicht ansehen';
        guideAction.dataset.guideTask = 'complete';
      }

      document.getElementById('task-checklist').innerHTML = tasks.map(task =>
        '<div class="task-check ' + (task.done ? 'done' : '') + '">' +
          '<span class="task-state ' + (task.done ? 'done' : 'open') + '">' + (task.done ? '✓' : '•') + '</span>' +
          '<span><strong>' + escapeHtml(task.title) + '</strong><span>' + escapeHtml(task.text) + '</span></span>' +
        '</div>'
      ).join('');

      document.getElementById('machine-data').innerHTML =
        '<div><dt>Modell</dt><dd>' + escapeHtml(machine.model || '–') + '</dd></div>' +
        '<div><dt>Produktnummer</dt><dd>' + escapeHtml(machine.productNumber || '–') + '</dd></div>' +
        '<div><dt>Verantwortlich</dt><dd>' + escapeHtml(machine.owner || '–') + '</dd></div>' +
        '<div><dt>Software</dt><dd>' + yesNo(machine.software) + '</dd></div>' +
        '<div><dt>Verbindung</dt><dd>' + yesNo(machine.connected) + '</dd></div>' +
        '<div><dt>Unterstützung bis</dt><dd>' + escapeHtml(formatDate(machine.supportPeriod.endDate)) + '</dd></div>' +
        '<div><dt>Produktakte</dt><dd>Revision ' + escapeHtml(machine.documentRevision) + '</dd></div>' +
        '<div><dt>CRA-Abschluss</dt><dd>' + (craCompleteForMachine(machine) ? 'Abgeschlossen' : 'Offen') + '</dd></div>';

      document.getElementById('software-status').textContent =
        machine.software === 'no' ? 'Nicht erforderlich' :
        machine.softwareComplete ? 'Vollständig' :
        machine.softwareItems.length ? machine.softwareItems.length + ' erfasst · prüfen' : 'Noch offen';
      document.getElementById('toggle-software-complete').textContent =
        machine.softwareComplete ? 'Vollständigkeit aufheben' : 'Softwareliste vollständig';

      document.getElementById('component-status').textContent =
        machine.componentsComplete ? 'Vollständig' :
        machine.components.length ? machine.components.length + ' erfasst · prüfen' : 'Noch offen';
      document.getElementById('toggle-components-complete').textContent =
        machine.componentsComplete ? 'Vollständigkeit aufheben' : 'Bauteilliste vollständig';

      const openRisks = machine.riskItems.filter(item => item.status !== 'done').length;
      document.getElementById('risk-status').textContent =
        openRisks ? openRisks + ' offen' : (machine.riskReviewComplete ? 'Prüfung abgeschlossen' : 'Prüfung offen');
      document.getElementById('toggle-risk-review').textContent =
        machine.riskReviewComplete ? 'Prüfung wieder öffnen' : 'Risikoprüfung abgeschlossen';

      const processReady = Boolean(machine.updateProcess.owner && machine.updateProcess.procedure);
      const openUpdates = machine.updateItems.filter(item => item.status !== 'done').length;
      document.getElementById('update-status').textContent =
        !processReady ? 'Ablauf fehlt' : (openUpdates ? openUpdates + ' offen' : 'Bereit');

      document.getElementById('document-status').textContent =
        machine.documentsComplete ? 'Vollständig' :
        machine.documentItems.length ? machine.documentItems.length + ' erfasst' : 'Noch offen';
      document.getElementById('toggle-documents-complete').textContent =
        machine.documentsComplete ? 'Vollständigkeit aufheben' : 'Unterlagen vollständig';

      const supportReady = Boolean(machine.supportPeriod.startDate && machine.supportPeriod.endDate && machine.supportPeriod.owner && machine.supportPeriod.reason);
      document.getElementById('support-status').textContent = supportReady ? 'Festgelegt' : 'Noch offen';

      const craReady = craCompleteForMachine(machine);
      const craStatus = document.getElementById('cra-status');
      if (craStatus) craStatus.textContent = craReady ? 'Abgeschlossen' : 'Noch offen';

      document.getElementById('support-summary').innerHTML = supportReady
        ? '<div class="support-card">' +
            '<div><span>Beginn</span><strong>' + escapeHtml(formatDate(machine.supportPeriod.startDate)) + '</strong></div>' +
            '<div><span>Ende</span><strong>' + escapeHtml(formatDate(machine.supportPeriod.endDate)) + '</strong></div>' +
            '<div><span>Verantwortlich</span><strong>' + escapeHtml(machine.supportPeriod.owner) + '</strong></div>' +
            (machine.supportPeriod.reason ? '<p>' + escapeHtml(machine.supportPeriod.reason) + '</p>' : '') +
          '</div>'
        : '<div class="module-empty">Noch kein Unterstützungszeitraum festgelegt.</div>';

      document.getElementById('software-list').innerHTML = machine.softwareItems.length
        ? machine.softwareItems.map(item =>
            '<div class="module-item"><div><strong>' + escapeHtml(item.name) + '</strong>' +
            '<span>' + escapeHtml(item.type) + ' · Version ' + escapeHtml(item.version) +
            (item.vendor ? ' · ' + escapeHtml(item.vendor) : '') +
            (item.purl ? ' · ' + escapeHtml(item.purl) : '') + '</span></div>' +
            '<div class="item-actions"><button type="button" class="item-edit" data-edit-software="' + item.id + '">Bearbeiten</button>' +
            '<button type="button" class="item-remove" data-remove-software="' + item.id + '" aria-label="Software löschen">×</button></div></div>'
          ).join('')
        : '<div class="module-empty">' + (machine.software === 'no' ? 'Für diese Maschine wurde „keine Software/Firmware“ angegeben.' : 'Noch keine Software erfasst.') + '</div>';

      document.getElementById('component-list').innerHTML = machine.components.length
        ? machine.components.map(item =>
            '<div class="module-item"><div><strong>' + escapeHtml(item.name) + '</strong><span>' +
            escapeHtml(item.vendor) + (item.model ? ' · ' + escapeHtml(item.model) : '') +
            (item.version ? ' · Version ' + escapeHtml(item.version) : '') +
            ' · Unterlagen: ' + (item.documents === 'yes' ? 'Ja' : item.documents === 'no' ? 'Nein' : 'Unklar') +
            '</span></div><div class="item-actions"><button type="button" class="item-edit" data-edit-component="' + item.id + '">Bearbeiten</button>' +
            '<button type="button" class="item-remove" data-remove-component="' + item.id + '" aria-label="Bauteil löschen">×</button></div></div>'
          ).join('')
        : '<div class="module-empty">Noch kein digitales Bauteil erfasst.</div>';

      document.getElementById('risk-list').innerHTML = machine.riskItems.length
        ? machine.riskItems.map(item =>
            '<div class="risk-item ' + (item.status === 'done' ? 'risk-done' : '') + '">' +
              '<div class="risk-top"><div><strong>' + escapeHtml(item.topic) + '</strong><span class="risk-meta">' +
              escapeHtml(item.level) + (item.owner ? ' · ' + escapeHtml(item.owner) : '') + '</span></div>' +
              '<span class="risk-pill ' + (item.status === 'done' ? 'done' : 'open') + '">' + (item.status === 'done' ? 'Erledigt' : 'Offen') + '</span></div>' +
              '<p>' + escapeHtml(item.measure) + '</p>' +
              '<div class="risk-actions"><div class="risk-action-links">' +
                '<button type="button" class="text-button" data-edit-risk="' + item.id + '">Bearbeiten</button>' +
                '<button type="button" class="text-button" data-toggle-risk="' + item.id + '">' + (item.status === 'done' ? 'Wieder öffnen' : 'Als erledigt markieren') + '</button>' +
              '</div><button type="button" class="item-remove" data-remove-risk="' + item.id + '" aria-label="Punkt löschen">×</button></div>' +
            '</div>'
          ).join('')
        : '<div class="module-empty">Noch kein Risiko oder offener Punkt erfasst.</div>';

      document.getElementById('update-process').innerHTML = processReady
        ? '<div class="process-card"><span>Interner Ablauf</span><strong>' + escapeHtml(machine.updateProcess.owner) + '</strong><p>' + escapeHtml(machine.updateProcess.procedure) + '</p></div>'
        : '<div class="module-empty">Noch kein interner Ablauf festgelegt.</div>';

      document.getElementById('update-list').innerHTML = machine.updateItems.length
        ? machine.updateItems.map(item =>
            '<div class="risk-item ' + (item.status === 'done' ? 'risk-done' : '') + '">' +
              '<div class="risk-top"><div><strong>' + escapeHtml(item.title) + '</strong><span class="risk-meta">' +
              (item.date ? escapeHtml(formatDate(item.date)) : 'Datum offen') +
              (item.affected ? ' · ' + escapeHtml(item.affected) : '') + '</span></div>' +
              '<span class="risk-pill ' + (item.status === 'done' ? 'done' : 'open') + '">' + (item.status === 'done' ? 'Erledigt' : 'Offen') + '</span></div>' +
              '<p>' +
              '<strong>Schweregrad:</strong> ' + escapeHtml(
                item.severity === 'critical' ? 'Kritisch' :
                item.severity === 'high' ? 'Hoch' :
                item.severity === 'medium' ? 'Mittel' :
                item.severity === 'low' ? 'Niedrig' : 'Nicht bewertet'
              ) + '<br>' +
              (item.assessment ? '<strong>Bewertung:</strong> ' + escapeHtml(item.assessment) + '<br>' : '') +
              '<strong>Maßnahme:</strong> ' + escapeHtml(item.action) +
              (item.patchVersion ? '<br><strong>Patch:</strong> ' + escapeHtml(item.patchVersion) : '') +
              (item.remediatedAt ? '<br><strong>Behoben:</strong> ' + escapeHtml(formatDate(item.remediatedAt)) : '') +
              (item.advisoryReference ? '<br><strong>Sicherheitshinweis:</strong> ' + escapeHtml(item.advisoryReference) : '') + '</p>' +
              '<div class="risk-actions"><div class="risk-action-links">' +
                '<button type="button" class="text-button" data-edit-update="' + item.id + '">Bearbeiten</button>' +
                '<button type="button" class="text-button" data-toggle-update="' + item.id + '">' + (item.status === 'done' ? 'Wieder öffnen' : 'Als erledigt markieren') + '</button>' +
              '</div><button type="button" class="item-remove" data-remove-update="' + item.id + '" aria-label="Sicherheitsproblem löschen">×</button></div>' +
            '</div>'
          ).join('')
        : '<div class="module-empty">Aktuell kein Sicherheitsproblem dokumentiert.</div>';

      document.getElementById('document-list').innerHTML = machine.documentItems.length
        ? machine.documentItems.map(item =>
            '<div class="module-item document-item"><div><strong>' + escapeHtml(item.title) + '</strong><span>' +
            escapeHtml(item.type) + ' · ' + escapeHtml(item.related || 'Gesamtmaschine') +
            (item.date ? ' · ' + escapeHtml(formatDate(item.date)) : '') +
            (item.note ? '<br>' + escapeHtml(item.note) : '') +
            '</span></div><div class="item-actions"><button type="button" class="item-edit" data-edit-document="' + item.id + '">Bearbeiten</button>' +
            '<button type="button" class="item-remove" data-remove-document="' + item.id + '" aria-label="Unterlage löschen">×</button></div></div>'
          ).join('')
        : '<div class="module-empty">Noch keine Unterlage erfasst.</div>';
    };

    const refresh = async message => {
      machine = await backend.loadMachine(id);
      render();
      if (message) showToast(message);
    };

    document.querySelectorAll('[data-close-dialog]').forEach(button => {
      button.addEventListener('click', () => {
        const dialog = document.getElementById(button.dataset.closeDialog);
        if (dialog) dialog.close();
      });
    });

    document.getElementById('cra-machine').addEventListener('click', () => {
      location.href = 'cra.html?id=' + encodeURIComponent(machine.id);
    });

    document.getElementById('open-cra').addEventListener('click', () => {
      location.href = 'cra.html?id=' + encodeURIComponent(machine.id);
    });

    document.getElementById('short-report-machine').addEventListener('click', () => {
      location.href = 'kurzakte.html?id=' + encodeURIComponent(machine.id);
    });

    document.getElementById('print-machine').addEventListener('click', () => {
      location.href = 'produktakte.html?id=' + encodeURIComponent(machine.id);
    });

    document.getElementById('edit-machine').addEventListener('click', () => {
      editMachineForm.elements.name.value = machine.name || '';
      editMachineForm.elements.model.value = machine.model || '';
      editMachineForm.elements.productNumber.value = machine.productNumber || '';
      editMachineForm.elements.owner.value = machine.owner || '';
      editMachineForm.elements.documentRevision.value = machine.documentRevision || 1;
      const softwareChoice = editMachineForm.querySelector('[name="software"][value="' + (machine.software || 'unknown') + '"]');
      const connectedChoice = editMachineForm.querySelector('[name="connected"][value="' + (machine.connected || 'unknown') + '"]');
      if (softwareChoice) softwareChoice.checked = true;
      if (connectedChoice) connectedChoice.checked = true;
      editMachineDialog.showModal();
    });

    editMachineForm.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(editMachineForm);
      const oldSoftware = machine.software;
      machine.name = data.get('name').trim();
      machine.model = data.get('model').trim();
      machine.productNumber = data.get('productNumber').trim();
      machine.owner = data.get('owner').trim();
      machine.software = data.get('software');
      machine.connected = data.get('connected');
      machine.documentRevision = Math.max(1, parseInt(data.get('documentRevision'),10) || 1);
      if (machine.software === 'no') machine.softwareComplete = true;
      if (oldSoftware === 'no' && machine.software !== 'no') machine.softwareComplete = false;
      try {
        await backend.updateMachine(machine);
        editMachineDialog.close();
        await refresh('Maschinendaten wurden gespeichert.');
      } catch (error) {
        console.error(error);
        showToast('Maschinendaten konnten nicht gespeichert werden.');
      }
    });

    document.getElementById('duplicate-machine').addEventListener('click', async () => {
      try {
        const newId = await backend.duplicateMachine(machine);
        location.href = 'maschine.html?id=' + encodeURIComponent(newId);
      } catch (error) {
        console.error(error);
        showToast('Maschine konnte nicht dupliziert werden.');
      }
    });

    document.getElementById('delete-machine').addEventListener('click', () => {
      document.getElementById('delete-machine-name').textContent = machine.name;
      deleteMachineDialog.showModal();
    });

    document.getElementById('confirm-delete-machine').addEventListener('click', async () => {
      try {
        await backend.deleteMachine(machine.id);
        location.href = 'dashboard.html';
      } catch (error) {
        console.error(error);
        showToast('Maschine konnte nicht gelöscht werden.');
      }
    });


    const downloadSbom = () => {
      if (!machine.softwareItems.length) {
        showToast('Keine Softwarekomponente für die SBOM erfasst.');
        return;
      }

      const typeMap = {
        Firmware:'firmware',
        Betriebssystem:'operating-system',
        Software:'application',
        Sonstiges:'library'
      };

      const components = machine.softwareItems.map((item,index) => {
        const component = {
          type:typeMap[item.type] || 'application',
          'bom-ref':'component-' + (index + 1),
          name:item.name,
          version:item.version || undefined,
          supplier:item.vendor ? {name:item.vendor} : undefined
        };
        if (item.purl) component.purl = item.purl;
        return component;
      });

      const topLevelRefs = machine.softwareItems
        .map((item,index) => item.sbomScope !== 'transitive' ? 'component-' + (index + 1) : null)
        .filter(Boolean);

      const bom = {
        bomFormat:'CycloneDX',
        specVersion:'1.6',
        serialNumber:'urn:uuid:' + machine.id,
        version:1,
        metadata:{
          timestamp:new Date().toISOString(),
          component:{type:'device','bom-ref':'product-' + machine.id,name:machine.name,version:machine.model || undefined}
        },
        components,
        dependencies:[
          {'ref':'product-' + machine.id,dependsOn:topLevelRefs},
          ...components.map(component => ({ref:component['bom-ref'],dependsOn:[]}))
        ]
      };

      const blob = new Blob([JSON.stringify(bom,null,2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = ('SBOM-' + machine.name).replace(/[^a-z0-9äöüß_-]+/gi,'-') + '.cdx.json';
      link.click();
      URL.revokeObjectURL(url);
    };

    document.getElementById('download-sbom-machine').addEventListener('click', downloadSbom);

    document.getElementById('add-software').addEventListener('click', () => {
      editingSoftwareId = null;
      softwareForm.reset();
      setDialogMode(softwareDialog, softwareForm, 'Software hinzufügen', 'Hinzufügen');
      softwareDialog.showModal();
    });

    softwareForm.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(softwareForm);
      const values = {
        name:data.get('name').trim(),
        version:data.get('version').trim(),
        type:data.get('type'),
        vendor:data.get('vendor').trim(),
        purl:data.get('purl').trim(),
        sbomScope:data.get('sbomScope') || 'top_level'
      };
      try {
        if (editingSoftwareId) await backend.updateSoftware(editingSoftwareId, values);
        else await backend.addSoftware(machine.id, values);
        machine.softwareComplete = false;
        await backend.updateMachine(machine);
        const wasEditing = Boolean(editingSoftwareId);
        editingSoftwareId = null;
        softwareForm.reset();
        softwareDialog.close();
        await refresh(wasEditing ? 'Software wurde aktualisiert.' : 'Software wurde hinzugefügt.');
      } catch (error) {
        console.error(error);
        showToast('Software konnte nicht gespeichert werden.');
      }
    });

    document.getElementById('software-list').addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit-software]');
      if (edit) {
        const item = machine.softwareItems.find(x => x.id === edit.dataset.editSoftware);
        if (!item) return;
        editingSoftwareId = item.id;
        softwareForm.elements.name.value = item.name;
        softwareForm.elements.version.value = item.version;
        softwareForm.elements.type.value = item.type;
        softwareForm.elements.vendor.value = item.vendor || '';
        softwareForm.elements.purl.value = item.purl || '';
        const sbomChoice = softwareForm.querySelector('[name="sbomScope"][value="' + (item.sbomScope || 'top_level') + '"]');
        if (sbomChoice) sbomChoice.checked = true;
        setDialogMode(softwareDialog, softwareForm, 'Software bearbeiten', 'Änderungen speichern');
        softwareDialog.showModal();
        return;
      }
      const remove = event.target.closest('[data-remove-software]');
      if (!remove) return;
      try {
        await backend.deleteSoftware(remove.dataset.removeSoftware);
        machine.softwareComplete = false;
        await backend.updateMachine(machine);
        await refresh('Software wurde entfernt.');
      } catch (error) {
        console.error(error);
        showToast('Software konnte nicht entfernt werden.');
      }
    });

    document.getElementById('toggle-software-complete').addEventListener('click', async () => {
      if (machine.software === 'no') {
        showToast('Für diese Maschine wurde keine Software / Firmware angegeben.');
        return;
      }
      if (!machine.softwareComplete && machine.softwareItems.length === 0) {
        showToast('Bitte zuerst die vorhandene Software oder Firmware erfassen.');
        return;
      }
      machine.softwareComplete = !machine.softwareComplete;
      await backend.updateMachine(machine);
      await refresh(machine.softwareComplete ? 'Softwareliste wurde als vollständig markiert.' : 'Vollständigkeit der Softwareliste wurde aufgehoben.');
    });

    document.getElementById('add-component').addEventListener('click', () => {
      editingComponentId = null;
      componentForm.reset();
      setDialogMode(componentDialog, componentForm, 'Bauteil hinzufügen', 'Hinzufügen');
      componentDialog.showModal();
    });

    componentForm.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(componentForm);
      const values = {
        name:data.get('name').trim(),
        vendor:data.get('vendor').trim(),
        model:data.get('model').trim(),
        version:data.get('version').trim(),
        documents:data.get('documents')
      };
      try {
        if (editingComponentId) await backend.updateComponent(editingComponentId, values);
        else await backend.addComponent(machine.id, values);
        machine.componentsComplete = false;
        await backend.updateMachine(machine);
        const wasEditing = Boolean(editingComponentId);
        editingComponentId = null;
        componentForm.reset();
        componentDialog.close();
        await refresh(wasEditing ? 'Bauteil wurde aktualisiert.' : 'Bauteil wurde hinzugefügt.');
      } catch (error) {
        console.error(error);
        showToast('Bauteil konnte nicht gespeichert werden.');
      }
    });

    document.getElementById('component-list').addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit-component]');
      if (edit) {
        const item = machine.components.find(x => x.id === edit.dataset.editComponent);
        if (!item) return;
        editingComponentId = item.id;
        componentForm.elements.name.value = item.name;
        componentForm.elements.vendor.value = item.vendor;
        componentForm.elements.model.value = item.model || '';
        componentForm.elements.version.value = item.version || '';
        const choice = componentForm.querySelector('[name="documents"][value="' + (item.documents || 'unknown') + '"]');
        if (choice) choice.checked = true;
        setDialogMode(componentDialog, componentForm, 'Bauteil bearbeiten', 'Änderungen speichern');
        componentDialog.showModal();
        return;
      }
      const remove = event.target.closest('[data-remove-component]');
      if (!remove) return;
      try {
        await backend.deleteComponent(remove.dataset.removeComponent);
        machine.componentsComplete = false;
        await backend.updateMachine(machine);
        await refresh('Bauteil wurde entfernt.');
      } catch (error) {
        console.error(error);
        showToast('Bauteil konnte nicht entfernt werden.');
      }
    });

    document.getElementById('toggle-components-complete').addEventListener('click', async () => {
      machine.componentsComplete = !machine.componentsComplete;
      await backend.updateMachine(machine);
      await refresh(machine.componentsComplete ? 'Bauteilliste wurde als vollständig markiert.' : 'Vollständigkeit der Bauteilliste wurde aufgehoben.');
    });

    document.getElementById('add-risk').addEventListener('click', () => {
      editingRiskId = null;
      riskForm.reset();
      riskForm.elements.level.value = 'Mittel';
      const open = riskForm.querySelector('[name="status"][value="open"]');
      if (open) open.checked = true;
      setDialogMode(riskDialog, riskForm, 'Punkt hinzufügen', 'Hinzufügen');
      riskDialog.showModal();
    });

    riskForm.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(riskForm);
      const values = {
        topic:data.get('topic').trim(),
        level:data.get('level'),
        owner:data.get('owner').trim(),
        measure:data.get('measure').trim(),
        status:data.get('status')
      };
      try {
        if (editingRiskId) await backend.updateRisk(editingRiskId, values);
        else await backend.addRisk(machine.id, values);
        machine.riskReviewComplete = false;
        await backend.updateMachine(machine);
        const wasEditing = Boolean(editingRiskId);
        editingRiskId = null;
        riskForm.reset();
        riskDialog.close();
        await refresh(wasEditing ? 'Risiko / Aufgabe wurde aktualisiert.' : 'Risiko / Aufgabe wurde hinzugefügt.');
      } catch (error) {
        console.error(error);
        showToast('Risiko / Aufgabe konnte nicht gespeichert werden.');
      }
    });

    document.getElementById('risk-list').addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit-risk]');
      if (edit) {
        const item = machine.riskItems.find(x => x.id === edit.dataset.editRisk);
        if (!item) return;
        editingRiskId = item.id;
        riskForm.elements.topic.value = item.topic;
        riskForm.elements.level.value = item.level;
        riskForm.elements.owner.value = item.owner || '';
        riskForm.elements.measure.value = item.measure;
        const choice = riskForm.querySelector('[name="status"][value="' + item.status + '"]');
        if (choice) choice.checked = true;
        setDialogMode(riskDialog, riskForm, 'Punkt bearbeiten', 'Änderungen speichern');
        riskDialog.showModal();
        return;
      }

      const remove = event.target.closest('[data-remove-risk]');
      if (remove) {
        try {
          await backend.deleteRisk(remove.dataset.removeRisk);
          machine.riskReviewComplete = false;
          await backend.updateMachine(machine);
          await refresh('Risiko / Aufgabe wurde entfernt.');
        } catch (error) {
          console.error(error);
          showToast('Punkt konnte nicht entfernt werden.');
        }
        return;
      }

      const toggle = event.target.closest('[data-toggle-risk]');
      if (!toggle) return;
      const item = machine.riskItems.find(x => x.id === toggle.dataset.toggleRisk);
      if (!item) return;
      item.status = item.status === 'done' ? 'open' : 'done';
      if (item.status === 'open') machine.riskReviewComplete = false;
      try {
        await backend.updateRisk(item.id, item);
        await backend.updateMachine(machine);
        await refresh(item.status === 'done' ? 'Punkt wurde erledigt.' : 'Punkt wurde wieder geöffnet.');
      } catch (error) {
        console.error(error);
        showToast('Status konnte nicht geändert werden.');
      }
    });

    document.getElementById('toggle-risk-review').addEventListener('click', async () => {
      const openRisks = machine.riskItems.filter(item => item.status !== 'done').length;
      if (!machine.riskReviewComplete && openRisks > 0) {
        showToast('Bitte zuerst die offenen Risiken und Maßnahmen erledigen.');
        return;
      }
      machine.riskReviewComplete = !machine.riskReviewComplete;
      await backend.updateMachine(machine);
      await refresh(machine.riskReviewComplete ? 'Risikoprüfung wurde abgeschlossen.' : 'Risikoprüfung wurde wieder geöffnet.');
    });

    document.getElementById('set-update-process').addEventListener('click', () => {
      updateProcessForm.elements.owner.value = machine.updateProcess.owner || '';
      updateProcessForm.elements.procedure.value = machine.updateProcess.procedure || '';
      updateProcessDialog.showModal();
    });

    updateProcessForm.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(updateProcessForm);
      try {
        await backend.setUpdateProcess(machine.id, {
          owner:data.get('owner').trim(),
          procedure:data.get('procedure').trim()
        });
        updateProcessDialog.close();
        await refresh('Interner Ablauf wurde gespeichert.');
      } catch (error) {
        console.error(error);
        showToast('Ablauf konnte nicht gespeichert werden.');
      }
    });

    document.getElementById('add-update').addEventListener('click', () => {
      editingUpdateId = null;
      updateForm.reset();
      const open = updateForm.querySelector('[name="status"][value="open"]');
      if (open) open.checked = true;
      setDialogMode(updateDialog, updateForm, 'Problem dokumentieren', 'Speichern');
      updateDialog.showModal();
    });

    updateForm.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(updateForm);
      const values = {
        title:data.get('title').trim(),
        date:data.get('date'),
        affected:data.get('affected').trim(),
        assessment:data.get('assessment').trim(),
        severity:data.get('severity') || 'unknown',
        action:data.get('action').trim(),
        patchVersion:data.get('patchVersion').trim(),
        remediatedAt:data.get('remediatedAt'),
        advisoryReference:data.get('advisoryReference').trim(),
        status:data.get('status')
      };
      if (values.status === 'done' && !values.remediatedAt) {
        showToast('Zum Abschließen bitte das Behebungsdatum eintragen.');
        return;
      }
      if (values.status === 'done' && values.severity === 'unknown') {
        showToast('Zum Abschließen bitte den Schweregrad bewerten.');
        return;
      }
      if (values.status === 'done' && !values.advisoryReference) {
        showToast('Zum Abschließen bitte Sicherheitshinweis / Veröffentlichungsnachweis oder die Begründung einer verzögerten Veröffentlichung dokumentieren.');
        return;
      }
      try {
        if (editingUpdateId) await backend.updateUpdate(editingUpdateId, values);
        else await backend.addUpdate(machine.id, values);
        const wasEditing = Boolean(editingUpdateId);
        editingUpdateId = null;
        updateForm.reset();
        updateDialog.close();
        await refresh(wasEditing ? 'Sicherheitsproblem wurde aktualisiert.' : 'Sicherheitsproblem wurde dokumentiert.');
      } catch (error) {
        console.error(error);
        showToast('Sicherheitsproblem konnte nicht gespeichert werden.');
      }
    });

    document.getElementById('update-list').addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit-update]');
      if (edit) {
        const item = machine.updateItems.find(x => x.id === edit.dataset.editUpdate);
        if (!item) return;
        editingUpdateId = item.id;
        updateForm.elements.title.value = item.title;
        updateForm.elements.date.value = item.date || '';
        updateForm.elements.affected.value = item.affected || '';
        updateForm.elements.assessment.value = item.assessment || '';
        updateForm.elements.severity.value = item.severity || 'unknown';
        updateForm.elements.action.value = item.action;
        updateForm.elements.patchVersion.value = item.patchVersion || '';
        updateForm.elements.remediatedAt.value = item.remediatedAt || '';
        updateForm.elements.advisoryReference.value = item.advisoryReference || '';
        const choice = updateForm.querySelector('[name="status"][value="' + item.status + '"]');
        if (choice) choice.checked = true;
        setDialogMode(updateDialog, updateForm, 'Problem bearbeiten', 'Änderungen speichern');
        updateDialog.showModal();
        return;
      }

      const remove = event.target.closest('[data-remove-update]');
      if (remove) {
        await backend.deleteUpdate(remove.dataset.removeUpdate);
        await refresh('Sicherheitsproblem wurde entfernt.');
        return;
      }

      const toggle = event.target.closest('[data-toggle-update]');
      if (!toggle) return;
      const item = machine.updateItems.find(x => x.id === toggle.dataset.toggleUpdate);
      if (!item) return;
      if (
        item.status !== 'done' &&
        (!item.remediatedAt || item.severity === 'unknown' || !item.advisoryReference)
      ) {
        editingUpdateId = item.id;
        updateForm.elements.title.value = item.title;
        updateForm.elements.date.value = item.date || '';
        updateForm.elements.affected.value = item.affected || '';
        updateForm.elements.assessment.value = item.assessment || '';
        updateForm.elements.severity.value = item.severity || 'unknown';
        updateForm.elements.action.value = item.action || '';
        updateForm.elements.patchVersion.value = item.patchVersion || '';
        updateForm.elements.remediatedAt.value = item.remediatedAt || '';
        updateForm.elements.advisoryReference.value = item.advisoryReference || '';
        const doneChoice = updateForm.querySelector('[name="status"][value="done"]');
        if (doneChoice) doneChoice.checked = true;
        setDialogMode(updateDialog, updateForm, 'Problem abschließen', 'Abschluss speichern');
        updateDialog.showModal();
        showToast('Bitte Schweregrad, Behebungsdatum und Veröffentlichungshinweis vollständig dokumentieren.');
        return;
      }
      item.status = item.status === 'done' ? 'open' : 'done';
      await backend.updateUpdate(item.id, item);
      await refresh(item.status === 'done' ? 'Sicherheitsproblem wurde erledigt.' : 'Sicherheitsproblem wurde wieder geöffnet.');
    });

    document.getElementById('add-document').addEventListener('click', () => {
      editingDocumentId = null;
      documentForm.reset();
      populateDocumentRelated('Gesamtmaschine');
      setDialogMode(documentDialog, documentForm, 'Unterlage hinzufügen', 'Hinzufügen');
      documentDialog.showModal();
    });

    documentForm.addEventListener('submit', async event => {
      event.preventDefault();
      const data = new FormData(documentForm);
      const values = {
        title:data.get('title').trim(),
        type:data.get('type'),
        date:data.get('date'),
        related:data.get('related'),
        note:data.get('note').trim()
      };
      try {
        if (editingDocumentId) await backend.updateDocument(editingDocumentId, values);
        else await backend.addDocument(machine.id, values);
        machine.documentsComplete = false;
        await backend.updateMachine(machine);
        const wasEditing = Boolean(editingDocumentId);
        editingDocumentId = null;
        documentForm.reset();
        documentDialog.close();
        await refresh(wasEditing ? 'Unterlage wurde aktualisiert.' : 'Unterlage wurde zugeordnet.');
      } catch (error) {
        console.error(error);
        showToast('Unterlage konnte nicht gespeichert werden.');
      }
    });

    document.getElementById('document-list').addEventListener('click', async event => {
      const edit = event.target.closest('[data-edit-document]');
      if (edit) {
        const item = machine.documentItems.find(x => x.id === edit.dataset.editDocument);
        if (!item) return;
        editingDocumentId = item.id;
        documentForm.elements.title.value = item.title;
        documentForm.elements.type.value = item.type;
        documentForm.elements.date.value = item.date || '';
        populateDocumentRelated(item.related || 'Gesamtmaschine');
        documentForm.elements.note.value = item.note || '';
        setDialogMode(documentDialog, documentForm, 'Unterlage bearbeiten', 'Änderungen speichern');
        documentDialog.showModal();
        return;
      }
      const remove = event.target.closest('[data-remove-document]');
      if (!remove) return;
      try {
        await backend.deleteDocument(remove.dataset.removeDocument);
        machine.documentsComplete = false;
        await backend.updateMachine(machine);
        await refresh('Unterlage wurde entfernt.');
      } catch (error) {
        console.error(error);
        showToast('Unterlage konnte nicht entfernt werden.');
      }
    });

    document.getElementById('toggle-documents-complete').addEventListener('click', async () => {
      if (!machine.documentsComplete && machine.documentItems.length === 0) {
        showToast('Bitte zuerst mindestens eine vorhandene Unterlage erfassen.');
        return;
      }
      machine.documentsComplete = !machine.documentsComplete;
      await backend.updateMachine(machine);
      await refresh(machine.documentsComplete ? 'Unterlagen wurden als vollständig markiert.' : 'Vollständigkeit wurde aufgehoben.');
    });

    document.getElementById('set-support').addEventListener('click', () => {
      supportForm.elements.startDate.value = machine.supportPeriod.startDate || '';
      supportForm.elements.endDate.value = machine.supportPeriod.endDate || '';
      supportForm.elements.owner.value = machine.supportPeriod.owner || '';
      supportForm.elements.reason.value = machine.supportPeriod.reason || '';
      supportDialog.showModal();
    });

    supportForm.addEventListener('submit', async event => {
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
      try {
        await backend.setSupportPeriod(machine.id, {
          startDate,
          endDate,
          owner:data.get('owner').trim(),
          reason:data.get('reason').trim()
        });
        supportDialog.close();
        await refresh('Unterstützungszeitraum wurde gespeichert.');
      } catch (error) {
        console.error(error);
        showToast('Unterstützungszeitraum konnte nicht gespeichert werden.');
      }
    });

    supportForm.elements.endDate.addEventListener('input', () => {
      supportForm.elements.endDate.setCustomValidity('');
    });

    document.getElementById('guide-show-details').addEventListener('click', () => {
      document.getElementById('machine-details').scrollIntoView({behavior:'smooth', block:'start'});
    });

    document.getElementById('guide-action').addEventListener('click', () => {
      const task = document.getElementById('guide-action').dataset.guideTask;
      const scrollTo = targetId => {
        const target = document.getElementById(targetId);
        if (target) target.scrollIntoView({behavior:'smooth', block:'center'});
      };

      if (task === 'complete') document.getElementById('short-report-machine').click();
      else if (task === 'basic') document.getElementById('edit-machine').click();
      else if (task === 'software') machine.softwareItems.length ? scrollTo('module-software') : document.getElementById('add-software').click();
      else if (task === 'supplier') machine.components.length ? scrollTo('module-supplier') : document.getElementById('add-component').click();
      else if (task === 'risks') scrollTo('module-risks');
      else if (task === 'updates') {
        const ready = Boolean(machine.updateProcess.owner && machine.updateProcess.procedure);
        ready ? scrollTo('module-updates') : document.getElementById('set-update-process').click();
      }
      else if (task === 'documents') machine.documentItems.length ? scrollTo('module-documents') : document.getElementById('add-document').click();
      else if (task === 'support') document.getElementById('set-support').click();
      else if (task === 'cra') location.href = 'cra.html?id=' + encodeURIComponent(machine.id);
    });

    render();
  }

  const page = document.body.dataset.page;
  if (page === 'dashboard') initDashboard();
  if (page === 'machine') initMachine();
})();