(() => {
  const api = window.CRAwerkSupabase;
  if (!api) throw new Error('CRAwerk Supabase Client fehlt.');
  const db = api.client;

  const one = (value) => Array.isArray(value) ? (value[0] || null) : (value || null);

  const mapSoftware = item => ({
    id:item.id,
    name:item.name,
    version:item.version,
    type:item.type,
    vendor:item.vendor || '',
    purl:item.purl || '',
    sbomScope:item.sbom_scope || 'top_level'
  });

  const mapComponent = item => ({
    id:item.id,
    name:item.name,
    vendor:item.vendor,
    model:item.model || '',
    version:item.version || '',
    documents:item.documents || 'unknown'
  });

  const mapRisk = item => ({
    id:item.id,
    topic:item.topic,
    level:item.level,
    owner:item.owner_name || '',
    measure:item.measure,
    status:item.status
  });

  const mapUpdate = item => ({
    id:item.id,
    title:item.title,
    date:item.known_since || '',
    affected:item.affected || '',
    action:item.action,
    assessment:item.assessment || '',
    patchVersion:item.patch_version || '',
    remediatedAt:item.remediated_at || '',
    status:item.status
  });

  const mapDocument = item => ({
    id:item.id,
    title:item.title,
    type:item.type,
    date:item.document_date || '',
    related:item.related || 'Gesamtmaschine',
    note:item.note || '',
    storagePath:item.storage_path || '',
    originalFilename:item.original_filename || ''
  });

  const mapMachine = row => {
    const updateProcess = one(row.update_processes);
    const support = one(row.support_periods);
    const craAssessment = one(row.cra_assessments);
    return {
      id:row.id,
      name:row.name,
      model:row.model || '',
      productNumber:row.product_number || '',
      owner:row.owner_name || '',
      software:row.software || 'unknown',
      connected:row.connected || 'unknown',
      documentRevision:row.document_revision || 1,
      softwareComplete:row.software_complete === true,
      componentsComplete:row.components_complete === true,
      riskReviewComplete:row.risk_review_complete === true,
      documentsComplete:row.documents_complete === true,
      createdAt:row.created_at,
      softwareItems:(row.software_items || []).map(mapSoftware),
      components:(row.components || []).map(mapComponent),
      riskItems:(row.risk_items || []).map(mapRisk),
      updateItems:(row.update_items || []).map(mapUpdate),
      updateProcess:updateProcess
        ? {owner:updateProcess.owner_name || '', procedure:updateProcess.procedure || ''}
        : {owner:'', procedure:''},
      documentItems:(row.document_items || []).map(mapDocument),
      supportPeriod:support
        ? {
            startDate:support.start_date || '',
            endDate:support.end_date || '',
            owner:support.owner_name || '',
            reason:support.reason || ''
          }
        : {startDate:'', endDate:'', owner:'', reason:''},
      craAssessment:mapCraAssessment(craAssessment),
      craRequirements:(row.cra_requirements || []).map(item => ({
        key:item.requirement_key,
        status:item.status,
        justification:item.justification || '',
        evidence:item.evidence || ''
      })),
      craReportingEvents:(row.cra_reporting_events || []).map(mapReportingEvent)
    };
  };

  const machineSelect = [
    '*',
    'software_items(*)',
    'components(*)',
    'risk_items(*)',
    'update_processes(*)',
    'update_items(*)',
    'document_items(*)',
    'support_periods(*)',
    'cra_assessments(*)',
    'cra_requirements(*)',
    'cra_reporting_events(*)'
  ].join(',');

  const currentCompany = async () => api.ensureCompany();

  const loadMachines = async () => {
    const company = await currentCompany();
    const { data, error } = await db
      .from('machines')
      .select(machineSelect)
      .eq('company_id', company.id)
      .order('created_at', {ascending:false});
    if (error) throw error;
    return (data || []).map(mapMachine);
  };

  const loadMachine = async id => {
    const { data, error } = await db
      .from('machines')
      .select(machineSelect)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapMachine(data) : null;
  };

  const createMachine = async values => {
    const company = await currentCompany();
    const user = await api.getUser();
    const { data, error } = await db.from('machines').insert({
      company_id:company.id,
      created_by:user.id,
      name:values.name,
      model:values.model || null,
      product_number:values.productNumber || null,
      owner_name:values.owner || null,
      software:values.software || 'unknown',
      connected:values.connected || 'unknown',
      document_revision:1,
      software_complete:values.software === 'no'
    }).select('id').single();
    if (error) throw error;
    return data.id;
  };

  const updateMachine = async machine => {
    const { error } = await db.from('machines').update({
      name:machine.name,
      model:machine.model || null,
      product_number:machine.productNumber || null,
      owner_name:machine.owner || null,
      software:machine.software || 'unknown',
      connected:machine.connected || 'unknown',
      document_revision:Math.max(1, Number(machine.documentRevision) || 1),
      software_complete:machine.software === 'no' ? true : machine.softwareComplete === true,
      components_complete:machine.componentsComplete === true,
      risk_review_complete:machine.riskReviewComplete === true,
      documents_complete:machine.documentsComplete === true
    }).eq('id', machine.id);
    if (error) throw error;
  };

  const deleteMachine = async id => {
    const { error } = await db.from('machines').delete().eq('id', id);
    if (error) throw error;
  };

  const addSoftware = async (machineId, v) => {
    const { data, error } = await db.from('software_items').insert({
      machine_id:machineId,
      name:v.name,
      version:v.version,
      type:v.type,
      vendor:v.vendor || null,
      purl:v.purl || null,
      sbom_scope:v.sbomScope || 'top_level'
    }).select().single();
    if (error) throw error;
    return mapSoftware(data);
  };

  const updateSoftware = async (id, v) => {
    const { error } = await db.from('software_items').update({
      name:v.name,
      version:v.version,
      type:v.type,
      vendor:v.vendor || null,
      purl:v.purl || null,
      sbom_scope:v.sbomScope || 'top_level'
    }).eq('id', id);
    if (error) throw error;
  };

  const deleteSoftware = async id => {
    const { error } = await db.from('software_items').delete().eq('id', id);
    if (error) throw error;
  };

  const addComponent = async (machineId, v) => {
    const { data, error } = await db.from('components').insert({
      machine_id:machineId,
      name:v.name,
      vendor:v.vendor,
      model:v.model || null,
      version:v.version || null,
      documents:v.documents || 'unknown'
    }).select().single();
    if (error) throw error;
    return mapComponent(data);
  };

  const updateComponent = async (id, v) => {
    const { error } = await db.from('components').update({
      name:v.name,
      vendor:v.vendor,
      model:v.model || null,
      version:v.version || null,
      documents:v.documents || 'unknown'
    }).eq('id', id);
    if (error) throw error;
  };

  const deleteComponent = async id => {
    const { error } = await db.from('components').delete().eq('id', id);
    if (error) throw error;
  };

  const addRisk = async (machineId, v) => {
    const { data, error } = await db.from('risk_items').insert({
      machine_id:machineId,
      topic:v.topic,
      level:v.level,
      owner_name:v.owner || null,
      measure:v.measure,
      status:v.status
    }).select().single();
    if (error) throw error;
    return mapRisk(data);
  };

  const updateRisk = async (id, v) => {
    const { error } = await db.from('risk_items').update({
      topic:v.topic,
      level:v.level,
      owner_name:v.owner || null,
      measure:v.measure,
      status:v.status
    }).eq('id', id);
    if (error) throw error;
  };

  const deleteRisk = async id => {
    const { error } = await db.from('risk_items').delete().eq('id', id);
    if (error) throw error;
  };

  const setUpdateProcess = async (machineId, v) => {
    const { error } = await db.from('update_processes').upsert({
      machine_id:machineId,
      owner_name:v.owner,
      procedure:v.procedure
    }, {onConflict:'machine_id'});
    if (error) throw error;
  };

  const addUpdate = async (machineId, v) => {
    const { data, error } = await db.from('update_items').insert({
      machine_id:machineId,
      title:v.title,
      known_since:v.date || null,
      affected:v.affected || null,
      action:v.action,
      assessment:v.assessment || null,
      patch_version:v.patchVersion || null,
      remediated_at:v.remediatedAt || null,
      status:v.status
    }).select().single();
    if (error) throw error;
    return mapUpdate(data);
  };

  const updateUpdate = async (id, v) => {
    const { error } = await db.from('update_items').update({
      title:v.title,
      known_since:v.date || null,
      affected:v.affected || null,
      action:v.action,
      assessment:v.assessment || null,
      patch_version:v.patchVersion || null,
      remediated_at:v.remediatedAt || null,
      status:v.status
    }).eq('id', id);
    if (error) throw error;
  };

  const deleteUpdate = async id => {
    const { error } = await db.from('update_items').delete().eq('id', id);
    if (error) throw error;
  };

  const addDocument = async (machineId, v) => {
    const { data, error } = await db.from('document_items').insert({
      machine_id:machineId,
      title:v.title,
      type:v.type,
      document_date:v.date || null,
      related:v.related || 'Gesamtmaschine',
      note:v.note || null
    }).select().single();
    if (error) throw error;
    return mapDocument(data);
  };

  const updateDocument = async (id, v) => {
    const { error } = await db.from('document_items').update({
      title:v.title,
      type:v.type,
      document_date:v.date || null,
      related:v.related || 'Gesamtmaschine',
      note:v.note || null
    }).eq('id', id);
    if (error) throw error;
  };

  const deleteDocument = async id => {
    const { error } = await db.from('document_items').delete().eq('id', id);
    if (error) throw error;
  };

  const setSupportPeriod = async (machineId, v) => {
    const { error } = await db.from('support_periods').upsert({
      machine_id:machineId,
      start_date:v.startDate,
      end_date:v.endDate,
      owner_name:v.owner,
      reason:v.reason || null
    }, {onConflict:'machine_id'});
    if (error) throw error;
  };

  const duplicateMachine = async source => {
    const newId = await createMachine({
      name:source.name + ' – Kopie',
      model:source.model,
      productNumber:source.productNumber,
      owner:source.owner,
      software:source.software,
      connected:source.connected
    });

    const copy = {...source, id:newId, name:source.name + ' – Kopie'};
    copy.documentRevision = source.documentRevision || 1;
    copy.softwareComplete = source.softwareComplete;
    copy.componentsComplete = source.componentsComplete;
    copy.riskReviewComplete = source.riskReviewComplete;
    copy.documentsComplete = source.documentsComplete;
    await updateMachine(copy);

    for (const item of source.softwareItems || []) await addSoftware(newId, item);
    for (const item of source.components || []) await addComponent(newId, item);
    for (const item of source.riskItems || []) await addRisk(newId, item);
    if (source.updateProcess && source.updateProcess.owner && source.updateProcess.procedure) {
      await setUpdateProcess(newId, source.updateProcess);
    }
    for (const item of source.updateItems || []) await addUpdate(newId, item);
    for (const item of source.documentItems || []) await addDocument(newId, item);
    if (source.supportPeriod && source.supportPeriod.startDate && source.supportPeriod.endDate && source.supportPeriod.owner) {
      await setSupportPeriod(newId, source.supportPeriod);
    }

    return newId;
  };

  const updateCompany = async values => {
    const company = await currentCompany();
    const { data, error } = await db.from('companies').update({
      name:values.name,
      street:values.street || null,
      zip:values.zip || null,
      city:values.city || null,
      country:values.country || 'Deutschland',
      contact_name:values.contactName || null,
      email:values.email || null,
      phone:values.phone || null
    }).eq('id', company.id).select().single();
    if (error) throw error;
    return data;
  };

  const isSystemAdmin = async () => {
    const user = await api.getUser();
    if (!user) return false;
    const { data, error } = await db
      .from('system_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  };

  const adminOverview = async () => {
    const [companiesResult, membersResult, machinesResult] = await Promise.all([
      db.from('companies').select('id, account_status, created_at'),
      db.from('company_members').select('company_id, user_id'),
      db.from('machines').select('id, company_id')
    ]);

    if (companiesResult.error) throw companiesResult.error;
    if (membersResult.error) throw membersResult.error;
    if (machinesResult.error) throw machinesResult.error;

    const companies = (companiesResult.data || []).filter(company => company.account_status !== 'internal');
    const companyIds = new Set(companies.map(company => company.id));
    const users = new Set(
      (membersResult.data || [])
        .filter(member => companyIds.has(member.company_id))
        .map(member => member.user_id)
    );
    const machines = (machinesResult.data || []).filter(machine => companyIds.has(machine.company_id));
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    return {
      companies_total:companies.length,
      companies_trial:companies.filter(company => company.account_status === 'trial').length,
      companies_active:companies.filter(company => company.account_status === 'active').length,
      users_total:users.size,
      machines_total:machines.length,
      companies_last_7_days:companies.filter(company => new Date(company.created_at).getTime() >= weekAgo).length
    };
  };

  const adminCompanies = async () => {
    const [companiesResult, membersResult, machinesResult] = await Promise.all([
      db.from('companies')
        .select('id, name, email, account_status, trial_started_at, trial_ends_at, created_at')
        .neq('account_status', 'internal')
        .order('created_at', {ascending:false}),
      db.from('company_members').select('company_id, user_id, role'),
      db.from('machines').select('id, company_id')
    ]);

    if (companiesResult.error) throw companiesResult.error;
    if (membersResult.error) throw membersResult.error;
    if (machinesResult.error) throw machinesResult.error;

    const members = membersResult.data || [];
    const machines = machinesResult.data || [];

    return (companiesResult.data || []).map(company => ({
      company_id:company.id,
      company_name:company.name,
      owner_email:company.email || '',
      account_status:company.account_status,
      trial_started_at:company.trial_started_at,
      trial_ends_at:company.trial_ends_at,
      created_at:company.created_at,
      member_count:members.filter(member => member.company_id === company.id).length,
      machine_count:machines.filter(machine => machine.company_id === company.id).length
    }));
  };


  const mapCraAssessment = row => row ? ({
    machineId:row.machine_id,
    classification:row.classification || 'unset',
    classificationCategory:row.classification_category || '',
    classificationReason:row.classification_reason || '',
    standardsCoverage:row.standards_coverage || 'unknown',
    conformityRoute:row.conformity_route || 'unset',
    intendedPurpose:row.intended_purpose || '',
    securityEnvironment:row.security_environment || '',
    securityProperties:row.security_properties || '',
    foreseeableMisuse:row.foreseeable_misuse || '',
    architectureDescription:row.architecture_description || '',
    hardwareVisualsReference:row.hardware_visuals_reference || '',
    productionMonitoringProcess:row.production_monitoring_process || '',
    appliedStandards:row.applied_standards || '',
    testReportsSummary:row.test_reports_summary || '',
    vulnerabilityContact:row.vulnerability_contact || '',
    cvdPolicy:row.cvd_policy || '',
    secureUpdateDistribution:row.secure_update_distribution || '',
    secureCommissioning:row.secure_commissioning || '',
    securityChangeEffects:row.security_change_effects || '',
    updateInstallation:row.update_installation || '',
    secureDecommissioning:row.secure_decommissioning || '',
    automaticUpdatesOptOut:row.automatic_updates_opt_out || '',
    integratorInformation:row.integrator_information || '',
    supportType:row.support_type || '',
    declarationUrl:row.declaration_url || '',
    ceStatus:row.ce_status || 'open',
    ceMarkingLocation:row.ce_marking_location || '',
    euDeclarationStatus:row.eu_declaration_status || 'open',
    declarationPlace:row.declaration_place || '',
    declarationDate:row.declaration_date || '',
    declarationSigner:row.declaration_signer || '',
    declarationFunction:row.declaration_function || '',
    notifiedBodyName:row.notified_body_name || '',
    notifiedBodyNumber:row.notified_body_number || '',
    certificateReference:row.certificate_reference || '',
    otherUnionLegislation:row.other_union_legislation || ''
  }) : null;

  const mapReportingEvent = row => ({
    id:row.id,
    machineId:row.machine_id,
    updateItemId:row.update_item_id || '',
    eventType:row.event_type,
    title:row.title,
    affectedVersion:row.affected_version || '',
    assessment:row.assessment || '',
    awarenessAt:row.awareness_at || '',
    earlyWarningAt:row.early_warning_at || '',
    fullNotificationAt:row.full_notification_at || '',
    correctiveMeasureAvailableAt:row.corrective_measure_available_at || '',
    finalReportAt:row.final_report_at || '',
    notes:row.notes || '',
    status:row.status || 'open'
  });

  const loadCraBundle = async machineId => {
    const [assessmentResult, requirementsResult, reportingResult] = await Promise.all([
      db.from('cra_assessments').select('*').eq('machine_id', machineId).maybeSingle(),
      db.from('cra_requirements').select('*').eq('machine_id', machineId).order('requirement_key'),
      db.from('cra_reporting_events').select('*').eq('machine_id', machineId).order('awareness_at', {ascending:false})
    ]);
    if (assessmentResult.error) throw assessmentResult.error;
    if (requirementsResult.error) throw requirementsResult.error;
    if (reportingResult.error) throw reportingResult.error;
    return {
      assessment:mapCraAssessment(assessmentResult.data),
      requirements:(requirementsResult.data || []).map(row => ({
        key:row.requirement_key,
        status:row.status,
        justification:row.justification || '',
        evidence:row.evidence || ''
      })),
      reportingEvents:(reportingResult.data || []).map(mapReportingEvent)
    };
  };

  const saveCraAssessment = async (machineId, v) => {
    const { data, error } = await db.from('cra_assessments').upsert({
      machine_id:machineId,
      classification:v.classification || 'unset',
      classification_category:v.classificationCategory || null,
      classification_reason:v.classificationReason || null,
      standards_coverage:v.standardsCoverage || 'unknown',
      conformity_route:v.conformityRoute || 'unset',
      intended_purpose:v.intendedPurpose || null,
      security_environment:v.securityEnvironment || null,
      security_properties:v.securityProperties || null,
      foreseeable_misuse:v.foreseeableMisuse || null,
      architecture_description:v.architectureDescription || null,
      hardware_visuals_reference:v.hardwareVisualsReference || null,
      production_monitoring_process:v.productionMonitoringProcess || null,
      applied_standards:v.appliedStandards || null,
      test_reports_summary:v.testReportsSummary || null,
      vulnerability_contact:v.vulnerabilityContact || null,
      cvd_policy:v.cvdPolicy || null,
      secure_update_distribution:v.secureUpdateDistribution || null,
      secure_commissioning:v.secureCommissioning || null,
      security_change_effects:v.securityChangeEffects || null,
      update_installation:v.updateInstallation || null,
      secure_decommissioning:v.secureDecommissioning || null,
      automatic_updates_opt_out:v.automaticUpdatesOptOut || null,
      integrator_information:v.integratorInformation || null,
      support_type:v.supportType || null,
      declaration_url:v.declarationUrl || null,
      ce_status:v.ceStatus || 'open',
      ce_marking_location:v.ceMarkingLocation || null,
      eu_declaration_status:v.euDeclarationStatus || 'open',
      declaration_place:v.declarationPlace || null,
      declaration_date:v.declarationDate || null,
      declaration_signer:v.declarationSigner || null,
      declaration_function:v.declarationFunction || null,
      notified_body_name:v.notifiedBodyName || null,
      notified_body_number:v.notifiedBodyNumber || null,
      certificate_reference:v.certificateReference || null,
      other_union_legislation:v.otherUnionLegislation || null
    }, {onConflict:'machine_id'}).select().single();
    if (error) throw error;
    return mapCraAssessment(data);
  };

  const saveCraRequirements = async (machineId, values) => {
    if (!values.length) return;
    const rows = values.map(item => ({
      machine_id:machineId,
      requirement_key:item.key,
      status:item.status || 'open',
      justification:item.justification || null,
      evidence:item.evidence || null
    }));
    const { error } = await db.from('cra_requirements').upsert(rows, {onConflict:'machine_id,requirement_key'});
    if (error) throw error;
  };

  const addReportingEvent = async (machineId, v) => {
    const { data, error } = await db.from('cra_reporting_events').insert({
      machine_id:machineId,
      update_item_id:v.updateItemId || null,
      event_type:v.eventType,
      title:v.title,
      affected_version:v.affectedVersion || null,
      assessment:v.assessment || null,
      awareness_at:v.awarenessAt,
      early_warning_at:v.earlyWarningAt || null,
      full_notification_at:v.fullNotificationAt || null,
      corrective_measure_available_at:v.correctiveMeasureAvailableAt || null,
      final_report_at:v.finalReportAt || null,
      notes:v.notes || null,
      status:v.status || 'open'
    }).select().single();
    if (error) throw error;
    return mapReportingEvent(data);
  };

  const updateReportingEvent = async (id, v) => {
    const { error } = await db.from('cra_reporting_events').update({
      update_item_id:v.updateItemId || null,
      event_type:v.eventType,
      title:v.title,
      affected_version:v.affectedVersion || null,
      assessment:v.assessment || null,
      awareness_at:v.awarenessAt,
      early_warning_at:v.earlyWarningAt || null,
      full_notification_at:v.fullNotificationAt || null,
      corrective_measure_available_at:v.correctiveMeasureAvailableAt || null,
      final_report_at:v.finalReportAt || null,
      notes:v.notes || null,
      status:v.status || 'open'
    }).eq('id', id);
    if (error) throw error;
  };

  const deleteReportingEvent = async id => {
    const { error } = await db.from('cra_reporting_events').delete().eq('id', id);
    if (error) throw error;
  };

  const adminSetCompanyStatus = async (companyId, status) => {
    const allowed = ['trial','active','paused','cancelled'];
    if (!allowed.includes(status)) throw new Error('Ungültiger Firmenstatus.');
    const { error } = await db
      .from('companies')
      .update({account_status:status})
      .eq('id', companyId);
    if (error) throw error;
  };

  window.CRAwerkBackend = {
    currentCompany,
    updateCompany,
    isSystemAdmin,
    adminOverview,
    adminCompanies,
    adminSetCompanyStatus,
    loadCraBundle,
    saveCraAssessment,
    saveCraRequirements,
    addReportingEvent,
    updateReportingEvent,
    deleteReportingEvent,
    loadMachines,
    loadMachine,
    createMachine,
    updateMachine,
    deleteMachine,
    duplicateMachine,
    addSoftware,
    updateSoftware,
    deleteSoftware,
    addComponent,
    updateComponent,
    deleteComponent,
    addRisk,
    updateRisk,
    deleteRisk,
    setUpdateProcess,
    addUpdate,
    updateUpdate,
    deleteUpdate,
    addDocument,
    updateDocument,
    deleteDocument,
    setSupportPeriod
  };
})();