BEGIN;
-- Keep all history and references when removing an unused envelope. This also
-- protects less-visible uses (rules, recurring payments, and import reviews).
CREATE FUNCTION public.category_housekeeping_usage(p_id bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE ref record; n bigint; result jsonb:='[]';
BEGIN
  FOR ref IN SELECT ns.nspname AS schema_name,cl.relname AS table_name,a.attname AS column_name
    FROM pg_catalog.pg_constraint fk JOIN pg_catalog.pg_class cl ON cl.oid=fk.conrelid
    JOIN pg_catalog.pg_namespace ns ON ns.oid=cl.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid=fk.conrelid AND a.attnum=fk.conkey[1]
    WHERE fk.contype='f' AND fk.confrelid='public.categories'::regclass AND cardinality(fk.conkey)=1 LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I WHERE %I=$1',ref.schema_name,ref.table_name,ref.column_name) INTO n USING p_id;
    IF n>0 THEN result:=result||jsonb_build_array(jsonb_build_object('kind',ref.table_name,'count',n)); END IF;
  END LOOP;
  SELECT count(*) INTO n FROM public.queued_imports q WHERE EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(q.category_review->'patch'->'splits','[]')) s WHERE s->>'category_id'=p_id::text);
  IF n>0 THEN result:=result||jsonb_build_array(jsonb_build_object('kind','import_reviews','count',n)); END IF;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.category_housekeeping_usage(bigint) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.envelope_housekeeping(p_budget_id bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_has_account_access(p_budget_id)
    OR NOT EXISTS(SELECT 1 FROM public.budget_accounts WHERE id=p_budget_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'This budget is unavailable.' USING ERRCODE='42501'; END IF;
  RETURN (SELECT coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object(
    'usage',public.category_housekeeping_usage(c.id),
    'linkedGoals',coalesce((SELECT jsonb_agg(jsonb_build_object('id',g.id,'name',g.name)) FROM public.goals g
      WHERE g.account_id=p_budget_id AND (g.linked_category_id=c.id OR g.funding_category_id=c.id)),'[]'),
    'spending',coalesce((SELECT sum(CASE WHEN t.transaction_type='income' THEN -s.amount ELSE s.amount END)
      FROM public.transaction_splits s JOIN public.transactions t ON t.id=s.transaction_id
      WHERE s.category_id=c.id AND t.budget_account_id=p_budget_id),0)
    ) ORDER BY c.sort_order,c.id),'[]') FROM public.categories c WHERE c.account_id=p_budget_id);
