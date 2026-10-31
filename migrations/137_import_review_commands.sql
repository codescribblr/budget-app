BEGIN;
CREATE FUNCTION public.save_import_preparation(p_budget_id bigint,p_batch_id text,p_rows jsonb,p_task text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE first_row public.queued_imports; q public.queued_imports; row jsonb; revisions jsonb;
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  IF p_task NOT IN ('duplicate_detection','categorization') OR p_task IS NULL OR jsonb_typeof(p_rows)<>'array' THEN RAISE EXCEPTION 'Invalid processing step.' USING ERRCODE='22023'; END IF;
  SELECT * INTO first_row FROM public.queued_imports WHERE account_id=p_budget_id AND source_batch_id=p_batch_id ORDER BY id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
  IF first_row.processing_tasks->>p_task IS DISTINCT FROM 'true' THEN
    -- Validate the entire step before changing any result or checkpoint.
    FOR row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
      SELECT * INTO q FROM public.queued_imports WHERE id=(row->>'id')::bigint AND account_id=p_budget_id AND source_batch_id=p_batch_id FOR UPDATE;
      IF NOT FOUND OR q.status='imported' OR q.revision IS DISTINCT FROM (row->>'revision')::uuid THEN
        RETURN jsonb_build_object('status','conflict'); END IF;
      IF row->>'suggested_category_id' IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.categories WHERE id=(row->>'suggested_category_id')::bigint AND account_id=p_budget_id) THEN RAISE EXCEPTION 'Invalid category.' USING ERRCODE='22023'; END IF;
    END LOOP;
    FOR row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
      UPDATE public.queued_imports SET
        suggested_category_id=CASE WHEN p_task='categorization' THEN (row->>'suggested_category_id')::bigint ELSE suggested_category_id END,
        original_data=CASE WHEN p_task='duplicate_detection' THEN row->'original_data' ELSE original_data END,
        status='reviewing',updated_at=now() WHERE id=(row->>'id')::bigint AND account_id=p_budget_id;
    END LOOP;
    UPDATE public.queued_imports SET processing_tasks=coalesce(processing_tasks,'{}')||jsonb_build_object(p_task,true) WHERE id=first_row.id;
  END IF;
  SELECT jsonb_object_agg('queued-'||id,revision) INTO revisions FROM public.queued_imports WHERE account_id=p_budget_id AND source_batch_id=p_batch_id;
  RETURN jsonb_build_object('status','saved','revisions',revisions);
END $$;
REVOKE ALL ON FUNCTION public.save_import_preparation(bigint,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_import_preparation(bigint,text,jsonb,text) TO authenticated;

CREATE FUNCTION public.delete_import_review_rows(p_budget_id bigint,p_batch_id text,p_revisions jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE entry record; q public.queued_imports; n integer:=0;
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  IF jsonb_typeof(p_revisions) IS DISTINCT FROM 'object' OR p_revisions='{}' THEN RAISE EXCEPTION 'Select queued transactions to delete.' USING ERRCODE='22023'; END IF;
  FOR entry IN SELECT * FROM jsonb_each_text(p_revisions) LOOP
    SELECT * INTO q FROM public.queued_imports WHERE id=entry.key::bigint AND account_id=p_budget_id AND source_batch_id=p_batch_id FOR UPDATE;
    IF NOT FOUND OR q.status='imported' OR q.revision IS DISTINCT FROM entry.value::uuid THEN RETURN jsonb_build_object('status','conflict'); END IF;
  END LOOP;
  FOR entry IN SELECT * FROM jsonb_each_text(p_revisions) LOOP
    SELECT * INTO q FROM public.queued_imports WHERE id=entry.key::bigint AND account_id=p_budget_id;
    INSERT INTO public.imported_transactions(user_id,account_id,import_date,source_type,source_identifier,transaction_date,merchant,description,amount,hash,metadata)
    SELECT auth.uid(),p_budget_id,now()::text,'CSV Import','Deleted from queue - Batch '||p_batch_id,q.transaction_date,q.merchant,q.description,q.amount,q.hash,jsonb_build_object('deletedFromQueue',true,'deletedAt',now(),'batchId',p_batch_id)
    WHERE NOT EXISTS (SELECT 1 FROM public.imported_transactions WHERE account_id=p_budget_id AND hash=q.hash)
    ON CONFLICT(account_id,hash) DO NOTHING;
    DELETE FROM public.queued_imports WHERE id=q.id AND account_id=p_budget_id;
    n:=n+1;
  END LOOP;
  RETURN jsonb_build_object('status','saved','success',true,'deleted',n);
END $$;
REVOKE ALL ON FUNCTION public.delete_import_review_rows(bigint,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_import_review_rows(bigint,text,jsonb) TO authenticated;
COMMIT;
