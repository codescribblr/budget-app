-- Separate manually confirmed carried debt from live card liability. Preserve classic behavior.
BEGIN;
ALTER TABLE public.credit_cards
 ADD COLUMN carried_debt_balance numeric(12,2) CHECK (carried_debt_balance>=0),
 ADD COLUMN carried_debt_as_of date,
 ADD CONSTRAINT carried_debt_review_pair CHECK ((carried_debt_balance IS NULL)=(carried_debt_as_of IS NULL));
COMMENT ON COLUMN public.credit_cards.carried_debt_balance IS 'Explicitly recorded carried debt for payoff tracking; null means not reviewed. Never substitutes for current liability in available money or net worth.';
CREATE OR REPLACE FUNCTION public.save_guarded_account(p_budget_id bigint, p_kind text,
  p_id bigint, p_revision uuid, p_patch jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_row jsonb; new_row jsonb; cash public.accounts; card public.credit_cards;
BEGIN
  -- This narrow definer function also permits owners without account_users rows
  -- to insert their audit record. No arbitrary SQL/table name is accepted.
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.budget_accounts b WHERE b.id=p_budget_id AND b.deleted_at IS NULL
      AND (b.owner_id=auth.uid() OR EXISTS (
        SELECT 1 FROM public.account_users u WHERE u.account_id=b.id
          AND u.user_id=auth.uid() AND u.status='active' AND u.role IN ('owner','editor')))
  ) THEN RAISE EXCEPTION 'No write access to this budget' USING ERRCODE='42501'; END IF;
  IF p_revision IS NULL OR p_kind NOT IN ('account','card') OR p_kind IS NULL
    OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object' OR p_patch='{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid guarded update' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k <> ALL (
    CASE p_kind WHEN 'account' THEN ARRAY['name','balance','account_type','include_in_totals','sort_order']
    ELSE ARRAY['name','credit_limit','available_credit','include_in_totals','sort_order','statement_balance','statement_balance_as_of','carried_debt_balance','carried_debt_as_of'] END
  )) THEN RAISE EXCEPTION 'Unsupported field' USING ERRCODE='22023'; END IF;
  IF (p_patch ? 'name' AND (jsonb_typeof(p_patch->'name') <> 'string' OR length(btrim(p_patch->>'name')) NOT BETWEEN 1 AND 100))
    OR (p_patch ? 'include_in_totals' AND jsonb_typeof(p_patch->'include_in_totals') <> 'boolean')
    OR (p_patch ? 'account_type' AND (p_patch->>'account_type' IS NULL OR p_patch->>'account_type' NOT IN ('checking','savings','cash')))
    OR EXISTS (SELECT 1 FROM jsonb_each(p_patch) e WHERE e.key IN ('balance','credit_limit','available_credit','sort_order')
      AND jsonb_typeof(e.value) <> 'number') THEN
    RAISE EXCEPTION 'Invalid account details' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(p_patch) e WHERE e.key IN ('balance','credit_limit','available_credit')
    AND (abs((e.value::text)::numeric)>99999999.99 OR (e.value::text)::numeric<>round((e.value::text)::numeric,2)))
    OR (p_patch ? 'credit_limit' AND (p_patch->>'credit_limit')::numeric<0) THEN
    RAISE EXCEPTION 'Invalid monetary amount' USING ERRCODE='22023';
  END IF;

  IF p_patch ? 'carried_debt_balance' AND p_patch->'carried_debt_balance'<>'null' THEN
    IF jsonb_typeof(p_patch->'carried_debt_balance')<>'number' OR (p_patch->>'carried_debt_balance')::numeric<0
      OR (p_patch->>'carried_debt_balance')::numeric>99999999.99 OR (p_patch->>'carried_debt_balance')::numeric<>round((p_patch->>'carried_debt_balance')::numeric,2) THEN
      RAISE EXCEPTION 'Enter a nonnegative carried balance with at most two decimals.' USING ERRCODE='22023'; END IF;
  END IF;
  IF p_kind='account' THEN
    SELECT * INTO cash FROM public.accounts WHERE id=p_id AND account_id=p_budget_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
    old_row:=to_jsonb(cash);
    IF cash.revision<>p_revision THEN RETURN jsonb_build_object('status','conflict','latest',old_row); END IF;
    cash:=jsonb_populate_record(cash,p_patch);
    UPDATE public.accounts SET name=cash.name, balance=cash.balance, account_type=cash.account_type,
      include_in_totals=cash.include_in_totals, sort_order=cash.sort_order, updated_at=now()
      WHERE id=p_id AND account_id=p_budget_id RETURNING to_jsonb(accounts.*) INTO new_row;
    IF (old_row->>'balance')::numeric<>(new_row->>'balance')::numeric THEN
      INSERT INTO public.account_balance_audit(account_id,budget_account_id,user_id,old_balance,new_balance,change_amount,change_type)
      VALUES(p_id,p_budget_id,auth.uid(),(old_row->>'balance')::numeric,(new_row->>'balance')::numeric,
        (new_row->>'balance')::numeric-(old_row->>'balance')::numeric,'manual_edit');
    END IF;
  ELSE
    SELECT * INTO card FROM public.credit_cards WHERE id=p_id AND account_id=p_budget_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
    old_row:=to_jsonb(card);
    IF card.revision<>p_revision THEN RETURN jsonb_build_object('status','conflict','latest',old_row); END IF;
    card:=jsonb_populate_record(card,p_patch);
    IF (card.carried_debt_balance IS NULL)<>(card.carried_debt_as_of IS NULL) OR card.carried_debt_as_of>current_date THEN
      RAISE EXCEPTION 'Record the carried balance and its review date together.' USING ERRCODE='22023'; END IF;
    UPDATE public.credit_cards SET name=card.name, credit_limit=card.credit_limit, available_credit=card.available_credit,
      current_balance=card.credit_limit-card.available_credit, include_in_totals=card.include_in_totals,
      sort_order=card.sort_order, statement_balance=card.statement_balance, statement_balance_as_of=card.statement_balance_as_of,
      carried_debt_balance=card.carried_debt_balance,carried_debt_as_of=card.carried_debt_as_of,
      updated_at=now() WHERE id=p_id AND account_id=p_budget_id RETURNING to_jsonb(credit_cards.*) INTO new_row;
    IF (old_row->>'available_credit')::numeric<>(new_row->>'available_credit')::numeric THEN
      INSERT INTO public.credit_card_balance_audit(credit_card_id,budget_account_id,user_id,old_available_credit,new_available_credit,change_amount,change_type)
      VALUES(p_id,p_budget_id,auth.uid(),(old_row->>'available_credit')::numeric,(new_row->>'available_credit')::numeric,
        (new_row->>'available_credit')::numeric-(old_row->>'available_credit')::numeric,'manual_edit');
    END IF;
  END IF;
  RETURN jsonb_build_object('status','saved','record',new_row,'previous',old_row);