END $$;
REVOKE ALL ON FUNCTION public.envelope_housekeeping(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.envelope_housekeeping(bigint) TO authenticated;

CREATE FUNCTION public.manage_envelopes(p_budget_id bigint,p_operation_id uuid,p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE receipt public.budget_operations; command jsonb; action text:=p_command->>'action';
  entry jsonb; c public.categories; ids bigint[]; result jsonb; i integer:=0;
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  IF p_operation_id IS NULL OR jsonb_typeof(p_command) IS DISTINCT FROM 'object' OR action IS NULL OR action NOT IN ('order','archive','restore','delete','rename-system')
    OR jsonb_typeof(p_command->'records') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid envelope action.' USING ERRCODE='22023'; END IF;
  command:=jsonb_build_object('kind','envelope_housekeeping','command',p_command);
  SELECT * INTO receipt FROM public.budget_operations WHERE account_id=p_budget_id AND operation_id=p_operation_id;
  IF FOUND THEN
    IF receipt.user_id<>auth.uid() OR receipt.command<>command THEN RAISE EXCEPTION 'Operation ID already used.' USING ERRCODE='22023'; END IF;
    RETURN receipt.result;
  END IF;
  SELECT array_agg((value->>'id')::bigint) INTO ids FROM jsonb_array_elements(p_command->'records');
  IF coalesce(cardinality(ids),0) NOT BETWEEN 1 AND 1000 OR (SELECT count(DISTINCT id) FROM unnest(ids) id)<>cardinality(ids)
    OR (action IN ('delete','rename-system') AND cardinality(ids)<>1) THEN RAISE EXCEPTION 'Choose valid envelopes.' USING ERRCODE='22023'; END IF;
  -- Validate the entire selection before writing any row.
  FOR entry IN SELECT value FROM jsonb_array_elements(p_command->'records') LOOP
    SELECT * INTO c FROM public.categories WHERE id=(entry->>'id')::bigint AND account_id=p_budget_id FOR UPDATE;
    IF NOT FOUND OR c.revision IS DISTINCT FROM (entry->>'revision')::uuid THEN RETURN jsonb_build_object('status','conflict'); END IF;
    IF action='rename-system' THEN
      IF NOT c.is_system OR coalesce(c.is_buffer,false) OR length(btrim(coalesce(p_command->>'name',''))) NOT BETWEEN 1 AND 100
        OR length(coalesce(p_command->>'notes',''))>2000 THEN RAISE EXCEPTION 'Choose a system category and a valid name.' USING ERRCODE='22023'; END IF;
    ELSIF c.is_system OR coalesce(c.is_buffer,false) THEN RAISE EXCEPTION 'System categories are managed separately.' USING ERRCODE='22023';
    ELSIF action<>'order' AND (coalesce(c.is_goal,false) OR EXISTS(SELECT 1 FROM public.goals WHERE account_id=p_budget_id AND (linked_category_id=c.id OR funding_category_id=c.id))) THEN
      RAISE EXCEPTION 'Unlink this envelope from its goal first.' USING ERRCODE='22023';
    ELSIF action IN ('archive','delete') AND c.current_balance<>0 THEN RAISE EXCEPTION 'Move the remaining money or cover the shortfall first.' USING ERRCODE='22023';
    END IF;
    IF action='delete' AND public.category_housekeeping_usage(c.id)<>'[]' THEN RAISE EXCEPTION 'This envelope has history or linked records. Archive it to keep them.' USING ERRCODE='22023'; END IF;
    IF action='order' AND coalesce(c.is_archived,false) THEN RAISE EXCEPTION 'Only active envelopes can be ordered.' USING ERRCODE='22023'; END IF;
  END LOOP;
  IF action='order' AND EXISTS(SELECT 1 FROM public.categories WHERE account_id=p_budget_id AND NOT is_system AND NOT coalesce(is_buffer,false) AND NOT coalesce(is_archived,false) AND NOT(id=ANY(ids))) THEN
    RETURN jsonb_build_object('status','conflict'); END IF;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_command->'records') LOOP
    IF action='delete' THEN DELETE FROM public.categories WHERE id=(entry->>'id')::bigint AND account_id=p_budget_id;
    ELSIF action='order' THEN UPDATE public.categories SET sort_order=i WHERE id=(entry->>'id')::bigint AND account_id=p_budget_id; i:=i+1;
    ELSIF action='rename-system' THEN UPDATE public.categories SET name=btrim(p_command->>'name'),notes=nullif(btrim(p_command->>'notes'),'') WHERE id=(entry->>'id')::bigint AND account_id=p_budget_id;
    ELSE UPDATE public.categories SET is_archived=(action='archive') WHERE id=(entry->>'id')::bigint AND account_id=p_budget_id; END IF;
  END LOOP;
  result:=jsonb_build_object('status','saved','count',cardinality(ids));
  INSERT INTO public.budget_operations(account_id,operation_id,user_id,command,result) VALUES(p_budget_id,p_operation_id,auth.uid(),command,result);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.manage_envelopes(bigint,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_envelopes(bigint,uuid,jsonb) TO authenticated;

CREATE FUNCTION public.manage_goal(p_budget_id bigint,p_operation_id uuid,p_command jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE receipt public.budget_operations; command jsonb; action text:=p_command->>'action'; g public.goals; source jsonb;
  old_table text; old_id bigint; new_table text:=p_command->'source'->>'table'; new_id bigint:=(p_command->'source'->>'id')::bigint;
  ref record; source_revision uuid; starting numeric; result jsonb;
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  IF p_operation_id IS NULL OR action IS NULL OR action NOT IN ('delete','relink') OR (p_command->>'id')::bigint IS NULL THEN
    RAISE EXCEPTION 'Invalid goal action.' USING ERRCODE='22023'; END IF;
  command:=jsonb_build_object('kind','goal_housekeeping','command',p_command);
  SELECT * INTO receipt FROM public.budget_operations WHERE account_id=p_budget_id AND operation_id=p_operation_id;
  IF FOUND THEN
    IF receipt.user_id<>auth.uid() OR receipt.command<>command THEN RAISE EXCEPTION 'Operation ID already used.' USING ERRCODE='22023'; END IF;
    RETURN receipt.result;
  END IF;
  SELECT * INTO g FROM public.goals WHERE id=(p_command->>'id')::bigint AND account_id=p_budget_id FOR UPDATE;
  IF NOT FOUND OR g.revision IS DISTINCT FROM (p_command->>'revision')::uuid THEN RETURN jsonb_build_object('status','conflict'); END IF;
  old_table:=CASE WHEN g.linked_category_id IS NOT NULL THEN 'categories' WHEN g.linked_account_id IS NOT NULL THEN 'accounts'
    WHEN g.linked_loan_id IS NOT NULL THEN 'loans' WHEN g.linked_credit_card_id IS NOT NULL THEN 'credit_cards' ELSE 'non_cash_assets' END;
  old_id:=coalesce(g.linked_category_id,g.linked_account_id,g.linked_loan_id,g.linked_credit_card_id,g.linked_non_cash_asset_id);
  IF action='relink' THEN
    IF new_table IS NULL OR new_id IS NULL OR new_id<=0 OR (new_table=old_table AND new_id=old_id)
      OR NOT ((g.goal_type='envelope' AND new_table='categories') OR (g.goal_type='account-linked' AND new_table='accounts')
       OR (g.goal_type='asset-linked' AND new_table='non_cash_assets') OR (g.goal_type='debt-paydown' AND new_table IN ('loans','credit_cards'))) THEN
      RAISE EXCEPTION 'Choose a different source of the same tracking kind.' USING ERRCODE='22023'; END IF;
  ELSE new_table:=null; new_id:=null; END IF;
  FOR ref IN SELECT DISTINCT t,id FROM (VALUES(old_table,old_id),(new_table,new_id)) refs(t,id) WHERE id IS NOT NULL ORDER BY t,id LOOP
    source_revision:=null;
    EXECUTE format('SELECT revision FROM public.%I WHERE id=$1 AND account_id=$2 FOR UPDATE',ref.t) INTO source_revision USING ref.id,p_budget_id;
    IF source_revision IS NULL OR source_revision IS DISTINCT FROM (p_command->'sourceRevisions'->>(ref.t||':'||ref.id))::uuid THEN
      RETURN jsonb_build_object('status','conflict'); END IF;
  END LOOP;
  IF action='relink' THEN
    EXECUTE format('SELECT to_jsonb(s) FROM public.%I s WHERE id=$1 AND account_id=$2',new_table) INTO source USING new_id,p_budget_id;
    IF EXISTS(SELECT 1 FROM public.goals WHERE account_id=p_budget_id AND id<>g.id AND
      ((new_table='categories' AND (linked_category_id=new_id OR funding_category_id=new_id)) OR
       (new_table='accounts' AND linked_account_id=new_id) OR
       (new_table='loans' AND linked_loan_id=new_id AND status<>'completed') OR
       (new_table='credit_cards' AND linked_credit_card_id=new_id AND status<>'completed') OR
       (new_table='non_cash_assets' AND linked_non_cash_asset_id=new_id AND status<>'completed'))) THEN
      RAISE EXCEPTION 'This source is already used by another goal.' USING ERRCODE='22023'; END IF;
    IF new_table='categories' AND ((source->>'is_system')::boolean OR coalesce((source->>'is_buffer')::boolean,false) OR coalesce((source->>'is_goal')::boolean,false) OR coalesce((source->>'is_archived')::boolean,false)) THEN
      RAISE EXCEPTION 'Choose an active ordinary envelope.' USING ERRCODE='22023'; END IF;
    IF new_table='accounts' AND source->>'linked_goal_id' IS NOT NULL THEN RAISE EXCEPTION 'This account already has a goal.' USING ERRCODE='22023'; END IF;
    IF new_table='non_cash_assets' AND source->>'asset_type'<>'investment' THEN RAISE EXCEPTION 'Choose an investment.' USING ERRCODE='22023'; END IF;
    IF g.goal_type='debt-paydown' THEN
      starting:=CASE WHEN new_table='loans' THEN (source->>'balance')::numeric ELSE (source->>'credit_limit')::numeric-(source->>'available_credit')::numeric END;
      IF starting<=0 THEN RAISE EXCEPTION 'This debt is already paid off.' USING ERRCODE='22023'; END IF;
    END IF;
  END IF;
  -- Unlink only: no account inclusion change, money release, or history removal.
  IF old_table='categories' THEN UPDATE public.categories SET is_goal=false WHERE id=old_id AND account_id=p_budget_id; END IF;
  IF old_table='accounts' THEN UPDATE public.accounts SET linked_goal_id=null WHERE id=old_id AND account_id=p_budget_id AND linked_goal_id=g.id; END IF;
  IF action='delete' THEN DELETE FROM public.goals WHERE id=g.id AND account_id=p_budget_id;
  ELSE
    IF new_table='categories' THEN UPDATE public.categories SET is_goal=true,monthly_amount=g.monthly_contribution,monthly_target=g.monthly_contribution,
      category_type='monthly_expense',annual_target=null,target_balance=null WHERE id=new_id AND account_id=p_budget_id; END IF;
    IF new_table='accounts' THEN UPDATE public.accounts SET linked_goal_id=g.id,include_in_totals=false WHERE id=new_id AND account_id=p_budget_id; END IF;
    UPDATE public.goals SET linked_category_id=CASE WHEN new_table='categories' THEN new_id END,
      linked_account_id=CASE WHEN new_table='accounts' THEN new_id END, linked_credit_card_id=CASE WHEN new_table='credit_cards' THEN new_id END,
      linked_loan_id=CASE WHEN new_table='loans' THEN new_id END, linked_non_cash_asset_id=CASE WHEN new_table='non_cash_assets' THEN new_id END,
      target_amount=coalesce(starting,g.target_amount), status=CASE WHEN g.status='paused' THEN 'paused' ELSE 'active' END
      WHERE id=g.id AND account_id=p_budget_id;
  END IF;
  result:=jsonb_build_object('status','saved');
  INSERT INTO public.budget_operations(account_id,operation_id,user_id,command,result) VALUES(p_budget_id,p_operation_id,auth.uid(),command,result);
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.manage_goal(bigint,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_goal(bigint,uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
