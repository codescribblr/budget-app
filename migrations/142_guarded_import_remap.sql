BEGIN;
CREATE FUNCTION public.remap_import_batch(p_budget_id bigint,p_batch_id text,p_revisions jsonb,p_command jsonb,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE first_row public.queued_imports; setup public.automatic_import_setups; template public.csv_import_templates; receipt public.budget_operations; identity jsonb;
 item jsonb; patch jsonb; template_id bigint; old_template_id bigint; n integer:=0; result jsonb; mappings jsonb;
BEGIN
 PERFORM public.lock_budget_write(p_budget_id);
 identity:=jsonb_build_object('kind','remap','batch',p_batch_id,'revisions',p_revisions,'mapping',p_command->'mapping','templateName',p_command->'templateName','overwriteTemplateId',p_command->'overwriteTemplateId','deleteOldTemplate',p_command->'deleteOldTemplate');
 IF p_operation_id IS NULL THEN RAISE EXCEPTION 'Missing operation reference.' USING ERRCODE='22023'; END IF;
 SELECT * INTO receipt FROM public.budget_operations WHERE account_id=p_budget_id AND operation_id=p_operation_id;
 IF FOUND THEN
  IF receipt.user_id<>auth.uid() OR receipt.command<>identity THEN RAISE EXCEPTION 'Operation reference already used.' USING ERRCODE='22023'; END IF;
  RETURN receipt.result;
 END IF;
 IF jsonb_typeof(p_revisions) IS DISTINCT FROM 'object' OR p_revisions='{}' OR jsonb_typeof(p_command->'transactions') IS DISTINCT FROM 'array' OR jsonb_array_length(p_command->'transactions') NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Reload this mapping before saving.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.queued_imports q WHERE q.account_id=p_budget_id AND q.source_batch_id=p_batch_id AND (q.status='imported' OR q.revision IS DISTINCT FROM (p_revisions->>q.id::text)::uuid))
 OR (SELECT count(*) FROM public.queued_imports WHERE account_id=p_budget_id AND source_batch_id=p_batch_id)<>(SELECT count(*) FROM jsonb_object_keys(p_revisions)) THEN RETURN jsonb_build_object('status','conflict'); END IF;
 SELECT * INTO first_row FROM public.queued_imports WHERE account_id=p_budget_id AND source_batch_id=p_batch_id ORDER BY id LIMIT 1 FOR UPDATE;
 SELECT * INTO setup FROM public.automatic_import_setups WHERE id=first_row.import_setup_id AND account_id=p_budget_id FOR UPDATE;
 IF setup.revision IS DISTINCT FROM (p_command->>'setupRevision')::uuid THEN RETURN jsonb_build_object('status','conflict'); END IF;
 old_template_id:=first_row.csv_mapping_template_id;
 template_id:=(p_command->>'overwriteTemplateId')::bigint;
 patch:=p_command->'template';
 IF template_id IS NOT NULL THEN
  SELECT * INTO template FROM public.csv_import_templates WHERE id=template_id AND account_id=p_budget_id AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND OR template.revision IS DISTINCT FROM (p_command->'templateRevisions'->>template_id::text)::uuid THEN RETURN jsonb_build_object('status','conflict'); END IF;
 END IF;
 IF coalesce((p_command->>'deleteOldTemplate')::boolean,false) AND old_template_id IS NOT NULL AND old_template_id IS DISTINCT FROM template_id AND NOT EXISTS(SELECT 1 FROM public.csv_import_templates WHERE id=old_template_id AND account_id=p_budget_id AND user_id=auth.uid() AND revision=(p_command->'templateRevisions'->>old_template_id::text)::uuid) THEN RETURN jsonb_build_object('status','conflict'); END IF;
 IF template_id IS NULL THEN
  INSERT INTO public.csv_import_templates(account_id,user_id,template_name,fingerprint,column_count,target_account_id,target_credit_card_id,date_column,amount_column,description_column,debit_column,credit_column,transaction_type_column,status_column,amount_sign_convention,date_format,has_headers,skip_rows,last_used)
  VALUES(p_budget_id,auth.uid(),p_command->>'templateName',coalesce(first_row.csv_fingerprint,p_command->'csvAnalysis'->>'fingerprint',''),coalesce((p_command->>'columnCount')::integer,0),first_row.target_account_id,first_row.target_credit_card_id,(patch->>'date_column')::integer,(patch->>'amount_column')::integer,(patch->>'description_column')::integer,(patch->>'debit_column')::integer,(patch->>'credit_column')::integer,(patch->>'transaction_type_column')::integer,(patch->>'status_column')::integer,patch->>'amount_sign_convention',patch->>'date_format',(patch->>'has_headers')::boolean,coalesce((patch->>'skip_rows')::integer,0),now()) RETURNING id INTO template_id;
 ELSE
  UPDATE public.csv_import_templates SET template_name=coalesce(p_command->>'templateName',template_name),date_column=(patch->>'date_column')::integer,amount_column=(patch->>'amount_column')::integer,description_column=(patch->>'description_column')::integer,debit_column=(patch->>'debit_column')::integer,credit_column=(patch->>'credit_column')::integer,transaction_type_column=(patch->>'transaction_type_column')::integer,status_column=(patch->>'status_column')::integer,amount_sign_convention=patch->>'amount_sign_convention',date_format=patch->>'date_format',has_headers=(patch->>'has_headers')::boolean,skip_rows=coalesce((patch->>'skip_rows')::integer,0),last_used=now() WHERE id=template_id;
 END IF;
 DELETE FROM public.queued_imports WHERE account_id=p_budget_id AND source_batch_id=p_batch_id;
 FOR item IN SELECT value FROM jsonb_array_elements(p_command->'transactions') LOOP
  IF (item->>'amount')::numeric<=0 OR (item->>'amount')::numeric<>round((item->>'amount')::numeric,2) OR item->>'transaction_type' NOT IN ('income','expense') THEN RAISE EXCEPTION 'Invalid remapped transaction.' USING ERRCODE='22023'; END IF;
  INSERT INTO public.queued_imports(account_id,import_setup_id,source_batch_id,transaction_date,description,merchant,amount,transaction_type,hash,original_data,target_account_id,target_credit_card_id,is_historical,status,csv_data,csv_analysis,csv_file_name,csv_fingerprint,csv_mapping_template_id,csv_mapping_name,processing_tasks)
  VALUES(p_budget_id,setup.id,p_batch_id,item->>'date',item->>'description',coalesce(item->>'merchant',item->>'description'),(item->>'amount')::numeric,item->>'transaction_type',item->>'hash',item->'originalData',first_row.target_account_id,first_row.target_credit_card_id,first_row.is_historical,'pending',CASE WHEN n=0 THEN p_command->'csvData' END,CASE WHEN n=0 THEN p_command->'csvAnalysis' END,CASE WHEN n=0 THEN p_command->>'csvFileName' END,CASE WHEN n=0 THEN coalesce(first_row.csv_fingerprint,p_command->'csvAnalysis'->>'fingerprint','') END,CASE WHEN n=0 THEN template_id END,CASE WHEN n=0 THEN coalesce(p_command->>'templateName','Saved template') END,CASE WHEN n=0 THEN p_command->'tasks' END);
  n:=n+1;
 END LOOP;
 IF setup.source_type='teller' AND jsonb_typeof(setup.source_config->'account_mappings')='array' THEN
  SELECT jsonb_agg(CASE WHEN (m->>'target_account_id')::bigint=first_row.target_account_id OR (m->>'target_credit_card_id')::bigint=first_row.target_credit_card_id THEN m||jsonb_build_object('csv_mapping_template_id',template_id) ELSE m END) INTO mappings FROM jsonb_array_elements(setup.source_config->'account_mappings') m;
  UPDATE public.automatic_import_setups SET source_config=jsonb_set(source_config,'{account_mappings}',mappings) WHERE id=setup.id;
 ELSE UPDATE public.automatic_import_setups SET csv_mapping_template_id=template_id WHERE id=setup.id; END IF;
 IF coalesce((p_command->>'deleteOldTemplate')::boolean,false) AND old_template_id IS DISTINCT FROM template_id THEN DELETE FROM public.csv_import_templates WHERE id=old_template_id AND account_id=p_budget_id AND user_id=auth.uid(); END IF;
 result:=jsonb_build_object('status','saved','success',true,'batchId',p_batch_id,'queuedCount',n,'templateId',template_id);
 INSERT INTO public.budget_operations(account_id,operation_id,user_id,command,result) VALUES(p_budget_id,p_operation_id,auth.uid(),identity,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.remap_import_batch(bigint,text,jsonb,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remap_import_batch(bigint,text,jsonb,jsonb,uuid) TO authenticated;
COMMIT;
