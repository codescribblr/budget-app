BEGIN;
CREATE FUNCTION public.approve_import_chunk(p_budget_id bigint,p_batch_id text,p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item jsonb; q public.queued_imports; patch jsonb; result jsonb; hash_value text; existing bigint; imported_id bigint;
  imported integer:=0; skipped integer:=0; failures jsonb:='[]'; skipped_items jsonb:='[]';
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid review chunk.' USING ERRCODE='22023'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    BEGIN
      SELECT * INTO q FROM public.queued_imports WHERE id=(item->>'queuedId')::bigint AND account_id=p_budget_id AND source_batch_id=p_batch_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'This queued transaction is no longer available.' USING ERRCODE='22023'; END IF;
      IF q.status='imported' THEN
        skipped:=skipped+1;skipped_items:=skipped_items||jsonb_build_array(jsonb_build_object('id',item->>'id','description',q.description,'reason','Already imported.')); CONTINUE;
      END IF;
      IF (item->>'expectedRevision')::uuid IS NULL OR q.revision<>(item->>'expectedRevision')::uuid THEN
        RAISE EXCEPTION 'Changed elsewhere. Reload and review this transaction before importing.' USING ERRCODE='22023'; END IF;
      IF q.status='rejected' THEN RAISE EXCEPTION 'This transaction was rejected elsewhere.' USING ERRCODE='22023'; END IF;
      hash_value:=q.hash||CASE WHEN coalesce((item->>'forceImport')::boolean,false) THEN ':separate:queued-'||q.id ELSE '' END;
      SELECT l.transaction_id INTO existing FROM public.imported_transactions i JOIN public.imported_transaction_links l ON l.imported_transaction_id=i.id WHERE i.account_id=p_budget_id AND i.hash=hash_value LIMIT 1;
      IF FOUND THEN
        skipped:=skipped+1;skipped_items:=skipped_items||jsonb_build_array(jsonb_build_object('id',item->>'id','description',q.description,'reason','Duplicate already exists.')); CONTINUE;
      END IF;
      SELECT id INTO imported_id FROM public.imported_transactions WHERE account_id=p_budget_id AND hash=hash_value LIMIT 1;
      IF FOUND THEN RAISE EXCEPTION 'An earlier import with this identity needs review before it can be imported again.' USING ERRCODE='22023'; END IF;
      patch:=item->'patch';
      result:=public.save_transaction_command(p_budget_id,null,null,patch,false,gen_random_uuid());
      INSERT INTO public.imported_transactions(user_id,account_id,import_date,source_type,source_identifier,transaction_date,merchant,description,amount,hash,metadata)
      VALUES(auth.uid(),p_budget_id,now()::text,'CSV Import','Automatic Import - Batch '||p_batch_id,patch->>'date',q.merchant,patch->>'description',(patch->>'total_amount')::numeric,hash_value,
        jsonb_build_object('originalRow',q.original_data,'suggestedCategory',q.suggested_category_id,'suggestedMerchant',q.merchant)) RETURNING id INTO imported_id;
      INSERT INTO public.imported_transaction_links(imported_transaction_id,transaction_id) VALUES(imported_id,(result->'record'->>'id')::bigint);
      UPDATE public.queued_imports SET status='imported',imported_transaction_id=(result->'record'->>'id')::bigint,imported_at=now(),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=q.id;
      imported:=imported+1;
    EXCEPTION WHEN unique_violation OR check_violation OR foreign_key_violation OR invalid_parameter_value OR invalid_text_representation OR numeric_value_out_of_range OR not_null_violation THEN
      failures:=failures||jsonb_build_array(jsonb_build_object('id',item->>'id','description',item->'patch'->>'description','error',SQLERRM));
    END;
  END LOOP;
  RETURN jsonb_build_object('imported',imported,'skipped',skipped,'requested',jsonb_array_length(p_items),'skippedItems',skipped_items,'failures',failures);
END $$;
REVOKE ALL ON FUNCTION public.approve_import_chunk(bigint,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_import_chunk(bigint,text,jsonb) TO authenticated;
COMMIT;
