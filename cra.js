(() => {
  const backend = window.CRAwerkBackend;
  const auth = window.CRAwerkSupabase;
  const form = document.getElementById('cra-form');
  const reportingDialog = document.getElementById('reporting-dialog');
  const reportingForm = document.getElementById('reporting-form');
  const nonconformityDialog = document.getElementById('nonconformity-dialog');
  const nonconformityForm = document.getElementById('nonconformity-form');
  const authorityRequestDialog = document.getElementById('authority-request-dialog');
  const authorityRequestForm = document.getElementById('authority-request-form');
  const machineId = new URLSearchParams(location.search).get('id');

  let machine = null;
  let company = null;
  let bundle = {assessment:null, requirements:[], reportingEvents:[], nonconformityEvents:[], authorityRequests:[]};
  let editingReportingId = null;
  let editingNonconformityId = null;
  let editingAuthorityRequestId = null;

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

  const REQUIREMENT_QUESTIONS = {
    'I-1':'Passt das Sicherheitsniveau zum tatsächlichen Risiko?',
    'I-2a':'Sind keine bekannten ausnutzbaren Schwachstellen mehr offen?',
    'I-2b':'Startet die Maschine mit sicheren Grundeinstellungen?',
    'I-2c':'Können Sicherheitsupdates sicher eingespielt werden?',
    'I-2d':'Ist unbefugter Zugriff ausreichend verhindert?',
    'I-2e':'Sind vertrauliche Daten geschützt?',
    'I-2f':'Sind Daten, Befehle und Einstellungen gegen Manipulation geschützt?',
    'I-2g':'Verarbeitet die Maschine nur Daten, die sie wirklich braucht?',
    'I-2h':'Bleiben wichtige Funktionen bei Angriffen möglichst verfügbar?',
    'I-2i':'Kann die Maschine andere Geräte oder Netze unnötig beeinträchtigen?',
    'I-2j':'Sind Schnittstellen und Angriffsflächen auf das Nötige begrenzt?',
    'I-2k':'Werden Folgen eines erfolgreichen Angriffs begrenzt?',
    'I-2l':'Können wichtige Sicherheitsereignisse nachvollzogen werden?',
    'I-2m':'Können Daten sicher gelöscht und übertragen werden?',
    'II-1':'Sind Softwarekomponenten und Abhängigkeiten nachvollziehbar?',
    'II-2':'Werden gefundene Schwachstellen zügig behoben?',
    'II-3':'Wird die Produktsicherheit regelmäßig geprüft?',
    'II-4':'Werden Kunden über behobene Schwachstellen informiert?',
    'II-5':'Gibt es einen festen Ablauf für gemeldete Schwachstellen?',
    'II-6':'Gibt es eine erreichbare Stelle für Sicherheitsmeldungen?',
    'II-7':'Werden Sicherheitsupdates sicher verteilt?',
    'II-8':'Werden Sicherheitsupdates rechtzeitig und verständlich bereitgestellt?'
  };

  const REQUIREMENT_GROUPS = [
    {id:'access', title:'Zugriff & Grundeinstellungen', help:'Wer darf hinein und wie sicher startet die Maschine?', keys:['I-2b','I-2d','I-2j','I-2k','I-2l']},
    {id:'data', title:'Daten & Kommunikation', help:'Sind Daten geschützt und auf das Nötige begrenzt?', keys:['I-2e','I-2f','I-2g','I-2m']},
    {id:'resilience', title:'Betrieb & Widerstandsfähigkeit', help:'Bleibt die Maschine auch bei Problemen kontrollierbar?', keys:['I-1','I-2h','I-2i']},
    {id:'updates', title:'Software, Updates & Komponenten', help:'Sind Versionen bekannt und können Lücken behoben werden?', keys:['I-2a','I-2c','II-1','II-2','II-7','II-8']},
    {id:'process', title:'Prüfen & Schwachstellen bearbeiten', help:'Gibt es einen festen Herstellerprozess?', keys:['II-3','II-4','II-5','II-6']}
  ];

  const GUIDE_STEPS = [
    {title:'Produkt einordnen', help:'Ordnen Sie die Maschine ein und wählen Sie den dazu passenden Konformitätsweg.'},
    {title:'Schutz prüfen', help:'Beantworten Sie die Sicherheitsfragen blockweise. Sie müssen nicht alles auf einmal erledigen.'},
    {title:'Maschine beschreiben', help:'Kurze, verständliche Angaben reichen. CRAwerk verwendet vorhandene Daten automatisch weiter.'},
    {title:'Sicherheitsprozess festhalten', help:'Beschreiben Sie den festen Ablauf für Meldungen, Zulieferer und Sicherheitsupdates.'},
    {title:'Konformität abschließen', help:'Dokumentieren Sie CE und die unterschriebene EU-Konformitätserklärung.'},
    {title:'Akte prüfen', help:'Hier sehen Sie nur noch, welche Dokumentationsbereiche vollständig sind und was noch fehlt.'}
  ];

  let currentGuideStep = 0;
  let activeSpecialCase = '';

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
      'hardwareVisualsReference','productionMonitoringProcess','appliedStandards','testReportsSummary','retentionProcess',
      'vulnerabilityContact','cvdPolicy','cvdPolicyLocation','secureUpdateDistribution','thirdPartyComponentProcess','secureCommissioning','securityChangeEffects',
      'updateInstallation','secureDecommissioning','automaticUpdatesOptOut','integratorInformation','supportType',
      'declarationUrl','ceStatus','ceMarkingLocation','euDeclarationStatus','declarationPlace','declarationDate',
      'declarationSigner','declarationFunction','declarationSignedCopyReference','notifiedBodyName','notifiedBodyNumber','certificateReference',
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
      retentionProcess:a.retentionProcess || '',
      vulnerabilityContact:a.vulnerabilityContact || '',
      cvdPolicy:a.cvdPolicy || '',
      cvdPolicyLocation:a.cvdPolicyLocation || '',
      secureUpdateDistribution:a.secureUpdateDistribution || '',
      thirdPartyComponentProcess:a.thirdPartyComponentProcess || '',
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
      declarationSignedCopyReference:a.declarationSignedCopyReference || '',
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

    root.innerHTML = REQUIREMENT_GROUPS.map((group, groupIndex) => {
      const groupRequirements = group.keys
        .map(key => REQUIREMENTS.find(item => item.key === key))
        .filter(Boolean);
      const completeCount = groupRequirements.filter(req => requirementIsDocumented(getRequirementValue(req.key))).length;
      const hasOpen = completeCount < groupRequirements.length;

      const cards = groupRequirements.map(req => {
        const current = getRequirementValue(req.key);
        const question = REQUIREMENT_QUESTIONS[req.key] || req.title;
        return '<article class="requirement-card" data-requirement="' + escapeHtml(req.key) + '">' +
          '<div class="requirement-head"><div><span>Prüffrage</span><strong>' +
          escapeHtml(question) + '</strong></div>' +
          '<select data-req-status aria-label="Status ' + escapeHtml(question) + '">' +
            '<option value="open"' + (current.status === 'open' ? ' selected' : '') + '>Noch offen</option>' +
            '<option value="fulfilled"' + (current.status === 'fulfilled' ? ' selected' : '') + '>Ja – erfüllt</option>' +
            '<option value="not_applicable"' + (current.status === 'not_applicable' ? ' selected' : '') + '>Trifft nicht zu</option>' +
          '</select></div>' +
          '<details class="requirement-explain"><summary>Was ist damit gemeint?</summary><p>' +
            escapeHtml(req.text) + '</p><small>CRA ' + escapeHtml(req.part + ' · ' + req.key) + '</small></details>' +
          '<div class="requirement-fields">' +
            '<label><span>Kurz erklären</span><textarea data-req-justification rows="2" placeholder="Wie ist das bei dieser Maschine gelöst?">' +
              escapeHtml(current.justification) + '</textarea></label>' +
            '<label><span>Nachweis / Dokument</span><input data-req-evidence value="' + escapeHtml(current.evidence) +
              '" placeholder="z. B. Testbericht, Zeichnung, Ticket"></label>' +
          '</div>' +
        '</article>';
      }).join('');

      return '<details class="requirement-group"' + ((hasOpen && groupIndex === REQUIREMENT_GROUPS.findIndex(g => g.keys.some(key => !requirementIsDocumented(getRequirementValue(key))))) ? ' open' : '') + '>' +
        '<summary><div><strong>' + escapeHtml(group.title) + '</strong><span>' + escapeHtml(group.help) + '</span></div>' +
        '<b>' + completeCount + ' / ' + groupRequirements.length + '</b></summary>' +
        '<div class="requirement-group-body">' + cards + '</div>' +
      '</details>';
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

  const updateRouteOptions = assessment => {
    const select = form.elements.conformityRoute;
    const moduleA = select.querySelector('option[value="module_a"]');
    if (!moduleA) return;
    moduleA.disabled =
      assessment.classification === 'important_ii' ||
      assessment.classification === 'critical' ||
      (assessment.classification === 'important_i' && assessment.standardsCoverage !== 'full');

    if (moduleA.disabled && select.value === 'module_a') {
      select.value = 'unset';
    }
  };

  const renderGuidance = () => {
    const a = getAssessmentFromForm();
    updateRouteOptions(a);
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
    assessment.declarationFunction &&
    assessment.declarationSignedCopyReference
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
      assessment.integratorInformation,
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
          assessment.vulnerabilityContact && assessment.cvdPolicy && assessment.cvdPolicyLocation &&
          assessment.secureUpdateDistribution && assessment.thirdPartyComponentProcess &&
          assessment.retentionProcess &&
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


  const guideStepStates = () => {
    const a = getAssessmentFromForm();
    const requirements = readRequirements();
    const annexChecks = machine ? annexViiChecks(a, requirements) : [];

    const classificationReady = Boolean(
      a.classification !== 'unset' &&
      a.classificationReason &&
      a.conformityRoute !== 'unset' &&
      routeLooksValid(a) &&
      (a.classification === 'standard' || a.classificationCategory)
    );

    const requirementsReady =
      requirements.length === REQUIREMENTS.length &&
      requirements.every(requirementIsDocumented);

    const documentationReady = Boolean(
      a.intendedPurpose &&
      a.securityEnvironment &&
      a.securityProperties &&
      a.foreseeableMisuse &&
      a.architectureDescription &&
      a.hardwareVisualsReference &&
      a.productionMonitoringProcess &&
      a.appliedStandards &&
      a.testReportsSummary &&
      a.retentionProcess &&
      a.secureCommissioning &&
      a.securityChangeEffects &&
      a.updateInstallation &&
      a.secureDecommissioning &&
      a.automaticUpdatesOptOut &&
      a.integratorInformation &&
      a.supportType
    );

    const vulnerabilityReady = Boolean(
      a.vulnerabilityContact &&
      a.cvdPolicy &&
      a.cvdPolicyLocation &&
      a.secureUpdateDistribution &&
      a.thirdPartyComponentProcess
    );

    const conformityReady = Boolean(
      a.ceStatus === 'marked' &&
      a.ceMarkingLocation &&
      declarationComplete(a) &&
      conformityDetailsComplete(a)
    );

    const annexReady = annexChecks.length > 0 && annexChecks.every(item => item.done);

    return [
      classificationReady,
      requirementsReady,
      documentationReady,
      vulnerabilityReady,
      conformityReady,
      annexReady
    ];
  };

  const setGuideStep = (index, options = {}) => {
    const safeIndex = Math.max(0, Math.min(GUIDE_STEPS.length - 1, Number(index) || 0));
    currentGuideStep = safeIndex;

    document.querySelectorAll('.cra-guide-step').forEach(section => {
      section.classList.toggle('is-active', Number(section.dataset.guideStep) === safeIndex);
    });

    document.querySelectorAll('[data-guide-go]').forEach(button => {
      const step = Number(button.dataset.guideGo);
      button.classList.toggle('active', step === safeIndex);
    });

    document.getElementById('guide-prev').disabled = safeIndex === 0;
    const next = document.getElementById('guide-next');
    next.textContent = safeIndex === GUIDE_STEPS.length - 1 ? 'Speichern' : 'Speichern & weiter →';

    const guide = GUIDE_STEPS[safeIndex];
    document.getElementById('guide-current-title').textContent = guide.title;
    document.getElementById('guide-current-help').textContent = guide.help;

    if (options.scroll !== false) {
      document.querySelector('.cra-guide-overview')?.scrollIntoView({behavior:'smooth', block:'start'});
    }
  };

  const updateGuideProgress = () => {
    if (!machine) return;
    const states = guideStepStates();
    const done = states.filter(Boolean).length;
    const percent = Math.round(done / states.length * 100);
    const open = states.length - done;

    document.getElementById('guide-progress-percent').textContent = percent + ' %';
    document.getElementById('guide-open-count').textContent =
      open === 0 ? 'Alle 6 Schritte erledigt' : open + (open === 1 ? ' Schritt offen' : ' Schritte offen');
    document.getElementById('guide-progress-bar').style.width = percent + '%';

    document.querySelectorAll('[data-guide-go]').forEach(button => {
      const step = Number(button.dataset.guideGo);
      button.classList.toggle('done', states[step] === true);
      const number = button.querySelector('span');
      if (number) number.textContent = states[step] ? '✓' : String(step + 1);
    });

    const specialOpen =
      (bundle.reportingEvents || []).filter(item => item.status !== 'closed').length +
      (bundle.nonconformityEvents || []).filter(item => item.status !== 'closed').length +
      (bundle.authorityRequests || []).filter(item => item.status !== 'closed').length;

    const hub = document.getElementById('cra-special-hub');
    if (hub) {
      hub.classList.toggle('has-open-special', specialOpen > 0);
      const kicker = hub.querySelector('.app-kicker');
      if (kicker) kicker.textContent = specialOpen > 0
        ? specialOpen + (specialOpen === 1 ? ' SONDERFALL OFFEN' : ' SONDERFÄLLE OFFEN')
        : 'NUR WENN ETWAS PASSIERT';
    }
  };

  const goToFirstOpenStep = () => {
    const states = guideStepStates();
    const firstOpen = states.findIndex(done => !done);
    setGuideStep(firstOpen === -1 ? GUIDE_STEPS.length - 1 : firstOpen, {scroll:false});
    updateGuideProgress();
  };

  const openSpecialCase = targetId => {
    document.querySelectorAll('.cra-special-case').forEach(section => {
      section.classList.toggle('is-special-active', section.id === targetId);
    });
    activeSpecialCase = targetId;
    const target = document.getElementById(targetId);
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
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
        '<p><strong>Nutzerinformation:</strong> ' +
          (item.usersInformedAt
            ? escapeHtml(formatDateTime(item.usersInformedAt) + (item.userNotificationReference ? ' · ' + item.userNotificationReference : ''))
            : 'noch nicht dokumentiert') +
        '</p>' +
        '<div class="risk-actions"><div class="risk-action-links">' +
          '<button type="button" class="text-button" data-edit-reporting="' + item.id + '">Bearbeiten</button>' +
        '</div><button type="button" class="item-remove" data-remove-reporting="' + item.id + '">×</button></div>' +
      '</article>';
    }).join('');
    updateCounters();
  };



  const renderAuthorityRequests = () => {
    const root = document.getElementById('authority-request-list');
    const items = bundle.authorityRequests || [];

    if (!items.length) {
      root.innerHTML =
        '<div class="module-empty">Keine Anfrage einer Marktüberwachungsbehörde dokumentiert.</div>';
      return;
    }

    root.innerHTML = items.map(item =>
      '<article class="reporting-card">' +
        '<div class="reporting-head"><div>' +
          '<span>MARKTÜBERWACHUNGSBEHÖRDE</span>' +
          '<strong>' + escapeHtml(item.authorityName) + '</strong>' +
        '</div><span class="risk-pill ' + (item.status === 'closed' ? 'done' : 'open') + '">' +
          (item.status === 'closed' ? 'Erledigt' : 'Offen') +
        '</span></div>' +
        '<p>' +
          (item.referenceNumber ? '<strong>Referenz:</strong> ' + escapeHtml(item.referenceNumber) + '<br>' : '') +
          '<strong>Eingang:</strong> ' + escapeHtml(formatDateTime(item.receivedAt)) +
          '<br><strong>Anfrage:</strong> ' + escapeHtml(item.requestSummary) +
          (item.requestedDocuments ? '<br><strong>Verlangte Unterlagen:</strong> ' + escapeHtml(item.requestedDocuments) : '') +
          (item.sbomRequested ? '<br><strong>SBOM:</strong> ausdrücklich verlangt' : '') +
          (item.cooperationRequested ? '<br><strong>Mitwirkung:</strong> verlangt' : '') +
          (item.cooperationMeasures ? '<br><strong>Maßnahmen:</strong> ' + escapeHtml(item.cooperationMeasures) : '') +
          (item.responseAt ? '<br><strong>Übermittelt:</strong> ' + escapeHtml(formatDateTime(item.responseAt)) : '') +
          (item.transmittedInformation ? '<br><strong>Übermittelte Informationen:</strong> ' + escapeHtml(item.transmittedInformation) : '') +
          (item.evidenceReference ? '<br><strong>Nachweis:</strong> ' + escapeHtml(item.evidenceReference) : '') +
        '</p>' +
        '<div class="risk-actions"><div class="risk-action-links">' +
          (item.status === 'closed'
            ? '<span class="status-note">Übermittlung dokumentiert · nicht mehr veränderbar</span>'
            : '<button type="button" class="text-button" data-edit-authority-request="' + item.id + '">Bearbeiten</button>') +
        '</div>' +
        (item.status === 'closed' ? '' :
          '<button type="button" class="item-remove" data-remove-authority-request="' + item.id + '" aria-label="Offene Behördenanfrage löschen">×</button>') +
        '</div>' +
      '</article>'
    ).join('');
  };

  const nonconformitySubjectLabels = {
    product:'Produkt',
    process:'Herstellerprozess',
    both:'Produkt und Herstellerprozess'
  };

  const nonconformityDispositionLabels = {
    open:'Entscheidung offen',
    brought_into_conformity:'Konformität wiederhergestellt',
    withdrawn:'Vom Markt genommen',
    recalled:'Zurückgerufen'
  };

  const renderNonconformity = () => {
    const root = document.getElementById('nonconformity-list');
    const items = bundle.nonconformityEvents || [];

    if (!items.length) {
      root.innerHTML =
        '<div class="module-empty">Kein Nichtkonformitätsvorgang dokumentiert. Ein Vorgang ist nur nötig, wenn eine Nichtkonformität bekannt wird oder vermutet wird.</div>';
      return;
    }

    root.innerHTML = items.map(item =>
      '<article class="reporting-card">' +
        '<div class="reporting-head"><div>' +
          '<span>' + escapeHtml(nonconformitySubjectLabels[item.subjectType] || item.subjectType) + '</span>' +
          '<strong>' + escapeHtml(item.title) + '</strong>' +
        '</div><span class="risk-pill ' + (item.status === 'closed' ? 'done' : 'open') + '">' +
          (item.status === 'closed' ? 'Abgeschlossen' : 'Offen') +
        '</span></div>' +
        '<p><strong>Festgestellt:</strong> ' + escapeHtml(formatDateTime(item.detectedAt)) +
          (item.affectedVersion ? '<br><strong>Betroffen:</strong> ' + escapeHtml(item.affectedVersion) : '') +
          '<br><strong>Nichtkonformität:</strong> ' + escapeHtml(item.description) +
          (item.correctiveAction ? '<br><strong>Korrekturmaßnahme:</strong> ' + escapeHtml(item.correctiveAction) : '') +
          '<br><strong>Entscheidung:</strong> ' + escapeHtml(nonconformityDispositionLabels[item.disposition] || item.disposition) +
          (item.actionAt ? '<br><strong>Umgesetzt:</strong> ' + escapeHtml(formatDateTime(item.actionAt)) : '') +
          (item.evidenceReference ? '<br><strong>Nachweis:</strong> ' + escapeHtml(item.evidenceReference) : '') +
          (item.notes ? '<br><strong>Notiz:</strong> ' + escapeHtml(item.notes) : '') +
        '</p>' +
        '<div class="risk-actions"><div class="risk-action-links">' +
          (item.status === 'closed'
            ? '<span class="status-note">Abschluss dokumentiert · nicht mehr veränderbar</span>'
            : '<button type="button" class="text-button" data-edit-nonconformity="' + item.id + '">Bearbeiten</button>') +
        '</div>' +
        (item.status === 'closed' ? '' :
          '<button type="button" class="item-remove" data-remove-nonconformity="' + item.id + '" aria-label="Offenen Vorgang löschen">×</button>') +
        '</div>' +
      '</article>'
    ).join('');
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
      updateGuideProgress();
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

  document.getElementById('cra-guide-nav').addEventListener('click', event => {
    const button = event.target.closest('[data-guide-go]');
    if (!button) return;
    setGuideStep(Number(button.dataset.guideGo));
  });

  document.getElementById('guide-prev').addEventListener('click', () => {
    setGuideStep(currentGuideStep - 1);
  });

  document.getElementById('guide-next').addEventListener('click', async () => {
    const saved = await saveAll();
    if (!saved) return;
    if (currentGuideStep < GUIDE_STEPS.length - 1) setGuideStep(currentGuideStep + 1);
  });

  document.getElementById('cra-special-hub').addEventListener('click', event => {
    const button = event.target.closest('[data-special-target]');
    if (!button) return;
    openSpecialCase(button.dataset.specialTarget);
  });

  ['classification','standardsCoverage','conformityRoute'].forEach(name => {
    form.elements[name].addEventListener('change', () => {
      renderGuidance();
      updateCounters();
      updateGuideProgress();
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
    updateGuideProgress();
  });



  document.getElementById('add-authority-request').addEventListener('click', () => {
    editingAuthorityRequestId = null;
    authorityRequestForm.reset();
    authorityRequestForm.elements.sbomRequested.value = 'no';
    authorityRequestForm.elements.cooperationRequested.value = 'no';
    authorityRequestForm.elements.status.value = 'open';
    authorityRequestForm.elements.receivedAt.value = toLocalInput(new Date().toISOString());
    document.getElementById('authority-request-dialog-title').textContent = 'Behördenanfrage anlegen';
    authorityRequestDialog.showModal();
  });

  document.getElementById('authority-request-close').addEventListener('click', () => authorityRequestDialog.close());
  document.getElementById('authority-request-cancel').addEventListener('click', () => authorityRequestDialog.close());

  authorityRequestForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(authorityRequestForm);
    const value = {
      authorityName:data.get('authorityName').trim(),
      referenceNumber:data.get('referenceNumber').trim(),
      receivedAt:toIsoOrNull(data.get('receivedAt')),
      requestSummary:data.get('requestSummary').trim(),
      requestedDocuments:data.get('requestedDocuments').trim(),
      sbomRequested:data.get('sbomRequested') === 'yes',
      authorityLanguage:data.get('authorityLanguage').trim(),
      cooperationRequested:data.get('cooperationRequested') === 'yes',
      cooperationMeasures:data.get('cooperationMeasures').trim(),
      responseAt:toIsoOrNull(data.get('responseAt')),
      transmittedInformation:data.get('transmittedInformation').trim(),
      evidenceReference:data.get('evidenceReference').trim(),
      notes:data.get('notes').trim(),
      status:data.get('status')
    };

    if (value.status === 'closed') {
      if (!value.responseAt || !value.transmittedInformation || !value.evidenceReference) {
        showToast('Zum Erledigen bitte Übermittlungsdatum, übermittelte Informationen und Nachweis dokumentieren.');
        return;
      }
      if (value.cooperationRequested && !value.cooperationMeasures) {
        showToast('Bitte die mit der Behörde abgestimmten bzw. umgesetzten Maßnahmen dokumentieren.');
        return;
      }
    }

    try {
      if (editingAuthorityRequestId) {
        await backend.updateAuthorityRequest(editingAuthorityRequestId, value);
      } else {
        await backend.addAuthorityRequest(machine.id, value);
      }
      bundle = await backend.loadCraBundle(machine.id);
      authorityRequestDialog.close();
      renderAuthorityRequests();
      updateGuideProgress();
      showToast('Behördenanfrage wurde gespeichert.');
    } catch (error) {
      console.error(error);
      showToast('Behördenanfrage konnte nicht gespeichert werden.');
    }
  });

  document.getElementById('authority-request-list').addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit-authority-request]');
    if (edit) {
      const item = (bundle.authorityRequests || []).find(row => row.id === edit.dataset.editAuthorityRequest);
      if (!item) return;

      editingAuthorityRequestId = item.id;
      authorityRequestForm.elements.authorityName.value = item.authorityName || '';
      authorityRequestForm.elements.referenceNumber.value = item.referenceNumber || '';
      authorityRequestForm.elements.receivedAt.value = toLocalInput(item.receivedAt);
      authorityRequestForm.elements.authorityLanguage.value = item.authorityLanguage || '';
      authorityRequestForm.elements.requestSummary.value = item.requestSummary || '';
      authorityRequestForm.elements.requestedDocuments.value = item.requestedDocuments || '';
      authorityRequestForm.elements.sbomRequested.value = item.sbomRequested ? 'yes' : 'no';
      authorityRequestForm.elements.cooperationRequested.value = item.cooperationRequested ? 'yes' : 'no';
      authorityRequestForm.elements.cooperationMeasures.value = item.cooperationMeasures || '';
      authorityRequestForm.elements.responseAt.value = toLocalInput(item.responseAt);
      authorityRequestForm.elements.transmittedInformation.value = item.transmittedInformation || '';
      authorityRequestForm.elements.evidenceReference.value = item.evidenceReference || '';
      authorityRequestForm.elements.notes.value = item.notes || '';
      authorityRequestForm.elements.status.value = item.status || 'open';
      document.getElementById('authority-request-dialog-title').textContent = 'Behördenanfrage bearbeiten';
      authorityRequestDialog.showModal();
      return;
    }

    const remove = event.target.closest('[data-remove-authority-request]');
    if (!remove) return;

    const item = (bundle.authorityRequests || []).find(row => row.id === remove.dataset.removeAuthorityRequest);
    if (!item || item.status === 'closed') return;

    try {
      await backend.deleteAuthorityRequest(item.id);
      bundle = await backend.loadCraBundle(machine.id);
      renderAuthorityRequests();
      updateGuideProgress();
      showToast('Offene Behördenanfrage wurde entfernt.');
    } catch (error) {
      console.error(error);
      showToast('Behördenanfrage konnte nicht entfernt werden.');
    }
  });

  document.getElementById('add-nonconformity').addEventListener('click', () => {
    editingNonconformityId = null;
    nonconformityForm.reset();
    nonconformityForm.elements.subjectType.value = 'product';
    nonconformityForm.elements.disposition.value = 'open';
    nonconformityForm.elements.status.value = 'open';
    nonconformityForm.elements.detectedAt.value = toLocalInput(new Date().toISOString());
    document.getElementById('nonconformity-dialog-title').textContent = 'Vorgang anlegen';
    nonconformityDialog.showModal();
  });

  document.getElementById('nonconformity-close').addEventListener('click', () => nonconformityDialog.close());
  document.getElementById('nonconformity-cancel').addEventListener('click', () => nonconformityDialog.close());

  nonconformityForm.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(nonconformityForm);
    const value = {
      subjectType:data.get('subjectType'),
      title:data.get('title').trim(),
      detectedAt:toIsoOrNull(data.get('detectedAt')),
      affectedVersion:data.get('affectedVersion').trim(),
      description:data.get('description').trim(),
      correctiveAction:data.get('correctiveAction').trim(),
      disposition:data.get('disposition'),
      actionAt:toIsoOrNull(data.get('actionAt')),
      evidenceReference:data.get('evidenceReference').trim(),
      notes:data.get('notes').trim(),
      status:data.get('status')
    };

    if (value.status === 'closed') {
      if (value.disposition === 'open') {
        showToast('Zum Abschließen bitte festlegen, wie mit der Nichtkonformität umgegangen wurde.');
        return;
      }
      if (!value.correctiveAction || !value.actionAt || !value.evidenceReference) {
        showToast('Zum Abschließen werden Korrekturmaßnahme, Umsetzungsdatum und Nachweis benötigt.');
        return;
      }
    }

    try {
      if (editingNonconformityId) {
        await backend.updateNonconformityEvent(editingNonconformityId, value);
      } else {
        await backend.addNonconformityEvent(machine.id, value);
      }
      bundle = await backend.loadCraBundle(machine.id);
      nonconformityDialog.close();
      renderNonconformity();
      updateGuideProgress();
      showToast('Nichtkonformitätsvorgang wurde gespeichert.');
    } catch (error) {
      console.error(error);
      showToast('Nichtkonformitätsvorgang konnte nicht gespeichert werden.');
    }
  });

  document.getElementById('nonconformity-list').addEventListener('click', async event => {
    const edit = event.target.closest('[data-edit-nonconformity]');
    if (edit) {
      const item = (bundle.nonconformityEvents || []).find(row => row.id === edit.dataset.editNonconformity);
      if (!item) return;
      editingNonconformityId = item.id;
      nonconformityForm.elements.subjectType.value = item.subjectType;
      nonconformityForm.elements.title.value = item.title;
      nonconformityForm.elements.detectedAt.value = toLocalInput(item.detectedAt);
      nonconformityForm.elements.affectedVersion.value = item.affectedVersion || '';
      nonconformityForm.elements.description.value = item.description || '';
      nonconformityForm.elements.correctiveAction.value = item.correctiveAction || '';
      nonconformityForm.elements.disposition.value = item.disposition || 'open';
      nonconformityForm.elements.actionAt.value = toLocalInput(item.actionAt);
      nonconformityForm.elements.evidenceReference.value = item.evidenceReference || '';
      nonconformityForm.elements.notes.value = item.notes || '';
      nonconformityForm.elements.status.value = item.status || 'open';
      document.getElementById('nonconformity-dialog-title').textContent = 'Vorgang bearbeiten';
      nonconformityDialog.showModal();
      return;
    }

    const remove = event.target.closest('[data-remove-nonconformity]');
    if (!remove) return;

    const item = (bundle.nonconformityEvents || []).find(row => row.id === remove.dataset.removeNonconformity);
    if (!item || item.status === 'closed') return;

    try {
      await backend.deleteNonconformityEvent(item.id);
      bundle = await backend.loadCraBundle(machine.id);
      renderNonconformity();
      updateGuideProgress();
      showToast('Offener Nichtkonformitätsvorgang wurde entfernt.');
    } catch (error) {
      console.error(error);
      showToast('Vorgang konnte nicht entfernt werden.');
    }
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
      updateItemId:data.get('updateItemId') || '',
      eventType:data.get('eventType'),
      title:data.get('title').trim(),
      affectedVersion:data.get('affectedVersion').trim(),
      affectedMemberStates:data.get('affectedMemberStates').trim(),
      assessment:data.get('assessment').trim(),
      correctiveMeasures:data.get('correctiveMeasures').trim(),
      userMitigation:data.get('userMitigation').trim(),
      threatOrRootCause:data.get('threatOrRootCause').trim(),
      sensitivityNote:data.get('sensitivityNote').trim(),
      awarenessAt:toIsoOrNull(data.get('awarenessAt')),
      earlyWarningAt:toIsoOrNull(data.get('earlyWarningAt')),
      fullNotificationAt:toIsoOrNull(data.get('fullNotificationAt')),
      correctiveMeasureAvailableAt:toIsoOrNull(data.get('correctiveMeasureAvailableAt')),
      finalReportAt:toIsoOrNull(data.get('finalReportAt')),
      usersInformedAt:toIsoOrNull(data.get('usersInformedAt')),
      userNotificationReference:data.get('userNotificationReference').trim(),
      notes:data.get('notes').trim(),
      status:data.get('status')
    };

    if (value.status === 'closed') {
      if (!value.earlyWarningAt || !value.fullNotificationAt || !value.finalReportAt) {
        showToast('Zum Abschließen müssen 24-h-Frühwarnung, 72-h-Meldung und Abschlussbericht dokumentiert sein.');
        return;
      }
      if (!value.affectedVersion || !value.assessment || !value.correctiveMeasures || !value.userMitigation) {
        showToast('Zum Abschließen bitte Produkt/Version, Bewertung, Korrekturmaßnahmen und Nutzermaßnahmen dokumentieren.');
        return;
      }
      if (!value.usersInformedAt || !value.userNotificationReference) {
        showToast('Zum Abschließen muss die Information der betroffenen Nutzer dokumentiert sein.');
        return;
      }
      if (value.eventType === 'actively_exploited_vulnerability' && !value.correctiveMeasureAvailableAt) {
        showToast('Bei einer aktiv ausgenutzten Schwachstelle bitte auch den Zeitpunkt der verfügbaren Korrekturmaßnahme dokumentieren.');
        return;
      }
      if (value.eventType === 'severe_incident' && !value.threatOrRootCause) {
        showToast('Bei einem schwerwiegenden Sicherheitsvorfall bitte die wahrscheinliche Ursache / Art der Bedrohung dokumentieren.');
        return;
      }
    }

    try {
      if (editingReportingId) await backend.updateReportingEvent(editingReportingId, value);
      else await backend.addReportingEvent(machine.id, value);
      bundle = await backend.loadCraBundle(machine.id);
      reportingDialog.close();
      renderReporting();
      updateGuideProgress();
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
      reportingForm.elements.updateItemId.value = item.updateItemId || '';
      reportingForm.elements.title.value = item.title;
      reportingForm.elements.affectedVersion.value = item.affectedVersion || '';
      reportingForm.elements.affectedMemberStates.value = item.affectedMemberStates || '';
      reportingForm.elements.assessment.value = item.assessment || '';
      reportingForm.elements.correctiveMeasures.value = item.correctiveMeasures || '';
      reportingForm.elements.userMitigation.value = item.userMitigation || '';
      reportingForm.elements.threatOrRootCause.value = item.threatOrRootCause || '';
      reportingForm.elements.sensitivityNote.value = item.sensitivityNote || '';
      reportingForm.elements.awarenessAt.value = toLocalInput(item.awarenessAt);
      reportingForm.elements.earlyWarningAt.value = toLocalInput(item.earlyWarningAt);
      reportingForm.elements.fullNotificationAt.value = toLocalInput(item.fullNotificationAt);
      reportingForm.elements.correctiveMeasureAvailableAt.value = toLocalInput(item.correctiveMeasureAvailableAt);
      reportingForm.elements.finalReportAt.value = toLocalInput(item.finalReportAt);
      reportingForm.elements.usersInformedAt.value = toLocalInput(item.usersInformedAt);
      reportingForm.elements.userNotificationReference.value = item.userNotificationReference || '';
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
      updateGuideProgress();
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
    document.getElementById('open-user-info').href = 'nutzerinfo.html?id=' + encodeURIComponent(machine.id);
    document.getElementById('open-declaration').href = 'konformitaet.html?id=' + encodeURIComponent(machine.id);
    document.getElementById('existing-update-count').textContent =
      machine.updateItems.length + (machine.updateItems.length === 1 ? ' Eintrag' : ' Einträge');

    const reportingUpdateSelect = document.getElementById('reporting-update-item');
    reportingUpdateSelect.innerHTML =
      '<option value="">Kein Eintrag verknüpft</option>' +
      machine.updateItems.map(item =>
        '<option value="' + escapeHtml(item.id) + '">' +
        escapeHtml(item.title + (item.affected ? ' · ' + item.affected : '')) +
        '</option>'
      ).join('');

    fillAssessment(bundle.assessment);
    renderRequirements();
    renderGuidance();
    renderReporting();
    renderNonconformity();
    renderAuthorityRequests();
    renderAnnexVii();
    updateCounters();
    goToFirstOpenStep();
  };

  init().catch(error => {
    console.error(error);
    showToast('CRA-Prüfung konnte nicht geladen werden.');
  });
})();