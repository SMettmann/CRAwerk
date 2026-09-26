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
    severity:item.severity || 'unknown',
    patchVersion:item.patch_version || '',
    remediatedAt:item.remediated_at || '',
    advisoryReference:item.advisory_reference || '',
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
    originalFilename:item.original_filename || '',
    fileSize:Number(item.file_size || 0),
    mimeType:item.mime_type || ''
  });

  const mapMachine = row => {
    const updateProcess = one(row.update_processes);
    const support = one(row.support_periods);
    const craAssessment = one(row.cra_assessments);
    const company = one(row.companies);
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
      company:company ? {
        name:company.name || '',
        street:company.street || '',
        zip:company.zip || '',
        city:company.city || '',
        country:company.country || '',
        email:company.email || '',
        phone:company.phone || ''
      } : null,
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
            reason:support.reason || '',
            purchaseDisclosureMethod:support.purchase_disclosure_method || '',
            purchaseDisclosureLocation:support.purchase_disclosure_location || '',
            endNotificationFeasible:support.end_notification_feasible || 'unknown',
            endNotificationMethod:support.end_notification_method || '',
            endNotificationNotFeasibleReason:support.end_notification_not_feasible_reason || '',
            endNotificationAt:support.end_notification_at || '',
            endNotificationReference:support.end_notification_reference || ''
          }
        : {
            startDate:'', endDate:'', owner:'', reason:'',
            purchaseDisclosureMethod:'', purchaseDisclosureLocation:'',
            endNotificationFeasible:'unknown', endNotificationMethod:'',
            endNotificationNotFeasibleReason:'', endNotificationAt:'',
            endNotificationReference:''
          },
      craAssessment:mapCraAssessment(craAssessment),
      craRequirements:(row.cra_requirements || []).map(item => ({
        key:item.requirement_key,
        status:item.status,
        justification:item.justification || '',
        evidence:item.evidence || ''
      })),
      craReportingEvents:(row.cra_reporting_events || []).map(mapReportingEvent),
      craNonconformityEvents:(row.cra_nonconformity_events || []).map(mapNonconformityEvent),
      craAuthorityRequests:(row.cra_authority_requests || []).map(mapAuthorityRequest)
    };
  };

  const machineSelect = [
    '*',
    'companies(name,street,zip,city,country,email,phone)',
    'software_items(*)',
    'components(*)',
    'risk_items(*)',
    'update_processes(*)',
    'update_items(*)',
    'document_items(*)',
    'support_periods(*)',
    'cra_assessments(*)',
    'cra_requirements(*)',
    'cra_reporting_events(*)',
    'cra_nonconformity_events(*)',
    'cra_authority_requests(*)'
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
    const limits = {starter:3, business:20, pro:Infinity};
    const limit = company.account_status === 'internal'
      ? Infinity
      : (limits[company.plan_code] ?? 20);

    if (Number.isFinite(limit)) {
      const { count, error:countError } = await db
        .from('machines')
        .select('id', {count:'exact', head:true})
        .eq('company_id', company.id);
      if (countError) throw countError;
      if ((count || 0) >= limit) {
        const planName = company.plan_code === 'starter' ? 'Starter'
          : company.plan_code === 'business' ? 'Business'
          : 'Ihrem Tarif';
        const error = new Error(planName + ' erlaubt maximal ' + limit + ' Produkte. Einen höheren Tarif können Sie unter „Zugang & Tarif“ wählen.');
        error.code = 'PLAN_LIMIT';
        throw error;
      }
    }

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
    const { data:documents, error:documentsError } = await db
      .from('document_items')
      .select('storage_path')
      .eq('machine_id', id);
    if (documentsError) throw documentsError;

    const paths = (documents || []).map(item => item.storage_path).filter(Boolean);
    if (paths.length) {
      const { error:storageError } = await db.storage.from('cra-documents').remove(paths);
      if (storageError) throw storageError;
    }

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
      severity:v.severity || 'unknown',
      patch_version:v.patchVersion || null,
      remediated_at:v.remediatedAt || null,
      advisory_reference:v.advisoryReference || null,
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
      severity:v.severity || 'unknown',
      patch_version:v.patchVersion || null,
      remediated_at:v.remediatedAt || null,
      advisory_reference:v.advisoryReference || null,
      status:v.status
    }).eq('id', id);
    if (error) throw error;
  };

  const deleteUpdate = async id => {
    const { error } = await db.from('update_items').delete().eq('id', id);
    if (error) throw error;
  };

  const sanitizeFilename = value =>
    String(value || 'datei')
      .normalize('NFKD')
      .replace(/[\\/]+/g, '-')
      .replace(/[^a-zA-Z0-9._ -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 120) || 'datei';

  const documentStoragePath = (machineId, documentId, file) =>
    machineId + '/' + documentId + '/' + Date.now() + '-' + sanitizeFilename(file.name);

  const uploadDocumentFile = async (machineId, documentId, file) => {
    if (!file) return null;
    const path = documentStoragePath(machineId, documentId, file);
    const ext = String(file.name || '').split('.').pop().toLowerCase();
    const mimeByExtension = {
      pdf:'application/pdf',
      txt:'text/plain',
      csv:'text/csv',
      jpg:'image/jpeg',
      jpeg:'image/jpeg',
      png:'image/png',
      webp:'image/webp',
      zip:'application/zip',
      docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    const contentType = file.type || mimeByExtension[ext] || 'application/octet-stream';
    const { error } = await db.storage.from('cra-documents').upload(path, file, {
      cacheControl:'3600',
      upsert:false,
      contentType
    });
    if (error) throw error;
    return {
      storagePath:path,
      originalFilename:file.name,
      fileSize:file.size || 0,
      mimeType:contentType
    };
  };

  const removeStoredDocument = async path => {
    if (!path) return;
    const { error } = await db.storage.from('cra-documents').remove([path]);
    if (error) throw error;
  };

  const addDocument = async (machineId, v, file = null) => {
    const { data, error } = await db.from('document_items').insert({
      machine_id:machineId,
      title:v.title,
      type:v.type,
      document_date:v.date || null,
      related:v.related || 'Gesamtmaschine',
      note:v.note || null
    }).select().single();
    if (error) throw error;

    if (!file) return mapDocument(data);

    try {
      const stored = await uploadDocumentFile(machineId, data.id, file);
      const { data:updated, error:updateError } = await db.from('document_items').update({
        storage_path:stored.storagePath,
        original_filename:stored.originalFilename,
        file_size:stored.fileSize,
        mime_type:stored.mimeType || null
      }).eq('id', data.id).select().single();
      if (updateError) {
        await removeStoredDocument(stored.storagePath).catch(() => {});
        throw updateError;
      }
      return mapDocument(updated);
    } catch (storageError) {
      await db.from('document_items').delete().eq('id', data.id);
      throw storageError;
    }
  };

  const updateDocument = async (id, v, file = null) => {
    const { data:current, error:currentError } = await db
      .from('document_items')
      .select('id,machine_id,storage_path,original_filename,file_size,mime_type')
      .eq('id', id)
      .single();
    if (currentError) throw currentError;

    let stored = null;
    if (file) stored = await uploadDocumentFile(current.machine_id, id, file);

    const payload = {
      title:v.title,
      type:v.type,
      document_date:v.date || null,
      related:v.related || 'Gesamtmaschine',
      note:v.note || null
    };

    if (stored) {
      payload.storage_path = stored.storagePath;
      payload.original_filename = stored.originalFilename;
      payload.file_size = stored.fileSize;
      payload.mime_type = stored.mimeType || null;
    }

    const { error } = await db.from('document_items').update(payload).eq('id', id);
    if (error) {
      if (stored) await removeStoredDocument(stored.storagePath).catch(() => {});
      throw error;
    }

    if (stored && current.storage_path && current.storage_path !== stored.storagePath) {
      await removeStoredDocument(current.storage_path);
    }
  };

  const deleteDocument = async id => {
    const { data:current, error:currentError } = await db
      .from('document_items')
      .select('storage_path')
      .eq('id', id)
      .single();
    if (currentError) throw currentError;

    if (current.storage_path) await removeStoredDocument(current.storage_path);

    const { error } = await db.from('document_items').delete().eq('id', id);
    if (error) throw error;
  };

  const documentSignedUrl = async storagePath => {
    if (!storagePath) throw new Error('Für diese Unterlage ist keine Datei gespeichert.');
    const { data, error } = await db.storage
      .from('cra-documents')
      .createSignedUrl(storagePath, 120);
    if (error) throw error;
    return data.signedUrl;
  };

  const downloadDocument = async storagePath => {
    if (!storagePath) throw new Error('Für diese Unterlage ist keine Datei gespeichert.');
    const { data, error } = await db.storage.from('cra-documents').download(storagePath);
    if (error) throw error;
    return data;
  };

  const setSupportPeriod = async (machineId, v) => {
    const { error } = await db.from('support_periods').upsert({
      machine_id:machineId,
      start_date:v.startDate,
      end_date:v.endDate,
      owner_name:v.owner,
      reason:v.reason || null,
      purchase_disclosure_method:v.purchaseDisclosureMethod || null,
      purchase_disclosure_location:v.purchaseDisclosureLocation || null,
      end_notification_feasible:v.endNotificationFeasible || 'unknown',
      end_notification_method:v.endNotificationMethod || null,
      end_notification_not_feasible_reason:v.endNotificationNotFeasibleReason || null,
      end_notification_at:v.endNotificationAt || null,
      end_notification_reference:v.endNotificationReference || null
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
    for (const item of source.documentItems || []) {
      if (item.storagePath) {
        try {
          const blob = await downloadDocument(item.storagePath);
          const file = new File(
            [blob],
            item.originalFilename || 'dokument',
            {type:item.mimeType || blob.type || 'application/octet-stream'}
          );
          await addDocument(newId, item, file);
        } catch (error) {
          console.warn('Dokumentdatei konnte beim Duplizieren nicht kopiert werden.', error);
          await addDocument(newId, item);
        }
      } else {
        await addDocument(newId, item);
      }
    }
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

  const companyLogoSignedUrl = async (storagePath, expiresIn = 3600) => {
    if (!storagePath) return '';
    const { data, error } = await db.storage
      .from('cra-documents')
      .createSignedUrl(storagePath, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  };

  const uploadCompanyLogo = async file => {
    if (!file) throw new Error('Bitte wählen Sie eine Bilddatei aus.');
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Das Logo darf maximal 2 MB groß sein.');
    }

    const allowed = {
      'image/png':'png',
      'image/jpeg':'jpg',
      'image/webp':'webp',
      'image/svg+xml':'svg'
    };
    let ext = allowed[file.type] || '';
    if (!ext) {
      const candidate = String(file.name || '').split('.').pop().toLowerCase();
      if (['png','jpg','jpeg','webp','svg'].includes(candidate)) {
        ext = candidate === 'jpeg' ? 'jpg' : candidate;
      }
    }
    if (!ext) {
      throw new Error('Erlaubt sind PNG, JPG, WEBP und SVG.');
    }

    const company = await currentCompany();
    const oldPath = company.logo_path || '';
    const newPath = 'company-logos/' + company.id + '/logo-' + Date.now() + '.' + ext;

    const { error:uploadError } = await db.storage
      .from('cra-documents')
      .upload(newPath, file, {
        cacheControl:'3600',
        upsert:false,
        contentType:file.type || (ext === 'svg' ? 'image/svg+xml' : 'image/' + (ext === 'jpg' ? 'jpeg' : ext))
      });
    if (uploadError) throw uploadError;

    const { data:updated, error:updateError } = await db
      .from('companies')
      .update({logo_path:newPath})
      .eq('id', company.id)
      .select()
      .single();

    if (updateError) {
      await db.storage.from('cra-documents').remove([newPath]).catch(() => {});
      throw updateError;
    }

    if (oldPath && oldPath !== newPath) {
      await db.storage.from('cra-documents').remove([oldPath]).catch(() => {});
    }

    return updated;
  };

  const deleteCompanyLogo = async () => {
    const company = await currentCompany();
    const oldPath = company.logo_path || '';
    if (!oldPath) return company;

    const { data:updated, error:updateError } = await db
      .from('companies')
      .update({logo_path:null})
      .eq('id', company.id)
      .select()
      .single();
    if (updateError) throw updateError;

    await db.storage.from('cra-documents').remove([oldPath]).catch(() => {});
    return updated;
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
      db.from('companies').select('id, account_status, trial_ends_at, created_at'),
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
      companies_trial:companies.filter(company => company.account_status === 'trial' && company.trial_ends_at && new Date(company.trial_ends_at).getTime() > Date.now()).length,
      companies_active:companies.filter(company => company.account_status === 'active').length,
      users_total:users.size,
      machines_total:machines.length,
      companies_last_7_days:companies.filter(company => new Date(company.created_at).getTime() >= weekAgo).length
    };
  };

  const adminCompanies = async () => {
    const [companiesResult, membersResult, machinesResult] = await Promise.all([
      db.from('companies')
        .select('id, name, email, account_status, trial_started_at, trial_ends_at, plan_code, billing_status, billing_current_period_end, created_at')
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
      plan_code:company.plan_code || '',
      billing_status:company.billing_status || '',
      billing_current_period_end:company.billing_current_period_end || null,
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
    cvdPolicyLocation:row.cvd_policy_location || '',
    secureUpdateDistribution:row.secure_update_distribution || '',
    thirdPartyComponentProcess:row.third_party_component_process || '',
    retentionProcess:row.retention_process || '',
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
    declarationSignedCopyReference:row.declaration_signed_copy_reference || '',
    notifiedBodyName:row.notified_body_name || '',
    notifiedBodyNumber:row.notified_body_number || '',
    certificateReference:row.certificate_reference || '',
    otherUnionLegislation:row.other_union_legislation || ''
  }) : null;

  const mapAuthorityRequest = row => ({
    id:row.id,
    machineId:row.machine_id,
    authorityName:row.authority_name || '',
    referenceNumber:row.reference_number || '',
    receivedAt:row.received_at || '',
    requestSummary:row.request_summary || '',
    requestedDocuments:row.requested_documents || '',
    sbomRequested:row.sbom_requested === true,
    authorityLanguage:row.authority_language || '',
    cooperationRequested:row.cooperation_requested === true,
    cooperationMeasures:row.cooperation_measures || '',
    responseAt:row.response_at || '',
    transmittedInformation:row.transmitted_information || '',
    evidenceReference:row.evidence_reference || '',
    notes:row.notes || '',
    status:row.status || 'open'
  });

  const mapNonconformityEvent = row => ({
    id:row.id,
    machineId:row.machine_id,
    subjectType:row.subject_type || 'product',
    title:row.title || '',
    detectedAt:row.detected_at || '',
    affectedVersion:row.affected_version || '',
    description:row.description || '',
    correctiveAction:row.corrective_action || '',
    disposition:row.disposition || 'open',
    actionAt:row.action_at || '',
    evidenceReference:row.evidence_reference || '',
    notes:row.notes || '',
    status:row.status || 'open'
  });

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
    affectedMemberStates:row.affected_member_states || '',
    correctiveMeasures:row.corrective_measures || '',
    userMitigation:row.user_mitigation || '',
    threatOrRootCause:row.threat_or_root_cause || '',
    sensitivityNote:row.sensitivity_note || '',
    usersInformedAt:row.users_informed_at || '',
    userNotificationReference:row.user_notification_reference || '',
    notes:row.notes || '',
    status:row.status || 'open'
  });

  const loadCraBundle = async machineId => {
    const [assessmentResult, requirementsResult, reportingResult, nonconformityResult, authorityResult] = await Promise.all([
      db.from('cra_assessments').select('*').eq('machine_id', machineId).maybeSingle(),
      db.from('cra_requirements').select('*').eq('machine_id', machineId).order('requirement_key'),
      db.from('cra_reporting_events').select('*').eq('machine_id', machineId).order('awareness_at', {ascending:false}),
      db.from('cra_nonconformity_events').select('*').eq('machine_id', machineId).order('detected_at', {ascending:false}),
      db.from('cra_authority_requests').select('*').eq('machine_id', machineId).order('received_at', {ascending:false})
    ]);
    if (assessmentResult.error) throw assessmentResult.error;
    if (requirementsResult.error) throw requirementsResult.error;
    if (reportingResult.error) throw reportingResult.error;
    if (nonconformityResult.error) throw nonconformityResult.error;
    if (authorityResult.error) throw authorityResult.error;
    return {
      assessment:mapCraAssessment(assessmentResult.data),
      requirements:(requirementsResult.data || []).map(row => ({
        key:row.requirement_key,
        status:row.status,
        justification:row.justification || '',
        evidence:row.evidence || ''
      })),
      reportingEvents:(reportingResult.data || []).map(mapReportingEvent),
      nonconformityEvents:(nonconformityResult.data || []).map(mapNonconformityEvent),
      authorityRequests:(authorityResult.data || []).map(mapAuthorityRequest)
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
      cvd_policy_location:v.cvdPolicyLocation || null,
      secure_update_distribution:v.secureUpdateDistribution || null,
      third_party_component_process:v.thirdPartyComponentProcess || null,
      retention_process:v.retentionProcess || null,
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
      declaration_signed_copy_reference:v.declarationSignedCopyReference || null,
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
      affected_member_states:v.affectedMemberStates || null,
      corrective_measures:v.correctiveMeasures || null,
      user_mitigation:v.userMitigation || null,
      threat_or_root_cause:v.threatOrRootCause || null,
      sensitivity_note:v.sensitivityNote || null,
      users_informed_at:v.usersInformedAt || null,
      user_notification_reference:v.userNotificationReference || null,
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
      affected_member_states:v.affectedMemberStates || null,
      corrective_measures:v.correctiveMeasures || null,
      user_mitigation:v.userMitigation || null,
      threat_or_root_cause:v.threatOrRootCause || null,
      sensitivity_note:v.sensitivityNote || null,
      users_informed_at:v.usersInformedAt || null,
      user_notification_reference:v.userNotificationReference || null,
      notes:v.notes || null,
      status:v.status || 'open'
    }).eq('id', id);
    if (error) throw error;
  };

  const deleteReportingEvent = async id => {
    const { error } = await db.from('cra_reporting_events').delete().eq('id', id);
    if (error) throw error;
  };



  const addAuthorityRequest = async (machineId, v) => {
    const { data, error } = await db.from('cra_authority_requests').insert({
      machine_id:machineId,
      authority_name:v.authorityName,
      reference_number:v.referenceNumber || null,
      received_at:v.receivedAt,
      request_summary:v.requestSummary,
      requested_documents:v.requestedDocuments || null,
      sbom_requested:v.sbomRequested === true,
      authority_language:v.authorityLanguage || null,
      cooperation_requested:v.cooperationRequested === true,
      cooperation_measures:v.cooperationMeasures || null,
      response_at:v.responseAt || null,
      transmitted_information:v.transmittedInformation || null,
      evidence_reference:v.evidenceReference || null,
      notes:v.notes || null,
      status:v.status || 'open'
    }).select().single();
    if (error) throw error;
    return mapAuthorityRequest(data);
  };

  const updateAuthorityRequest = async (id, v) => {
    const { error } = await db.from('cra_authority_requests').update({
      authority_name:v.authorityName,
      reference_number:v.referenceNumber || null,
      received_at:v.receivedAt,
      request_summary:v.requestSummary,
      requested_documents:v.requestedDocuments || null,
      sbom_requested:v.sbomRequested === true,
      authority_language:v.authorityLanguage || null,
      cooperation_requested:v.cooperationRequested === true,
      cooperation_measures:v.cooperationMeasures || null,
      response_at:v.responseAt || null,
      transmitted_information:v.transmittedInformation || null,
      evidence_reference:v.evidenceReference || null,
      notes:v.notes || null,
      status:v.status || 'open'
    }).eq('id', id);
    if (error) throw error;
  };

  const deleteAuthorityRequest = async id => {
    const { error } = await db.from('cra_authority_requests').delete().eq('id', id);
    if (error) throw error;
  };

  const addNonconformityEvent = async (machineId, v) => {
    const { data, error } = await db.from('cra_nonconformity_events').insert({
      machine_id:machineId,
      subject_type:v.subjectType || 'product',
      title:v.title,
      detected_at:v.detectedAt,
      affected_version:v.affectedVersion || null,
      description:v.description,
      corrective_action:v.correctiveAction || null,
      disposition:v.disposition || 'open',
      action_at:v.actionAt || null,
      evidence_reference:v.evidenceReference || null,
      notes:v.notes || null,
      status:v.status || 'open'
    }).select().single();
    if (error) throw error;
    return mapNonconformityEvent(data);
  };

  const updateNonconformityEvent = async (id, v) => {
    const { error } = await db.from('cra_nonconformity_events').update({
      subject_type:v.subjectType || 'product',
      title:v.title,
      detected_at:v.detectedAt,
      affected_version:v.affectedVersion || null,
      description:v.description,
      corrective_action:v.correctiveAction || null,
      disposition:v.disposition || 'open',
      action_at:v.actionAt || null,
      evidence_reference:v.evidenceReference || null,
      notes:v.notes || null,
      status:v.status || 'open'
    }).eq('id', id);
    if (error) throw error;
  };

  const deleteNonconformityEvent = async id => {
    const { error } = await db.from('cra_nonconformity_events').delete().eq('id', id);
    if (error) throw error;
  };

  const mapSupportTicket = row => ({
    id:row.id,
    companyId:row.company_id,
    companyName:row.companies?.name || '',
    companyEmail:row.companies?.email || '',
    category:row.category || 'general',
    subject:row.subject || '',
    message:row.message || '',
    status:row.status || 'open',
    createdAt:row.created_at,
    updatedAt:row.updated_at,
    lastMessageAt:row.last_message_at,
    messages:(row.support_messages || [])
      .map(item => ({
        id:item.id,
        senderRole:item.sender_role,
        message:item.message || '',
        createdAt:item.created_at
      }))
      .sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
  });

  const loadSupportTickets = async () => {
    const company = await currentCompany();
    const { data, error } = await db
      .from('support_tickets')
      .select('*, support_messages(*)')
      .eq('company_id', company.id)
      .order('last_message_at', {ascending:false});
    if (error) throw error;
    return (data || []).map(mapSupportTicket);
  };

  const createSupportTicket = async values => {
    const company = await currentCompany();
    const user = await api.getUser();
    if (!user) throw new Error('Nicht angemeldet.');

    const { data, error } = await db
      .from('support_tickets')
      .insert({
        company_id:company.id,
        created_by:user.id,
        category:values.category || 'general',
        subject:String(values.subject || '').trim(),
        message:String(values.message || '').trim()
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapSupportTicket(data);
  };

  const addSupportMessage = async (ticketId, message) => {
    const user = await api.getUser();
    if (!user) throw new Error('Nicht angemeldet.');
    const { error } = await db.from('support_messages').insert({
      ticket_id:ticketId,
      sender_user_id:user.id,
      sender_role:'customer',
      message:String(message || '').trim()
    });
    if (error) throw error;
  };

  const adminSupportTickets = async () => {
    const { data, error } = await db
      .from('support_tickets')
      .select('*, companies(name,email), support_messages(*)')
      .order('last_message_at', {ascending:false});
    if (error) throw error;
    return (data || []).map(mapSupportTicket);
  };

  const adminReplySupport = async (ticketId, message) => {
    const user = await api.getUser();
    if (!user) throw new Error('Nicht angemeldet.');
    const { error } = await db.from('support_messages').insert({
      ticket_id:ticketId,
      sender_user_id:user.id,
      sender_role:'admin',
      message:String(message || '').trim()
    });
    if (error) throw error;
  };

  const adminSetSupportStatus = async (ticketId, status) => {
    const allowed = ['open','in_progress','answered','closed'];
    if (!allowed.includes(status)) throw new Error('Ungültiger Supportstatus.');
    const { error } = await db
      .from('support_tickets')
      .update({status, updated_at:new Date().toISOString()})
      .eq('id', ticketId);
    if (error) throw error;
  };

  const adminSetCompanyStatus = async (companyId, status) => {
    const allowed = ['trial','active','paused','cancelled'];
    if (!allowed.includes(status)) throw new Error('Ungültiger Firmenstatus.');
    const user = await api.getUser();
    if (!user) throw new Error('Nicht angemeldet.');
    const { error } = await db.from('system_admin_status_actions').insert({
      company_id:companyId,
      status,
      created_by:user.id
    });
    if (error) throw error;
  };

  window.CRAwerkBackend = {
    currentCompany,
    updateCompany,
    companyLogoSignedUrl,
    uploadCompanyLogo,
    deleteCompanyLogo,
    isSystemAdmin,
    adminOverview,
    adminCompanies,
    adminSetCompanyStatus,
    loadSupportTickets,
    createSupportTicket,
    addSupportMessage,
    adminSupportTickets,
    adminReplySupport,
    adminSetSupportStatus,
    loadCraBundle,
    saveCraAssessment,
    saveCraRequirements,
    addReportingEvent,
    updateReportingEvent,
    deleteReportingEvent,
    addAuthorityRequest,
    updateAuthorityRequest,
    deleteAuthorityRequest,
    addNonconformityEvent,
    updateNonconformityEvent,
    deleteNonconformityEvent,
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
    documentSignedUrl,
    downloadDocument,
    setSupportPeriod
  };
})();