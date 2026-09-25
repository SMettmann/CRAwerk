(() => {
  const backend = window.CRAwerkBackend;
  const auth = window.CRAwerkSupabase;
  const form = document.getElementById('cra-form');
  const reportingDialog = document.getElementById('reporting-dialog');
  const reportingForm = document.getElementById('reporting-form');
  const machineId = new URLSearchParams(location.search).get('id');

  let machine = null;
  let company = null;
  let bundle = {assessment:null, requirements:[], reportingEvents:[]};
  let editingReportingId = null;

  const REQUIREMENTS = [
    {key:'I-1', part:'Teil I', title:'Angemessenes Cybersicherheitsniveau', text:'Das Produkt wird auf Grundlage der Risiken mit einem angemessenen Cybersicherheitsniveau konzipiert, entwickelt und hergestellt.'},
    {key:'I-2a', part:'Teil I', title:'Keine bekannten ausnutzbaren Schwachstellen', text:'Beim Inverkehrbringen sind keine bekannten ausnutzbaren Schwachstellen vorhanden.'},
    {key:'I-2b', part:'Teil I', title:'Sichere Standardkonfiguration', text:'Sichere Grundeinstellungen und, soweit zutreffend, Rücksetzung in den Ausgangszustand.'},
    {key:'I-2c', part:'Teil I', title:'Sicherheitsaktualisierungen', text:'Schwachstellen können durch Sicherheitsupdates behoben werden; automatische Updates und Opt-out werden berücksichtigt, soweit zutreffend.'},
    {key:'I-2d', part:'Teil I', title:'Schutz vor unbefugtem Zugriff', text:'Geeignete Authentifizierungs-, Identitäts- oder Zugriffskontrollen und Erkennung möglicher unbefugter Zugriffe.'},
    {key:'I-2e', part:'Teil I', title:'Vertraulichkeit von Daten', text:'Gespeicherte, übertragene oder verarbeitete Daten werden angemessen gegen unbefugte Kenntnisnahme geschützt.'},
    {key:'I-2f', part:'Teil I', title:'Integrität von Daten und Konfigurationen', text:'Daten, Befehle, Programme und Konfigurationen werden vor unbefugter Manipulation geschützt; Beschädigungen können erkannt werden.'},
    {key:'I-2g', part:'Teil I', title:'Datenminimierung', text:'Es werden nur Daten verarbeitet, die für die Zweckbestimmung erforderlich und angemessen sind.'},
    {key:'I-2h', part:'Teil I', title:'Verfügbarkeit & Widerstandsfähigkeit', text:'Wesentliche Funktionen bleiben angemessen verfügbar, auch bei Sicherheitsvorfällen und Überlastungsangriffen.'},
    {key:'I-2i', part:'Teil I', title:'Auswirkungen auf andere Dienste minimieren', text:'Das Produkt beeinträchtigt die Verfügbarkeit anderer Geräte, Netze oder Dienste möglichst wenig.'},
    {key:'I-2j', part:'Teil I', title:'Angriffsfläche begrenzen', text:'Externe Schnittstellen und sonstige Angriffsflächen werden auf das erforderliche Maß begrenzt.'},
    {key:'I-2k', part:'Teil I', title:'Auswirkungen von Vorfällen begrenzen', text:'Geeignete Mechanismen reduzieren die möglichen Auswirkungen einer erfolgreichen Ausnutzung.'},
    {key:'I-2l', part:'Teil I', title:'Sicherheitsrelevante Protokollierung', text:'Relevante interne Vorgänge können aufgezeichnet bzw. überwacht werden; ein Opt-out wird berücksichtigt, soweit erforderlich.'},
    {key:'I-2m', part:'Teil I', title:'Sichere Datenlöschung und Übertragung', text:'Nutzer können Daten und Einstellungen sicher dauerhaft entfernen; Übertragungen erfolgen sicher.'},
    {key:'II-1', part:'Teil II', title:'Komponenten & SBOM', text:'Schwachstellen und Komponenten werden dokumentiert; eine maschinenlesbare SBOM deckt mindestens die obersten Softwareabhängigkeiten ab.'},
    {key:'II-2', part:'Teil II', title:'Schwachstellen unverzüglich behandeln', text:'Schwachstellen werden risikobasiert ohne unnötige Verzögerung behoben, einschließlich Sicherheitsupdates; soweit technisch machbar werden Sicherheitsupdates getrennt von Funktionsupdates bereitgestellt.'},
    {key:'II-3', part:'Teil II', title:'Regelmäßige Sicherheitstests', text:'Die Sicherheit des Produkts wird wirksam und regelmäßig getestet bzw. überprüft.'},
    {key:'II-4', part:'Teil II', title:'Information zu behobenen Schwachstellen', text:'Nach Bereitstellung eines Sicherheitsupdates werden Beschreibung, betroffenes Produkt, Auswirkungen, Schwere und Hinweise zur Behebung veröffentlicht; eine Verzögerung wird nur begründet dokumentiert.'},
    {key:'II-5', part:'Teil II', title:'Koordinierte Offenlegung (CVD)', text:'Eine Strategie zur koordinierten Offenlegung von Schwachstellen ist festgelegt und wird umgesetzt.'},
    {key:'II-6', part:'Teil II', title:'Kontakt & Informationsaustausch zu Schwachstellen', text:'Der Austausch über mögliche Schwachstellen im Produkt und in Drittkomponenten wird ermöglicht; dafür steht eine erreichbare Kontaktadresse bereit.'},
    {key:'II-7', part:'Teil II', title:'Sichere Update-Verteilung', text:'Updates werden über Mechanismen verteilt, die eine sichere und zeitnahe Behebung ermöglichen.'},
    {key:'II-8', part:'Teil II', title:'Sicherheitsupdates bereitstellen', text:'Verfügbare Sicherheitsupdates werden ohne unnötige Verzögerung, grundsätzlich kostenfrei und mit verständlichen Hinweisen zu erforderlichen Nutzermaßnahmen bereitgestellt; zulässige B2B-Sondervereinbarungen werden dokumentiert.'}
  ];

  const labels = {
    unset:'Offen',
    standard:'Standardprodukt',
    important_i:'Wichtig · Klasse I',
    important_ii:'Wichtig · Klasse II',
    critical:'Kritisch',
    module_a:'Modul A',
    module_bc:'Modul B + C',
    module_h:'Modul H',
    eu_certification:'EU-Cybersicherheitszertifizierung'
  };

  const escapeHtml = (value = '') => String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  const showToast = message => {
    const toast = document.getElementById('app-toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(window.__craToast);
    window.__craToast = setTimeout(() => toast.hidden = true, 3000);
  };

  const getAssessmentFromForm = () => {
    const data = new FormData(form);
    const names = [
      'classification','classificationCategory','classificationReason','standardsCoverage','conformityRoute',
      'intendedPurpose','securityEnvironment','securityProperties','foreseeableMisuse','architectureDescription',
      'hardwareVisualsReference','productionMonitoringProcess','appliedStandards','testReportsSummary',
      'vulnerabilityContact','cvdPolicy','secureUpdateDistribution','secureCommissioning','securityChangeEffects',
      'updateInstallation','secureDecommissioning','automaticUpdatesOptOut','integratorInformation','supportType',
      'declarationUrl','ceStatus','ceMarkingLocation','euDeclarationStatus','declarationPlace','declarationDate',
      'declarationSigner','declarationFunction','notifiedBodyName','notifiedBodyNumber','certificateReference',
      'otherUnionLegislation'
    ];
    return Object.fromEntries(names.map(name => [name, String(data.get(name) || '').trim()]));
  };

  const fillAssessment = value => {
    const a = value || {};
    Object.entries({
      classification:a.classification || 'unset',
      classificationCategory:a.classificationCategory || '',
      classificationReason:a.classificationReason || '',
      standardsCoverage:a.standardsCoverage || 'unknown',
      conformityRoute:a.conformityRoute || 'unset',
      intendedPurpose:a.intendedPurpose || '',
      securityEnvironment:a.securityEnvironment || '',
      securityProperties:a.securityProperties || '',
      foreseeableMisuse:a.foreseeableMisuse || '',
      architectureDescription:a.architectureDescription || '',
      hardwareVisualsReference:a.hardwareVisualsReference || '',
      productionMonitoringProcess:a.productionMonitoringProcess || '',
      appliedStandards:a.appliedStandards || '',
      testReportsSummary:a.testReportsSummary || '',
      vulnerabilityContact:a.vulnerabilityContact || '',
      cvdPolicy:a.cvdPolicy || '',
      secureUpdateDistribution:a.secureUpdateDistribution || '',
      secureCommissioning:a.secureCommissioning || '',
      securityChangeEffects:a.securityChangeEffects || '',
      updateInstallation:a.updateInstallation || '',
      secureDecommissioning:a.secureDecommissioning || '',
      automaticUpdatesOptOut:a.automaticUpdatesOptOut || '',
      integratorInformation:a.integratorInformation || '',
      supportType:a.supportType || '',
      declarationUrl:a.declarationUrl || '',
      ceStatus:a.ceStatus || 'open',
      ceMarkingLocation:a.ceMarkingLocation || '',
      euDeclarationStatus:a.euDeclarationStatus || 'open',
      declarationPlace:a.declarationPlace || '',
      declarationDate:a.declarationDate || '',
      declarationSigner:a.declarationSigner || '',
      declarationFunction:a.declarationFunction || '',
      notifiedBodyName:a.notifiedBodyName || '',
      notifiedBodyNumber:a.notifiedBodyNumber || '',
      certificateReference:a.certificateReference || '',
      otherUnionLegislation:a.otherUnionLegislation || ''
    }).forEach(([name,value]) => {
      if (form.elements[name]) form.elements[name].value = value;
    });
  };

  const getRequirementValue = key => bundle.requirements.find(item => item.key === key) || {
    key, status:'open', justification:'', evidence:''
  };

  const renderRequirements = () => {
    const root = document.getElementById('requirements-list');
    root.innerHTML = REQUIREMENTS.map(req => {
      const current = getRequirementValue(req.key);
      return '<article class="requirement-card" data-requirement="' + escapeHtml(req.key) + '">' +
        '<div class="requirement-head"><div><span>' + escapeHtml(req.part + ' · ' + req.key) + '</span><strong>' +
        escapeHtml(req.title) + '</strong></div>' +
        '<select data-req-status>' +
          '<option value="open"' + (current.status === 'open' ? ' selected' : '') + '>Offen</option>' +
          '<option value="fulfilled"' + (current.status === 'fulfilled' ? ' selected' : '') + '>Erfüllt</option>' +
          '<option value="not_applicable"' + (current.status === 'not_applicable' ? ' selected' : '') + '>Nicht anwendbar</option>' +
        '</select></div>' +
        '<p>' + escapeHtml(req.text) + '</p>' +
        '<div class="requirement-fields">' +
          '<label><span>Begründung / Bewertung</span><textarea data-req-justification rows="2">' + escapeHtml(current.justification) + '</textarea></label>' +
          '<label><span>Nachweis / Verweis</span><input data-req-evidence value="' + escapeHtml(current.evidence) + '" placeholder="Dokument, Test, Zeichnung, Ticket ..."></label>' +
        '</div>' +
      '</article>';
    }).join('');
    updateCounters();
  };

  const readRequirements = () => [...document.querySelectorAll('[data-requirement]')].map(card => ({
    key:card.dataset.requirement,
    status:card.querySelector('[data-req-status]').value,
    justification:card.querySelector('[data-req-justification]').value.trim(),
    evidence:card.querySelector('[data-req-evidence]').value.trim()
  }));

  const requirementIsDocumented = item =>
    item.status !== 'open' &&
    (item.status !== 'not_applicable' || item.justification.length > 0) &&
    (item.status !== 'fulfilled' || item.justification.length > 0 || item.evidence.length > 0);

  const conformityGuidance = assessment => {
    if (assessment.classification === 'unset') {
      return {
        title:'Einstufung zuerst festlegen',
        text:'Ohne Produktklasse kann CRAwerk den zulässigen Konformitätsweg nicht einordnen.'
      };
    }
    if (assessment.classification === 'standard') {
      return {
        title:'Standardprodukt',
        text:'Für Standardprodukte ist die interne Kontrolle nach Modul A grundsätzlich möglich. Alternativ kommen B+C, Modul H oder ein anwendbares europäisches Cybersicherheitszertifizierungsschema in Betracht.'
      };
    }
    if (assessment.classification === 'important_i') {
      if (assessment.standardsCoverage === 'full') {
        return {
          title:'Klasse I · vollständige Abdeckung dokumentiert',
          text:'Bei vollständiger Anwendung der einschlägigen harmonisierten Normen, gemeinsamen Spezifikationen oder geeigneten Zertifizierung kann der allgemeine Weg einschließlich Modul A in Betracht kommen.'
        };
      }
      return {
        title:'Klasse I · Drittbewertung einplanen',
        text:'Wenn die einschlägigen harmonisierten Normen, gemeinsamen Spezifikationen oder geeigneten Zertifizierungsschemata nicht vollständig angewandt werden, sind für die betreffenden Anforderungen B+C oder Modul H erforderlich.'
      };
    }
    if (assessment.classification === 'important_ii') {
      return {
        title:'Klasse II',
        text:'Für Klasse II kommen B+C, Modul H oder – sofern verfügbar und anwendbar – ein europäisches Cybersicherheitszertifizierungsschema mindestens auf der erforderlichen Vertrauenswürdigkeitsstufe in Betracht.'
      };
    }
    return {
      title:'Kritisches Produkt',
      text:'Für kritische Produkte ist ein einschlägiges europäisches Cybersicherheitszertifizierungsschema maßgeblich, soweit die Voraussetzungen nach Artikel 8 greifen; andernfalls gelten die für Klasse II vorgesehenen Verfahren.'
    };
  };

  const routeLooksValid = assessment => {
    const route = assessment.conformityRoute;
    if (route === 'unset' || assessment.classification === 'unset') return false;
    if (assessment.classification === 'standard') return true;
    if (assessment.classification === 'important_i') {
      if (route === 'module_a') return assessment.standardsCoverage === 'full';
      return ['module_bc','module_h','eu_certification'].includes(route);
    }
    return ['module_bc','module_h','eu_certification'].includes(route);
  };

  const renderGuidance = () => {
    const a = getAssessmentFromForm();
    const guide = conformityGuidance(a);
    const valid = routeLooksValid(a);
    document.getElementById('conformity-guidance').innerHTML =
      '<div><span>ERMITTELTER RAHMEN</span><strong>' + escapeHtml(guide.title) + '</strong><p>' +
      escapeHtml(guide.text) + '</p></div>' +
      '<span class="cra-route-check ' + (valid ? 'ok' : 'open') + '">' +
      (valid ? 'Gewählter Weg passt zur Einstufung' : 'Konformitätsweg noch prüfen') + '</span>';
  };

  const declarationComplete = assessment => Boolean(
    assessment &&
    assessment.euDeclarationStatus === 'signed' &&
    assessment.declarationPlace &&
    assessment.declarationDate &&
    assessment.declarationSigner &&
    assessment.declarationFunction
  );

  const conformityDetailsComplete = assessment => {
    if (!assessment || assessment.conformityRoute === 'unset') return false;
    if (assessment.conformityRoute === 'module_a') return true;
    if (['module_bc','module_h'].includes(assessment.conformityRoute)) {
      return Boolean(assessment.notifiedBodyName && assessment.notifiedBodyNumber && assessment.certificateReference);
    }
    if (assessment.conformityRoute === 'eu_certification') {
      return Boolean(assessment.certificateReference);
    }
    return false;
  };

  const annexViiChecks = (assessment, requirements) => {
    const annexIComplete = requirements.length === REQUIREMENTS.length && requirements.every(requirementIsDocumented);
    const userInfo = [
      assessment.secureCommissioning,
      assessment.securityChangeEffects,
      assessment.updateInstallation,
      assessment.secureDecommissioning,
      assessment.automaticUpdatesOptOut,
      assessment.supportType
    ].every(Boolean);

    return [
      {
        title:'1. Allgemeine Produktbeschreibung & Nutzerinformationen',
        done:Boolean(assessment.intendedPurpose && assessment.securityEnvironment && assessment.securityProperties &&
          assessment.foreseeableMisuse && assessment.hardwareVisualsReference && userInfo)
      },
      {
        title:'2. Konzeption, Entwicklung, Produktion & Schwachstellenverfahren',
        done:Boolean(assessment.architectureDescription && assessment.productionMonitoringProcess &&
          assessment.vulnerabilityContact && assessment.cvdPolicy && assessment.secureUpdateDistribution &&
          (machine.software === 'no' || (machine.softwareComplete && machine.softwareItems.length)))
      },
      {
        title:'3. Cybersicherheitsrisikobewertung & Anwendbarkeit Anhang I',
        done:Boolean(machine.riskReviewComplete && annexIComplete)
      },
      {
        title:'4. Begründung des Unterstützungszeitraums',
        done:Boolean(machine.supportPeriod.startDate && machine.supportPeriod.endDate &&
          machine.supportPeriod.owner && machine.supportPeriod.reason)
      },
      {
        title:'5. Normen, Spezifikationen, Zertifizierungen oder technische Lösungen',
        done:Boolean(assessment.appliedStandards)
      },
      {
        title:'6. Berichte über durchgeführte Prüfungen',
        done:Boolean(assessment.testReportsSummary)
      },
      {
        title:'7. EU-Konformitätserklärung',
        done:declarationComplete(assessment) && conformityDetailsComplete(assessment) &&
          assessment.ceStatus === 'marked' && Boolean(assessment.ceMarkingLocation)
      },
      {
        title:'8. Software-Stückliste (soweit anwendbar)',
        done:machine.software === 'no' || Boolean(machine.softwareComplete && machine.softwareItems.length)
      }
    ];
  };

  const renderAnnexVii = () => {
    const assessment = getAssessmentFromForm();
    const requirements = readRequirements();
    const checks = annexViiChecks(assessment, requirements);
    document.getElementById('annex-vii-list').innerHTML = checks.map(item =>
      '<div class="annex-vii-row ' + (item.done ? 'done' : 'open') + '">' +
        '<span>' + (item.done ? '✓' : '•') + '</span><strong>' + escapeHtml(item.title) + '</strong>' +
        '<b>' + (item.done ? 'Belegt' : 'Offen') + '</b>' +
      '</div>'
    ).join('');
    document.getElementById('annex-vii-counter').textContent =
      checks.filter(item => item.done).length + ' / ' + checks.length + ' belegt';
  };

  const updateCounters = () => {
    const requirements = readRequirements();
    const assessed = requirements.filter(item => item.status !== 'open').length;
    document.getElementById('requirements-counter').textContent = assessed + ' / ' + REQUIREMENTS.length + ' bewertet';
    document.getElementById('summary-annex-i').textContent = assessed + ' / ' + REQUIREMENTS.length;

    const a = getAssessmentFromForm();
    document.getElementById('summary-classification').textContent = labels[a.classification] || 'Offen';
    document.getElementById('summary-route').textContent =
      a.conformityRoute === 'unset' ? 'Konformitätsweg offen' : labels[a.conformityRoute];

    if (machine) {
      const checks = annexViiChecks(a, requirements);
      document.getElementById('summary-annex-vii').textContent =
        checks.filter(item => item.done).length + ' / ' + checks.length;
    }

    const openReporting = bundle.reportingEvents.filter(item => item.status !== 'closed').length;
    document.getElementById('summary-reporting').textContent = openReporting + ' offen';
  };

  const toLocalInput = value => {
    if (!value) return '';
    const date = new Date(value);
    const pad = n => String(n).padStart(2,'0');
    return date.getFullYear() + '-' + pad(date.getMonth()+1) + '-' + pad(date.getDate()) + 'T' +
      pad(date.getHours()) + ':' + pad(date.getMinutes());
  };

  const toIsoOrNull = value => value ? new Date(value).toISOString() : '';

  const addHours = (value, hours) => {
    const d = new Date(value);
    d.setHours(d.getHours() + hours);
    return d;
  };

  const addDays = (value, days) => {
    const d = new Date(value);
    d.setDate(d.getDate() + days);
    return d;
  };

  const addMonth = value => {
    const d = new Date(value);
    d.setMonth(d.getMonth() + 1);
    return d;
  };

  const formatDateTime = value => value
    ? new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))
    : '–';

  const dueState = (actual, due) => {
    if (!due) return {label:'noch nicht berechenbar', className:'open'};
    if (actual) {
      return new Date(actual) <= due
        ? {label:'fristgerecht dokumentiert', className:'ok'}
        : {label:'nach Frist dokumentiert', className:'late'};
    }
    return new Date() <= due
      ? {label:'fällig ' + formatDateTime(due), className:'open'}
      : {label:'Frist überschritten · ' + formatDateTime(due), className:'late'};
  };

  const renderReporting = () => {
    const root = document.getElementById('reporting-list');
    if (!bundle.reportingEvents.length) {
      root.innerHTML = '<div class="module-empty">Kein CRA-Meldevorgang angelegt.</div>';
      updateCounters();
      return;
    }

    root.innerHTML = bundle.reportingEvents.map(item => {
      const earlyDue = addHours(item.awarenessAt, 24);
      const fullDue = addHours(item.awarenessAt, 72);
      const finalDue = item.eventType === 'actively_exploited_vulnerability'
        ? (item.correctiveMeasureAvailableAt ? addDays(item.correctiveMeasureAvailableAt, 14) : null)
        : addMonth(item.fullNotificationAt || fullDue);

      const early = dueState(item.earlyWarningAt, earlyDue);
      const full = dueState(item.fullNotificationAt, fullDue);
      const finalState = dueState(item.finalReportAt, finalDue);

      return '<article class="reporting-card">' +
        '<div class="reporting-head"><div><span>' +
          (item.eventType === 'actively_exploited_vulnerability' ? 'AKTIV AUSGENUTZTE SCHWACHSTELLE' : 'SCHWERWIEGENDER SICHERHEITSVORFALL') +
          '</span><strong>' + escapeHtml(item.title) + '</strong></div>' +
          '<span class="risk-pill ' + (item.status === 'closed' ? 'done' : 'open') + '">' +
          (item.status === 'closed' ? 'Abgeschlossen' : 'Offen') + '</span></div>' +
        (item.affectedVersion ? '<p>Betroffen: ' + escapeHtml(item.affectedVersion) + '</p>' : '') +
        '<div class="reporting-deadlines">' +
          '<div><span>24 h</span><strong class="' + early.className + '">' + escapeHtml(early.label) + '</strong></div>' +
          '<div><span>72 h</span><strong class="' + full.className + '">' + escapeHtml(full.label) + '</strong></div>' +
          '<div><span>Abschluss</span><strong class="' + finalState.className + '">' + escapeHtml(finalState.label) + '</strong></div>' +
        '</div>' +
        '<div class="risk-actions"><div class="risk-action-links">' +
          '<button type="button" class="text-button" data-edit-reporting="' + item.id + '">Bearbeiten</button>' +
        '</div><button type="button" class="item-remove" data-remove-reporting="' + item.id + '">×</button></div>' +
      '</article>';
    }).join('');
    updateCounters();
  };

  const downloadSbom = () => {
    if (!machine.softwareItems.length) {
      showToast('Keine Softwarekomponente für die SBOM erfasst.');
      return;
    }

    const rootRef = 'urn:uuid:' + machine.id;
    const components = machine.softwareItems.map((item,index) => {
      const ref = 'component-' + (index + 1);
      const typeMap = {
        Firmware:'firmware',
        Betriebssystem:'operating-system',
        Software:'application',
        Sonstiges:'library'
      };
      const component = {
        type:typeMap[item.type] || 'application',
        'bom-ref':ref,
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
      serialNumber:rootRef,
      version:1,
      metadata:{
        timestamp:new Date().toISOString(),
        manufacturer:company?.name ? {name:company.name} : undefined,
        component:{
          type:'device',
          'bom-ref':'product-' + machine.id,
          name:machine.name,
          version:machine.model || undefined
        }
      },
      components,
      dependencies:[
        {'ref':'product-' + machine.id, dependsOn:topLevelRefs},
        ...components.map(component => ({ref:component['bom-ref'], dependsOn:[]}))
      ]
    };

    const json = JSON.stringify(bom, null, 2);
    const blob = new Blob([json], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = ('SBOM-' + machine.name).replace(/[^a-z0-9äöüß_-]+/gi,'-') + '.cdx.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateBeforeSave = (assessment, requirements) => {
    if (
      assessment.classification !== 'unset' &&
      assessment.conformityRoute !== 'unset' &&
      !routeLooksValid(assessment)
    ) {
      return 'Der gewählte Konformitätsweg passt noch nicht zur dokumentierten Einstufung bzw. Normenabdeckung.';
    }
    const invalidNa = requirements.find(item => item.status === 'not_applicable' && !item.justification);
    if (invalidNa) return 'Bei „Nicht anwendbar“ braucht ' + invalidNa.key + ' eine Begründung.';
    return '';
  };

  const saveAll = async () => {
    const assessment = getAssessmentFromForm();
    const requirements = readRequirements();
    const validation = validateBeforeSave(assessment, requirements);
    if (validation) {
      showToast(validation);
      return false;
    }

    const buttons = [...document.querySelectorAll('#save-cra-top, #cra-form button[type="submit"]')];
    buttons.forEach(button => button.disabled = true);
    try {
      bundle.assessment = await backend.saveCraAssessment(machine.id, assessment);
      await backend.saveCraRequirements(machine.id, requirements);
      bundle.requirements = requirements;
      document.getElementById('cra-save-state').textContent = 'CRA-Stand gespeichert';
      showToast('CRA-Stand wurde gespeichert.');
      renderGuidance();
      renderAnnexVii();
      updateCounters();
      return true;
    } catch (error) {
      console.error(error);
      showToast('CRA-Stand konnte nicht gespeichert werden.');
      return false;
    } finally {
      buttons.forEach(button => button.disabled = false);
    }
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    await saveAll();
  });

  document.getElementById('save-cra-top').addEventListener('click', saveAll);
  document.getElementById('download-sbom').addEventListener('click', downloadSbom);

  ['classification','standardsCoverage','conformityRoute'].forEach(name => {
    form.elements[name].addEventListener('change', () => {
      renderGuidance();
      updateCounters();
    });
  });

  document.getElementById('requirements-list').addEventListener('input', () => {
    updateCounters();
    renderAnnexVii();
  });
  document.getElementById('requirements-list').addEventListener('change', () => {
    updateCounters();
    renderAnnexVii();
  });

  form.addEventListener('input', () => {
    document.getElementById('cra-save-state').textContent = 'Änderungen noch nicht gespeichert';
    renderAnnexVii();
    updateCounters();
  });

  document.getElementById('add-reporting-event').addEventListener('click', () => {
    editingReportingId = null;
    reportingForm.reset();
    reportingForm.elements.status.value = 'open';
    document.getElementById('reporting-dialog-title').textContent = 'Meldevorgang anlegen';
    reportingDialog.showModal();
  });
  document.getElementById('reporting-close').addEventListener('click', () => reportingDialog.close());
  document.getElementById('reporting-cancel').addEventListener('click', () => reportingDialog.close());

  reportingForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(reportingForm);
    const value = {
      eventType:data.get('eventType'),
      title:data.get('title').trim(),
      affectedVersion:data.get('affectedVersion').trim(),
      assessment:data.get('assessment').trim(),
      awarenessAt:toIsoOrNull(data.get('awarenessAt')),
      earlyWarningAt:toIsoOrNull(data.get('earlyWarningAt')),
      fullNotificationAt:toIsoOrNull(data.get('fullNotificationAt')),
      correctiveMeasureAvailableAt:toIsoOrNull(data.get('correctiveMeasureAvailableAt')),
      finalReportAt:toIsoOrNull(data.get('finalReportAt')),
      notes:data.get('notes').trim(),
      status:data.get('status')
    };

    try {
      if (editingReportingId) await backend.updateReportingEvent(editingReportingId, value);
      else await backend.addReportingEvent(machine.id, value);
      bundle = await backend.loadCraBundle(machine.id);
      reportingDialog.close();
      renderReporting();
      showToast('Meldevorgang wurde gespeichert.');
    } catch (error) {
      console.error(error);
      showToast('Meldevorgang konnte nicht gespeichert werden.');
    }
  });

  document.getElementById('reporting-list').addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit-reporting]');
    if (edit) {
      const item = bundle.reportingEvents.find(row => row.id === edit.dataset.editReporting);
      if (!item) return;
      editingReportingId = item.id;
      reportingForm.elements.eventType.value = item.eventType;
      reportingForm.elements.title.value = item.title;
      reportingForm.elements.affectedVersion.value = item.affectedVersion || '';
      reportingForm.elements.assessment.value = item.assessment || '';
      reportingForm.elements.awarenessAt.value = toLocalInput(item.awarenessAt);
      reportingForm.elements.earlyWarningAt.value = toLocalInput(item.earlyWarningAt);
      reportingForm.elements.fullNotificationAt.value = toLocalInput(item.fullNotificationAt);
      reportingForm.elements.correctiveMeasureAvailableAt.value = toLocalInput(item.correctiveMeasureAvailableAt);
      reportingForm.elements.finalReportAt.value = toLocalInput(item.finalReportAt);
      reportingForm.elements.notes.value = item.notes || '';
      reportingForm.elements.status.value = item.status;
      document.getElementById('reporting-dialog-title').textContent = 'Meldevorgang bearbeiten';
      reportingDialog.showModal();
      return;
    }

    const remove = event.target.closest('[data-remove-reporting]');
    if (!remove) return;
    try {
      await backend.deleteReportingEvent(remove.dataset.removeReporting);
      bundle = await backend.loadCraBundle(machine.id);
      renderReporting();
      showToast('Meldevorgang wurde entfernt.');
    } catch (error) {
      console.error(error);
      showToast('Meldevorgang konnte nicht entfernt werden.');
    }
  });

  const init = async () => {
    const session = await auth.requireSession();
    if (!session) return;

    [machine, company, bundle] = await Promise.all([
      backend.loadMachine(machineId),
      backend.currentCompany(),
      backend.loadCraBundle(machineId)
    ]);

    if (!machine) {
      location.replace('dashboard.html');
      return;
    }

    try {
      if (await backend.isSystemAdmin()) {
        document.querySelectorAll('[data-system-admin-link]').forEach(link => link.hidden = false);
      }
    } catch {}

    document.title = 'CRA-Prüfung ' + machine.name + ' – CRAwerk';
    document.getElementById('cra-machine-name').textContent = machine.name;
    document.getElementById('cra-company-name').textContent = company.name || 'Unternehmen';
    document.getElementById('cra-back').href = 'maschine.html?id=' + encodeURIComponent(machine.id);
    document.getElementById('back-to-updates').href = 'maschine.html?id=' + encodeURIComponent(machine.id) + '#module-updates';
    document.getElementById('open-declaration').href = 'konformitaet.html?id=' + encodeURIComponent(machine.id);
    document.getElementById('existing-update-count').textContent =
      machine.updateItems.length + (machine.updateItems.length === 1 ? ' Eintrag' : ' Einträge');

    fillAssessment(bundle.assessment);
    renderRequirements();
    renderGuidance();
    renderReporting();
    renderAnnexVii();
    updateCounters();
  };

  init().catch(error => {
    console.error(error);
    showToast('CRA-Prüfung konnte nicht geladen werden.');
  });
})();