END $$;
REVOKE ALL ON FUNCTION public.save_guarded_account(bigint,text,bigint,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_guarded_account(bigint,text,bigint,uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.save_guarded_record(p_budget_id bigint,p_table text,p_id bigint,p_revision uuid,p_patch jsonb,p_delete boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row jsonb; new_row jsonb; allowed text[]; assignments text; key text; linked bigint; amount numeric;
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  allowed:=CASE p_table
    WHEN 'categories' THEN ARRAY['name','monthly_amount','monthly_target','annual_target','target_balance','category_type','priority','notes','is_archived','sort_order']
    WHEN 'income_streams' THEN ARRAY['name','annual_income','tax_rate','pay_frequency','include_extra_paychecks','pre_tax_deduction_items','include_in_budget','sort_order','linked_non_cash_asset_id']
    WHEN 'loans' THEN ARRAY['name','balance','interest_rate','minimum_payment','payment_due_date','open_date','maturity_date','starting_balance','institution','include_in_net_worth','linked_non_cash_asset_id','sort_order']
    WHEN 'non_cash_assets' THEN ARRAY['name','asset_type','current_value','estimated_return_percentage','is_rmd_qualified','is_liquid','sort_order','address','property_type','bedrooms','bathrooms','square_footage','rentcast_enabled','rentcast_value_preference']
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
  IF p_table='non_cash_assets' THEN
    new_row:=old_row||p_patch;
    IF (new_row->>'rentcast_enabled')::boolean AND (new_row->>'asset_type'<>'real_estate' OR length(btrim(coalesce(new_row->>'address','')))=0) THEN
      RAISE EXCEPTION 'Automatic valuations need a real estate asset and full address.' USING ERRCODE='22023'; END IF;
    IF length(coalesce(new_row->>'address',''))>500 OR EXISTS(SELECT 1 FROM jsonb_each(p_patch) e WHERE e.key IN ('bedrooms','bathrooms','square_footage') AND e.value<>'null' AND (jsonb_typeof(e.value)<>'number' OR (e.value::text)::numeric<0 OR (e.value::text)::numeric>99999999)) THEN
      RAISE EXCEPTION 'Check the property details.' USING ERRCODE='22023'; END IF;
  END IF;
  SELECT string_agg(format('%I=r.%I',k,k),',') INTO assignments FROM jsonb_object_keys(p_patch) k;
  EXECUTE format('UPDATE public.%1$I t SET %2$s,updated_at=now() FROM jsonb_populate_record(null::public.%1$I,$1) r WHERE t.id=$2 AND t.account_id=$3 RETURNING to_jsonb(t)',p_table,assignments)
    INTO new_row USING old_row||p_patch,p_id,p_budget_id;
  IF p_table='loans' AND old_row->'balance' IS DISTINCT FROM new_row->'balance' THEN
    INSERT INTO public.loan_balance_audit(loan_id,budget_account_id,user_id,old_balance,new_balance,change_amount,change_type)
    VALUES(p_id,p_budget_id,auth.uid(),(old_row->>'balance')::numeric,(new_row->>'balance')::numeric,(new_row->>'balance')::numeric-(old_row->>'balance')::numeric,'manual_edit');
  ELSIF p_table='non_cash_assets' AND old_row->'current_value' IS DISTINCT FROM new_row->'current_value' THEN
    INSERT INTO public.asset_value_audit(asset_id,budget_account_id,user_id,old_value,new_value,change_amount,change_type,description)
    VALUES(p_id,p_budget_id,auth.uid(),(old_row->>'current_value')::numeric,(new_row->>'current_value')::numeric,(new_row->>'current_value')::numeric-(old_row->>'current_value')::numeric,'manual_edit',CASE WHEN p_patch ? 'rentcast_value_preference' THEN 'Selected RentCast '||(p_patch->>'rentcast_value_preference')||' value' ELSE 'Recorded value updated' END);
  END IF;
  IF p_table='income_streams' THEN new_row:=jsonb_set(new_row,'{pre_tax_deduction_items}',coalesce((new_row->>'pre_tax_deduction_items')::jsonb,'[]')); END IF;
  RETURN jsonb_build_object('status','saved','record',new_row);
END $$;
REVOKE ALL ON FUNCTION public.save_guarded_record(bigint,text,bigint,uuid,jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_guarded_record(bigint,text,bigint,uuid,jsonb,boolean) TO authenticated;

-- Provider results must not overwrite a property edited during the network request.
-- Only the server's integration worker may call this; user writes use guarded records.
CREATE FUNCTION public.apply_rentcast_estimate(p_budget_id bigint,p_asset_id bigint,p_revision uuid,p_estimate jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.non_cash_assets; v numeric; old_value numeric; pref text; owner uuid;
BEGIN
 SELECT owner_id INTO owner FROM public.budget_accounts WHERE id=p_budget_id AND deleted_at IS NULL FOR UPDATE;
 IF owner IS NULL THEN RAISE EXCEPTION 'Budget unavailable' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM public.non_cash_assets WHERE id=p_asset_id AND account_id=p_budget_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
 IF p_revision IS NULL OR a.revision<>p_revision THEN RETURN jsonb_build_object('status','conflict'); END IF;
 IF NOT a.rentcast_enabled OR a.asset_type<>'real_estate' THEN RAISE EXCEPTION 'Property tracking is disabled' USING ERRCODE='22023'; END IF;
 pref:=coalesce(a.rentcast_value_preference,'estimate');
 v:=CASE pref WHEN 'low' THEN coalesce(p_estimate->>'priceRangeLow',p_estimate->>'price')::numeric WHEN 'high' THEN coalesce(p_estimate->>'priceRangeHigh',p_estimate->>'price')::numeric ELSE (p_estimate->>'price')::numeric END;
 IF v IS NULL OR v<0 OR v>99999999.99 THEN RAISE EXCEPTION 'Invalid property estimate' USING ERRCODE='22023'; END IF;
 old_value:=a.current_value;
 SELECT owner_id INTO owner FROM public.budget_accounts WHERE id=p_budget_id AND deleted_at IS NULL;
 IF owner IS NULL THEN RAISE EXCEPTION 'Budget unavailable' USING ERRCODE='22023'; END IF;
 INSERT INTO public.rentcast_valuations(asset_id,account_id,estimated_value,price_range_low,price_range_high,subject_property,comparables,raw_response)
 VALUES(p_asset_id,p_budget_id,(p_estimate->>'price')::numeric,(p_estimate->>'priceRangeLow')::numeric,(p_estimate->>'priceRangeHigh')::numeric,p_estimate->'subjectProperty',p_estimate->'comparables',p_estimate);
 UPDATE public.non_cash_assets SET current_value=round(v,2),rentcast_last_sync_at=now(),rentcast_last_error=null,updated_at=now() WHERE id=p_asset_id;
 IF old_value<>round(v,2) THEN
 INSERT INTO public.asset_value_audit(asset_id,budget_account_id,user_id,old_value,new_value,change_amount,change_type,description,metadata)
 VALUES(p_asset_id,p_budget_id,owner,old_value,round(v,2),round(v,2)-old_value,'value_update','RentCast automated valuation',jsonb_build_object('source','rentcast','value_preference',pref));
 END IF;
 RETURN jsonb_build_object('status','saved','oldValue',old_value,'newValue',round(v,2));
END $$;
REVOKE ALL ON FUNCTION public.apply_rentcast_estimate(bigint,bigint,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_rentcast_estimate(bigint,bigint,uuid,jsonb) TO service_role;

CREATE FUNCTION public.reserve_rentcast_request(p_integration_id bigint) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.integration_settings; n integer; month text:=to_char(now() AT TIME ZONE 'UTC','YYYY-MM');
BEGIN
 SELECT * INTO r FROM public.integration_settings WHERE id=p_integration_id AND integration_type='rentcast' AND is_enabled FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'RentCast integration is disabled' USING ERRCODE='22023'; END IF;
 n:=CASE WHEN r.usage_month=month THEN coalesce(r.requests_this_month,0) ELSE 0 END;
 IF coalesce((r.config->>'enforce_monthly_limit')::boolean,true) AND n>=coalesce((r.config->>'monthly_request_limit')::integer,50) THEN RAISE EXCEPTION 'Monthly RentCast API request limit reached' USING ERRCODE='P0001'; END IF;
 UPDATE public.integration_settings SET requests_this_month=n+1,usage_month=month,updated_at=now() WHERE id=r.id RETURNING * INTO r;
 RETURN to_jsonb(r);
END $$;
REVOKE ALL ON FUNCTION public.reserve_rentcast_request(bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_rentcast_request(bigint) TO service_role;
COMMIT;
