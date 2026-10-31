BEGIN;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['income_streams','loans','non_cash_assets','goals','pending_checks'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid()',t);
    EXECUTE format('CREATE TRIGGER replace_revision BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision()',t);
  END LOOP;
END $$;

CREATE FUNCTION public.save_guarded_record(p_budget_id bigint,p_table text,p_id bigint,p_revision uuid,p_patch jsonb,p_delete boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row jsonb; new_row jsonb; allowed text[]; assignments text; key text; linked bigint; amount numeric;
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  allowed:=CASE p_table
    WHEN 'categories' THEN ARRAY['name','monthly_amount','monthly_target','annual_target','target_balance','category_type','priority','notes','is_archived','sort_order']
    WHEN 'income_streams' THEN ARRAY['name','annual_income','tax_rate','pay_frequency','include_extra_paychecks','pre_tax_deduction_items','include_in_budget','sort_order','linked_non_cash_asset_id']
    WHEN 'loans' THEN ARRAY['name','balance','interest_rate','minimum_payment','payment_due_date','open_date','maturity_date','starting_balance','institution','include_in_net_worth','linked_non_cash_asset_id','sort_order']
    WHEN 'non_cash_assets' THEN ARRAY['name','asset_type','current_value','estimated_return_percentage','is_rmd_qualified','is_liquid','sort_order']
    WHEN 'goals' THEN ARRAY['name','target_amount','target_date','monthly_contribution','status','notes','sort_order','funding_category_id','linked_account_id']
    WHEN 'pending_checks' THEN ARRAY['description','amount','type']
    WHEN 'accounts' THEN ARRAY[]::text[] WHEN 'credit_cards' THEN ARRAY[]::text[]
  END;
  IF allowed IS NULL OR p_revision IS NULL OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object'
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k<>ALL(allowed)) THEN
    RAISE EXCEPTION 'Refresh this record before saving valid details.' USING ERRCODE='22023'; END IF;
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 AND account_id=$2 FOR UPDATE',p_table) INTO old_row USING p_id,p_budget_id;
  IF old_row IS NULL THEN RETURN jsonb_build_object('status','missing'); END IF;
  IF (old_row->>'revision')::uuid<>p_revision THEN RETURN jsonb_build_object('status','conflict','latest',old_row); END IF;
  IF p_table='categories' AND ((old_row->>'is_system')::boolean OR (old_row->>'is_goal')::boolean) THEN
    RAISE EXCEPTION 'Use the linked goal or buffer to manage this envelope.' USING ERRCODE='22023'; END IF;
  IF p_delete THEN
    IF p_table='categories' AND ((old_row->>'current_balance')::numeric<>0 OR EXISTS (SELECT 1 FROM public.transaction_splits WHERE category_id=p_id)) THEN
      RAISE EXCEPTION 'Move its money first, then archive this envelope to preserve its history.' USING ERRCODE='22023'; END IF;
    IF p_table='goals' THEN
      IF old_row->>'goal_type'='account-linked' THEN
        UPDATE public.accounts SET linked_goal_id=null,include_in_totals=true WHERE account_id=p_budget_id AND id=(old_row->>'linked_account_id')::bigint;
      ELSIF old_row->>'goal_type'='envelope' THEN
        UPDATE public.categories SET is_goal=false WHERE account_id=p_budget_id AND id=(old_row->>'linked_category_id')::bigint;
      END IF;
    END IF;
    EXECUTE format('DELETE FROM public.%I WHERE id=$1 AND account_id=$2',p_table) USING p_id,p_budget_id;
    RETURN jsonb_build_object('status','saved','record',jsonb_build_object('success',true));
  END IF;
  IF p_patch='{}' OR (p_patch ? 'name' AND (jsonb_typeof(p_patch->'name')<>'string' OR length(btrim(p_patch->>'name')) NOT BETWEEN 1 AND 255)) THEN
    RAISE EXCEPTION 'Enter the details to save.' USING ERRCODE='22023'; END IF;
  FOR key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF key=ANY(ARRAY['balance','current_value','monthly_amount','monthly_target','annual_target','target_balance','annual_income','minimum_payment','starting_balance','target_amount','monthly_contribution','amount']) AND p_patch->key<>'null' THEN
      amount:=(p_patch->>key)::numeric;
      IF jsonb_typeof(p_patch->key)<>'number' OR amount<0 OR amount>99999999.99 OR amount<>round(amount,2) THEN
        RAISE EXCEPTION 'Use nonnegative amounts with at most two decimal places.' USING ERRCODE='22023'; END IF;
    END IF;
  END LOOP;
  IF p_patch ? 'linked_non_cash_asset_id' AND p_patch->'linked_non_cash_asset_id'<>'null' AND NOT EXISTS (
    SELECT 1 FROM public.non_cash_assets WHERE id=(p_patch->>'linked_non_cash_asset_id')::bigint AND account_id=p_budget_id
  ) THEN RAISE EXCEPTION 'Choose an asset in this budget.' USING ERRCODE='22023'; END IF;
  IF p_table='categories' THEN
    IF (p_patch->>'is_archived')::boolean AND (old_row->>'current_balance')::numeric<>0 THEN
      RAISE EXCEPTION 'Move the money before archiving this envelope.' USING ERRCODE='22023'; END IF;
    CASE p_patch->>'category_type'
      WHEN 'monthly_expense' THEN p_patch:=p_patch||jsonb_build_object('annual_target',null,'target_balance',null,'monthly_target',coalesce(p_patch->'monthly_amount',old_row->'monthly_amount'));
      WHEN 'accumulation' THEN p_patch:=p_patch||jsonb_build_object('monthly_target',null,'target_balance',null,'monthly_amount',round(coalesce(p_patch->>'annual_target',old_row->>'annual_target')::numeric/12,2));
      WHEN 'target_balance' THEN p_patch:=p_patch||jsonb_build_object('monthly_target',null,'annual_target',null);
      ELSE null;
    END CASE;
  ELSIF p_table='income_streams' THEN
    IF p_patch ? 'pre_tax_deduction_items' THEN
      IF jsonb_typeof(p_patch->'pre_tax_deduction_items')<>'array' THEN RAISE EXCEPTION 'Invalid deductions.' USING ERRCODE='22023'; END IF;
      p_patch:=jsonb_set(p_patch,'{pre_tax_deduction_items}',to_jsonb((p_patch->'pre_tax_deduction_items')::text));
    END IF;
  ELSIF p_table='goals' THEN
    IF p_patch ? 'funding_category_id' AND p_patch->'funding_category_id'<>'null' THEN
      linked:=(p_patch->>'funding_category_id')::bigint;
      IF old_row->>'goal_type'<>'debt-paydown' OR NOT EXISTS (SELECT 1 FROM public.categories WHERE id=linked AND account_id=p_budget_id AND NOT is_system AND NOT is_buffer AND NOT is_goal AND NOT coalesce(is_archived,false))
        OR EXISTS (SELECT 1 FROM public.goals WHERE account_id=p_budget_id AND id<>p_id AND (linked_category_id=linked OR funding_category_id=linked)) THEN
        RAISE EXCEPTION 'Choose an active envelope not already used by another goal.' USING ERRCODE='22023'; END IF;
    END IF;
    IF p_patch ? 'linked_account_id' AND p_patch->'linked_account_id' IS DISTINCT FROM old_row->'linked_account_id' THEN
      linked:=(p_patch->>'linked_account_id')::bigint;
      IF old_row->>'goal_type'<>'account-linked' OR linked IS NULL OR NOT EXISTS (SELECT 1 FROM public.accounts WHERE id=linked AND account_id=p_budget_id)
        OR EXISTS (SELECT 1 FROM public.goals WHERE account_id=p_budget_id AND id<>p_id AND linked_account_id=linked) THEN
        RAISE EXCEPTION 'Choose an account not already used by another goal.' USING ERRCODE='22023'; END IF;
      UPDATE public.accounts SET linked_goal_id=null,include_in_totals=true WHERE account_id=p_budget_id AND id=(old_row->>'linked_account_id')::bigint;
      UPDATE public.accounts SET linked_goal_id=p_id,include_in_totals=false WHERE account_id=p_budget_id AND id=linked;
    END IF;
    IF p_patch ? 'monthly_contribution' AND old_row->>'linked_category_id' IS NOT NULL THEN
      UPDATE public.categories SET monthly_amount=(p_patch->>'monthly_contribution')::numeric,
        monthly_target=CASE WHEN old_row->>'purpose' IS NOT NULL THEN (p_patch->>'monthly_contribution')::numeric ELSE monthly_target END
      WHERE account_id=p_budget_id AND id=(old_row->>'linked_category_id')::bigint;
    END IF;
  END IF;
  SELECT string_agg(format('%I=r.%I',k,k),',') INTO assignments FROM jsonb_object_keys(p_patch) k;
  EXECUTE format('UPDATE public.%1$I t SET %2$s,updated_at=now() FROM jsonb_populate_record(null::public.%1$I,$1) r WHERE t.id=$2 AND t.account_id=$3 RETURNING to_jsonb(t)',p_table,assignments)
    INTO new_row USING old_row||p_patch,p_id,p_budget_id;
  IF p_table='loans' AND old_row->'balance' IS DISTINCT FROM new_row->'balance' THEN
    INSERT INTO public.loan_balance_audit(loan_id,budget_account_id,user_id,old_balance,new_balance,change_amount,change_type)
    VALUES(p_id,p_budget_id,auth.uid(),(old_row->>'balance')::numeric,(new_row->>'balance')::numeric,(new_row->>'balance')::numeric-(old_row->>'balance')::numeric,'manual_edit');
  ELSIF p_table='non_cash_assets' AND old_row->'current_value' IS DISTINCT FROM new_row->'current_value' THEN
    INSERT INTO public.asset_value_audit(asset_id,budget_account_id,user_id,old_value,new_value,change_amount,change_type)
    VALUES(p_id,p_budget_id,auth.uid(),(old_row->>'current_value')::numeric,(new_row->>'current_value')::numeric,(new_row->>'current_value')::numeric-(old_row->>'current_value')::numeric,'manual_edit');
  END IF;
  IF p_table='income_streams' THEN new_row:=jsonb_set(new_row,'{pre_tax_deduction_items}',coalesce((new_row->>'pre_tax_deduction_items')::jsonb,'[]')); END IF;
  RETURN jsonb_build_object('status','saved','record',new_row);
END $$;
REVOKE ALL ON FUNCTION public.save_guarded_record(bigint,text,bigint,uuid,jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_guarded_record(bigint,text,bigint,uuid,jsonb,boolean) TO authenticated;
COMMIT;
