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
    vendor:item.vendor || ''
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
        : {startDate:'', endDate:'', owner:'', reason:''}
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
    'support_periods(*)'
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
      vendor:v.vendor || null
    }).select().single();
    if (error) throw error;
    return mapSoftware(data);
  };

  const updateSoftware = async (id, v) => {
    const { error } = await db.from('software_items').update({
      name:v.name, version:v.version, type:v.type, vendor:v.vendor || null
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

  window.CRAwerkBackend = {
    currentCompany,
    updateCompany,
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