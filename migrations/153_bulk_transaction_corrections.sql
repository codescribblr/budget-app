BEGIN;
-- One correction is all-or-nothing. Reuse the guarded transaction command for
-- financial effects; hold the budget lock across validation and all row saves.
CREATE FUNCTION public.correct_transactions(p_budget_id bigint,p_operation_id uuid,p_records jsonb,p_patch jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE receipt public.budget_operations; command jsonb; entry jsonb; tx public.transactions;
  latest jsonb:='[]'; stale boolean:=false; result jsonb; affected bigint[]:='{}'; categories bigint[];
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  IF p_operation_id IS NULL OR jsonb_typeof(p_records) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid correction.' USING ERRCODE='22023'; END IF;
  command:=jsonb_build_object('kind','transaction_corrections','records',p_records,'patch',p_patch);
  SELECT * INTO receipt FROM public.budget_operations WHERE account_id=p_budget_id AND operation_id=p_operation_id;
  IF FOUND THEN
    IF receipt.user_id<>auth.uid() OR receipt.command<>command THEN RAISE EXCEPTION 'Operation ID already used.' USING ERRCODE='22023'; END IF;
    RETURN receipt.result;
  END IF;
  IF jsonb_array_length(p_records) NOT BETWEEN 1 AND 100 OR p_patch='{}'
    OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k<>ALL(ARRAY['date','account_id','credit_card_id','transaction_type','is_historical']))
    OR (p_patch ? 'account_id')<>(p_patch ? 'credit_card_id')
    OR (p_patch->>'account_id' IS NOT NULL AND p_patch->>'credit_card_id' IS NOT NULL)
    OR (p_patch ? 'is_historical' AND jsonb_typeof(p_patch->'is_historical')<>'boolean')
    OR (p_patch ? 'transaction_type' AND coalesce(p_patch->>'transaction_type','') NOT IN ('income','expense'))
    OR (p_patch ? 'date' AND (jsonb_typeof(p_patch->'date')<>'string' OR p_patch->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'))
    OR (SELECT count(DISTINCT (value->>'id')::bigint) FROM jsonb_array_elements(p_records))<>jsonb_array_length(p_records) THEN
    RAISE EXCEPTION 'Invalid correction fields or selection.' USING ERRCODE='22023'; END IF;
  -- Transaction dates are stored as text; validate the calendar date here too.
  IF p_patch ? 'date' THEN
    IF to_char((p_patch->>'date')::date,'YYYY-MM-DD')<>p_patch->>'date' THEN
      RAISE EXCEPTION 'Invalid calendar date.' USING ERRCODE='22007'; END IF;
  END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_records) ORDER BY (value->>'id')::bigint LOOP
    IF coalesce((entry->>'id')::bigint,0)<=0 OR entry->>'revision' IS NULL THEN RAISE EXCEPTION 'Missing record version.' USING ERRCODE='22023'; END IF;
    SELECT * INTO tx FROM public.transactions WHERE id=(entry->>'id')::bigint AND budget_account_id=p_budget_id FOR UPDATE;
    IF NOT FOUND THEN stale:=true;
    ELSE
      IF tx.revision<>(entry->>'revision')::uuid THEN stale:=true; END IF;
      latest:=latest||jsonb_build_array(to_jsonb(tx)||jsonb_build_object('splits',(
        SELECT coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('category_name',c.name)),'[]')
        FROM public.transaction_splits s JOIN public.categories c ON c.id=s.category_id WHERE s.transaction_id=tx.id)));
    END IF;
  END LOOP;
  IF stale THEN RETURN jsonb_build_object('status','conflict','latest',latest); END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_records) ORDER BY (value->>'id')::bigint LOOP
    result:=public.save_transaction_command(p_budget_id,(entry->>'id')::bigint,(entry->>'revision')::uuid,p_patch,false,null);
    IF result->>'status'<>'saved' THEN RAISE EXCEPTION 'Records changed during correction.' USING ERRCODE='40001'; END IF;
    affected:=array_append(affected,(entry->>'id')::bigint);
  END LOOP;
  SELECT coalesce(array_agg(DISTINCT s.category_id),'{}') INTO categories
    FROM public.transaction_splits s JOIN public.transactions t ON t.id=s.transaction_id
    WHERE t.id=ANY(affected) AND NOT t.is_historical;
  result:=jsonb_build_object('status','saved','updated',cardinality(affected),'transactionIds',affected,'categoryIds',categories);
  INSERT INTO public.budget_operations(account_id,operation_id,user_id,command,result) VALUES(p_budget_id,p_operation_id,auth.uid(),command,result);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.correct_transactions(bigint,uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.correct_transactions(bigint,uuid,jsonb,jsonb) TO authenticated;
COMMIT;
