BEGIN;
CREATE FUNCTION public.save_import_defaults(p_budget_id bigint,p_batch_id text,p_revisions jsonb,p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q public.queued_imports; first_id bigint; n integer:=0; revisions jsonb;
BEGIN
 PERFORM public.lock_budget_write(p_budget_id);
 IF jsonb_typeof(p_revisions) IS DISTINCT FROM 'object' OR p_revisions='{}' OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Reload this batch before saving.' USING ERRCODE='22023'; END IF;
 IF p_patch->>'target_account_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounts WHERE id=(p_patch->>'target_account_id')::bigint AND account_id=p_budget_id) THEN RAISE EXCEPTION 'Invalid account.' USING ERRCODE='22023'; END IF;
 IF p_patch->>'target_credit_card_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.credit_cards WHERE id=(p_patch->>'target_credit_card_id')::bigint AND account_id=p_budget_id) THEN RAISE EXCEPTION 'Invalid card.' USING ERRCODE='22023'; END IF;
 IF p_patch->>'target_account_id' IS NOT NULL AND p_patch->>'target_credit_card_id' IS NOT NULL THEN RAISE EXCEPTION 'Choose one account.' USING ERRCODE='22023'; END IF;
 FOR q IN SELECT * FROM public.queued_imports WHERE account_id=p_budget_id AND source_batch_id=p_batch_id ORDER BY id FOR UPDATE LOOP
   IF q.status='imported' OR q.revision IS DISTINCT FROM (p_revisions->>q.id::text)::uuid THEN RETURN jsonb_build_object('status','conflict'); END IF;
   first_id:=coalesce(first_id,q.id); n:=n+1;
 END LOOP;
 IF n=0 OR n<>(SELECT count(*) FROM jsonb_object_keys(p_revisions)) THEN RETURN jsonb_build_object('status','conflict'); END IF;
 UPDATE public.queued_imports SET
   target_account_id=CASE WHEN p_patch ? 'target_account_id' THEN (p_patch->>'target_account_id')::bigint ELSE target_account_id END,
   target_credit_card_id=CASE WHEN p_patch ? 'target_credit_card_id' THEN (p_patch->>'target_credit_card_id')::bigint ELSE target_credit_card_id END,
   is_historical=CASE WHEN p_patch ? 'is_historical' THEN (p_patch->>'is_historical')::boolean ELSE is_historical END,
   processing_tasks=CASE WHEN id=first_id THEN coalesce(processing_tasks,'{}')||'{"import_defaults_assignment":true}'::jsonb ELSE processing_tasks END,
   updated_at=now() WHERE account_id=p_budget_id AND source_batch_id=p_batch_id;
 SELECT jsonb_object_agg('queued-'||id,revision) INTO revisions FROM public.queued_imports WHERE account_id=p_budget_id AND source_batch_id=p_batch_id;
 RETURN jsonb_build_object('status','saved','success',true,'updated',n,'revisions',revisions);
END $$;
REVOKE ALL ON FUNCTION public.save_import_defaults(bigint,text,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_import_defaults(bigint,text,jsonb,jsonb) TO authenticated;
COMMIT;
