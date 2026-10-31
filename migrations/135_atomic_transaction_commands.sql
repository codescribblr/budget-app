BEGIN;
ALTER TABLE public.transactions ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.queued_imports ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();
CREATE TRIGGER transactions_revision BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision();
CREATE TRIGGER queued_imports_revision BEFORE INSERT OR UPDATE ON public.queued_imports FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision();
CREATE FUNCTION public.touch_transaction_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  UPDATE public.transactions SET revision=gen_random_uuid() WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.transaction_id ELSE NEW.transaction_id END;
  IF TG_OP='UPDATE' AND OLD.transaction_id<>NEW.transaction_id THEN UPDATE public.transactions SET revision=gen_random_uuid() WHERE id=OLD.transaction_id; END IF;
  RETURN null;
END $$;
CREATE TRIGGER splits_revision AFTER INSERT OR UPDATE OR DELETE ON public.transaction_splits FOR EACH ROW EXECUTE FUNCTION public.touch_transaction_revision();
CREATE TRIGGER tags_revision AFTER INSERT OR UPDATE OR DELETE ON public.transaction_tags FOR EACH ROW EXECUTE FUNCTION public.touch_transaction_revision();

CREATE FUNCTION public.save_transaction_command(p_budget_id bigint,p_id bigint,p_revision uuid,p_patch jsonb,p_delete boolean DEFAULT false,p_operation_id uuid DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_tx public.transactions; new_tx public.transactions; old_splits jsonb:='[]'; new_splits jsonb; entry jsonb;
  c public.categories; delta numeric; total numeric; saved jsonb; receipt public.budget_operations; command jsonb;
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  command:=jsonb_build_object('kind','transaction','id',p_id,'revision',p_revision,'patch',CASE WHEN p_id IS NULL THEN p_patch-'merchant_group_id' ELSE p_patch END,'delete',p_delete);
  IF p_operation_id IS NOT NULL THEN
    SELECT * INTO receipt FROM public.budget_operations WHERE account_id=p_budget_id AND operation_id=p_operation_id;
    IF FOUND THEN
      IF receipt.user_id<>auth.uid() OR receipt.command<>command THEN RAISE EXCEPTION 'Operation ID already used.' USING ERRCODE='22023'; END IF;
      RETURN jsonb_build_object('status','saved','record',receipt.result);
    END IF;
  END IF;
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k<>ALL(ARRAY['date','description','transaction_type','is_historical','merchant_group_id','merchant_override_id','account_id','credit_card_id','tag_ids','splits','total_amount'])) THEN
    RAISE EXCEPTION 'Invalid transaction details.' USING ERRCODE='22023'; END IF;
  IF p_id IS NOT NULL THEN
    SELECT * INTO old_tx FROM public.transactions WHERE id=p_id AND budget_account_id=p_budget_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
    IF p_revision IS NULL OR old_tx.revision<>p_revision THEN
      RETURN jsonb_build_object('status','conflict','latest',to_jsonb(old_tx)||jsonb_build_object('splits',(SELECT coalesce(jsonb_agg(s),'[]') FROM public.transaction_splits s WHERE transaction_id=p_id),'tag_ids',(SELECT coalesce(jsonb_agg(tag_id),'[]') FROM public.transaction_tags WHERE transaction_id=p_id)));
    END IF;
    SELECT coalesce(jsonb_agg(jsonb_build_object('category_id',category_id,'amount',amount)),'[]') INTO old_splits FROM public.transaction_splits WHERE transaction_id=p_id;
    new_tx:=old_tx;
  ELSE
    IF p_delete OR p_operation_id IS NULL THEN RAISE EXCEPTION 'Invalid new transaction.' USING ERRCODE='22023'; END IF;
    new_tx.transaction_type:='expense';new_tx.is_historical:=false;
  END IF;
  IF p_delete THEN new_splits:='[]';
  ELSE
    new_tx:=jsonb_populate_record(new_tx,p_patch-'tag_ids'-'splits');
    new_splits:=coalesce(p_patch->'splits',old_splits);
    IF new_tx.description IS NULL OR length(btrim(new_tx.description)) NOT BETWEEN 1 AND 10000 OR new_tx.date IS NULL OR new_tx.transaction_type NOT IN ('income','expense') OR new_tx.is_historical IS NULL THEN
      RAISE EXCEPTION 'Enter a date, description and transaction type.' USING ERRCODE='22023'; END IF;
    IF new_tx.account_id IS NOT NULL AND new_tx.credit_card_id IS NOT NULL THEN RAISE EXCEPTION 'Choose one account or card.' USING ERRCODE='22023'; END IF;
    IF (new_tx.account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.accounts WHERE id=new_tx.account_id AND account_id=p_budget_id))
      OR (new_tx.credit_card_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.credit_cards WHERE id=new_tx.credit_card_id AND account_id=p_budget_id))
      OR (new_tx.merchant_group_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.merchant_groups WHERE id=new_tx.merchant_group_id AND account_id=p_budget_id)) THEN
      RAISE EXCEPTION 'Choose accounts and merchants in this budget.' USING ERRCODE='22023'; END IF;
    IF jsonb_typeof(new_splits)<>'array' OR jsonb_array_length(new_splits)>1000 THEN RAISE EXCEPTION 'Invalid splits.' USING ERRCODE='22023'; END IF;
    total:=0;
    FOR entry IN SELECT value FROM jsonb_array_elements(new_splits) LOOP
      IF NOT EXISTS (SELECT 1 FROM public.categories WHERE id=(entry->>'category_id')::bigint AND account_id=p_budget_id)
        OR jsonb_typeof(entry->'amount') IS DISTINCT FROM 'number' OR (entry->>'amount')::numeric<=0 OR (entry->>'amount')::numeric>99999999.99 OR (entry->>'amount')::numeric<>round((entry->>'amount')::numeric,2) THEN
        RAISE EXCEPTION 'Choose an envelope in this budget and a positive amount for every split.' USING ERRCODE='22023'; END IF;
      total:=total+(entry->>'amount')::numeric;
    END LOOP;
    IF jsonb_array_length(new_splits)>0 THEN
      IF p_patch ? 'total_amount' AND (p_patch->>'total_amount')::numeric<>total THEN RAISE EXCEPTION 'Splits must add up to the total.' USING ERRCODE='22023'; END IF;
      new_tx.total_amount:=total;
    END IF;
    IF new_tx.total_amount IS NULL OR new_tx.total_amount<=0 OR new_tx.total_amount>99999999.99 THEN RAISE EXCEPTION 'Enter a positive total.' USING ERRCODE='22023'; END IF;
    IF p_patch ? 'tag_ids' AND (jsonb_typeof(p_patch->'tag_ids')<>'array' OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_patch->'tag_ids') t WHERE NOT EXISTS (SELECT 1 FROM public.tags WHERE id=t::bigint AND account_id=p_budget_id))) THEN
      RAISE EXCEPTION 'Choose tags in this budget.' USING ERRCODE='22023'; END IF;
    IF p_id IS NULL THEN
      INSERT INTO public.transactions(user_id,budget_account_id,date,description,transaction_type,is_historical,total_amount,account_id,credit_card_id,merchant_group_id,merchant_override_id)
      VALUES(auth.uid(),p_budget_id,new_tx.date,new_tx.description,new_tx.transaction_type,new_tx.is_historical,new_tx.total_amount,new_tx.account_id,new_tx.credit_card_id,new_tx.merchant_group_id,new_tx.merchant_override_id) RETURNING * INTO new_tx;
      p_id:=new_tx.id;
    ELSE
      UPDATE public.transactions SET date=new_tx.date,description=new_tx.description,transaction_type=new_tx.transaction_type,is_historical=new_tx.is_historical,total_amount=new_tx.total_amount,
        account_id=new_tx.account_id,credit_card_id=new_tx.credit_card_id,merchant_group_id=new_tx.merchant_group_id,merchant_override_id=new_tx.merchant_override_id,updated_at=now() WHERE id=p_id RETURNING * INTO new_tx;
    END IF;
  END IF;
  -- Apply each category's net difference once. Historical records have no effect.
  FOR c IN SELECT * FROM public.categories WHERE account_id=p_budget_id AND NOT is_system AND id IN (
    SELECT (value->>'category_id')::bigint FROM jsonb_array_elements(old_splits||new_splits)) ORDER BY id FOR UPDATE LOOP
    SELECT coalesce(sum((value->>'amount')::numeric),0) INTO delta FROM jsonb_array_elements(old_splits) WHERE (value->>'category_id')::bigint=c.id;
    delta:=CASE WHEN old_tx.id IS NULL OR old_tx.is_historical THEN 0 WHEN old_tx.transaction_type='income' THEN -delta ELSE delta END;
    SELECT coalesce(sum((value->>'amount')::numeric),0) INTO total FROM jsonb_array_elements(new_splits) WHERE (value->>'category_id')::bigint=c.id;
    delta:=delta+CASE WHEN p_delete OR new_tx.is_historical THEN 0 WHEN new_tx.transaction_type='income' THEN total ELSE -total END;
    IF delta<>0 THEN
      UPDATE public.categories SET current_balance=current_balance+delta,updated_at=now() WHERE id=c.id;
      INSERT INTO public.category_balance_audit(category_id,account_id,user_id,old_balance,new_balance,change_amount,change_type,transaction_id,description,metadata)
      VALUES(c.id,p_budget_id,auth.uid(),c.current_balance,c.current_balance+delta,delta,CASE WHEN p_delete THEN 'transaction_delete' WHEN old_tx.id IS NULL THEN 'transaction_create' ELSE 'transaction_update' END,p_id,coalesce(new_tx.description,old_tx.description),
        jsonb_build_object('transaction_date',coalesce(new_tx.date,old_tx.date),'previous_splits',old_splits,'new_splits',new_splits,'operation_id',p_operation_id));
    END IF;
  END LOOP;
  IF p_delete THEN
    DELETE FROM public.transactions WHERE id=p_id AND budget_account_id=p_budget_id;
    saved:=jsonb_build_object('success',true);
  ELSE
    IF p_patch ? 'splits' OR old_tx.id IS NULL THEN
      DELETE FROM public.transaction_splits WHERE transaction_id=p_id;
      INSERT INTO public.transaction_splits(transaction_id,category_id,amount)
        SELECT p_id,(value->>'category_id')::bigint,(value->>'amount')::numeric FROM jsonb_array_elements(new_splits);
    END IF;
    IF old_tx.id IS NULL AND coalesce(p_patch->'tag_ids','[]')='[]'::jsonb THEN
      SELECT jsonb_set(p_patch,'{tag_ids}',coalesce(jsonb_agg(DISTINCT r.tag_id),'[]')) INTO p_patch
      FROM public.tag_rules r JOIN public.tags tag ON tag.id=r.tag_id AND tag.account_id=p_budget_id
      WHERE r.account_id=p_budget_id AND r.is_active AND CASE r.rule_type
        WHEN 'description' THEN position(lower(r.rule_value) in lower(new_tx.description))>0
        WHEN 'merchant' THEN position(lower(r.rule_value) in lower(coalesce((SELECT display_name FROM public.merchant_groups WHERE id=new_tx.merchant_group_id),new_tx.description)))>0
        WHEN 'category' THEN EXISTS(SELECT 1 FROM public.transaction_splits s JOIN public.categories cat ON cat.id=s.category_id WHERE s.transaction_id=p_id AND (cat.id::text=r.rule_value OR position(lower(r.rule_value) in lower(cat.name))>0))
        WHEN 'amount' THEN CASE WHEN r.rule_value ~ '^[+-]?[0-9]+([.][0-9]+)?$' THEN abs(new_tx.total_amount-r.rule_value::numeric)<0.01 ELSE false END
        ELSE false END;
    END IF;
    IF p_patch ? 'tag_ids' THEN
      DELETE FROM public.transaction_tags WHERE transaction_id=p_id;
      INSERT INTO public.transaction_tags(transaction_id,tag_id) SELECT DISTINCT p_id,value::bigint FROM jsonb_array_elements_text(p_patch->'tag_ids');
    END IF;
    SELECT to_jsonb(t)||jsonb_build_object('splits',(SELECT coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('category_name',cat.name)),'[]') FROM public.transaction_splits s JOIN public.categories cat ON cat.id=s.category_id WHERE s.transaction_id=p_id),
      'tags',(SELECT coalesce(jsonb_agg(tags),'[]') FROM public.transaction_tags tt JOIN public.tags ON tags.id=tt.tag_id WHERE tt.transaction_id=p_id)) INTO saved FROM public.transactions t WHERE id=p_id;
  END IF;
  IF p_operation_id IS NOT NULL THEN INSERT INTO public.budget_operations(account_id,operation_id,user_id,command,result) VALUES(p_budget_id,p_operation_id,auth.uid(),command,saved); END IF;
  RETURN jsonb_build_object('status','saved','record',saved);
END $$;
REVOKE ALL ON FUNCTION public.save_transaction_command(bigint,bigint,uuid,jsonb,boolean,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_transaction_command(bigint,bigint,uuid,jsonb,boolean,uuid) TO authenticated;
COMMIT;
