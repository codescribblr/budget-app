-- All new-interface money movements commit balances, funding and audit together.
BEGIN;
ALTER TABLE public.categories ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();
CREATE TRIGGER categories_revision BEFORE INSERT OR UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision();

CREATE TABLE public.budget_operations (
  account_id bigint NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  command jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(account_id, operation_id)
);
ALTER TABLE public.budget_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.budget_operations FROM anon, authenticated;
GRANT ALL ON public.budget_operations TO service_role;

CREATE FUNCTION public.lock_budget_write(p_budget_id bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.budget_accounts b WHERE b.id=p_budget_id AND b.deleted_at IS NULL
    AND (b.owner_id=auth.uid() OR EXISTS (SELECT 1 FROM public.account_users u
      WHERE u.account_id=b.id AND u.user_id=auth.uid() AND u.status='active' AND u.role IN ('owner','editor')))
  ) THEN RAISE EXCEPTION 'You no longer have edit access to this budget.' USING ERRCODE='42501'; END IF;
  -- Every command acquires this lock before reading balances or locking rows.
  PERFORM 1 FROM public.budget_accounts WHERE id=p_budget_id FOR UPDATE;
END $$;
REVOKE ALL ON FUNCTION public.lock_budget_write(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lock_budget_write(bigint) TO authenticated;

CREATE FUNCTION public.budget_available_money(p_budget_id bigint) RETURNS numeric
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce((SELECT sum(balance) FROM public.accounts WHERE account_id=p_budget_id AND include_in_totals),0)
    - coalesce((SELECT sum(current_balance) FROM public.categories WHERE account_id=p_budget_id AND (NOT is_system OR is_buffer)),0)
    - coalesce((SELECT sum(greatest(0,coalesce(current_balance,credit_limit-available_credit))) FROM public.credit_cards WHERE account_id=p_budget_id AND include_in_totals),0)
    + coalesce((SELECT sum(CASE WHEN type='income' THEN amount ELSE -amount END) FROM public.pending_checks WHERE account_id=p_budget_id),0)
$$;
REVOKE ALL ON FUNCTION public.budget_available_money(bigint) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.run_envelope_command(p_budget_id bigint, p_operation_id uuid, p_command jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  kind text:=p_command->>'kind'; prior public.budget_operations; c public.categories; other public.categories;
  buffer public.categories; entry jsonb; old_balance numeric; amount numeric; total numeric:=0;
  available numeric; withdrawal numeric:=coalesce((p_command->>'bufferWithdrawAmount')::numeric,0);
  allocation_month date; result jsonb; expected jsonb:=p_command->'expectedRevisions';
  allocations jsonb; changed jsonb:='[]'; change_type text; metadata jsonb;
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  IF p_operation_id IS NULL OR jsonb_typeof(p_command) IS DISTINCT FROM 'object'
    OR kind IS NULL OR kind NOT IN ('transfer','set-balance','allocate','buffer-add','buffer-release') THEN
    RAISE EXCEPTION 'Invalid money command.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO prior FROM public.budget_operations WHERE account_id=p_budget_id AND operation_id=p_operation_id;
  IF FOUND THEN
    IF prior.user_id<>auth.uid() OR prior.command<>p_command THEN
      RAISE EXCEPTION 'This operation ID was already used for another change.' USING ERRCODE='22023';
    END IF;
    RETURN jsonb_build_object('status','saved','result',prior.result);
  END IF;
  available:=public.budget_available_money(p_budget_id);
  IF p_command ? 'expectedAvailable' AND (p_command->>'expectedAvailable')::numeric IS DISTINCT FROM available THEN
    RETURN jsonb_build_object('status','conflict','error','Available to save changed. Review the latest balances before continuing.');
  END IF;
  IF expected IS NOT NULL THEN
    IF jsonb_typeof(expected)<>'object' THEN RAISE EXCEPTION 'Invalid envelope revisions.' USING ERRCODE='22023'; END IF;
    FOR entry IN SELECT jsonb_build_object('id',key,'revision',value) FROM jsonb_each_text(expected) LOOP
      SELECT * INTO c FROM public.categories WHERE id=(entry->>'id')::bigint AND account_id=p_budget_id FOR UPDATE;
      IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
      IF c.revision IS DISTINCT FROM (entry->>'revision')::uuid THEN
        RETURN jsonb_build_object('status','conflict','latest',to_jsonb(c),'error','An envelope changed elsewhere. Review the latest balances before continuing.');
      END IF;
    END LOOP;
  END IF;
  IF kind IN ('buffer-add','buffer-release') OR withdrawal>0 THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_feature_flags WHERE account_id=p_budget_id AND feature_name='income_buffer' AND enabled) THEN
      RAISE EXCEPTION 'Income Buffer is not enabled.' USING ERRCODE='22023'; END IF;
    SELECT * INTO buffer FROM public.categories WHERE account_id=p_budget_id AND is_buffer FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
    IF p_command ? 'expectedBalance' AND (p_command->>'expectedBalance')::numeric IS DISTINCT FROM buffer.current_balance THEN
      RETURN jsonb_build_object('status','conflict','error','Your buffer changed. Review the latest balance before continuing.');
    END IF;
  END IF;
  IF kind='allocate' THEN
    allocations:=p_command->'allocations';
    IF jsonb_typeof(allocations) IS DISTINCT FROM 'array' OR jsonb_array_length(allocations) NOT BETWEEN 1 AND 1000 THEN
      RAISE EXCEPTION 'Choose at least one envelope to fund.' USING ERRCODE='22023'; END IF;
    IF (SELECT count(DISTINCT value->>'categoryId') FROM jsonb_array_elements(allocations))<>jsonb_array_length(allocations) THEN
      RAISE EXCEPTION 'Each envelope can appear only once.' USING ERRCODE='22023'; END IF;
    allocation_month:=(p_command->>'month')::date;
    IF allocation_month IS NULL OR extract(day FROM allocation_month)<>1 THEN
      RAISE EXCEPTION 'Choose a valid funding month.' USING ERRCODE='22023'; END IF;
    FOR entry IN SELECT value FROM jsonb_array_elements(allocations) LOOP
      amount:=(entry->>'amount')::numeric;
      IF amount IS NULL OR amount<=0 OR amount>99999999.99 OR amount<>round(amount,2) THEN
        RAISE EXCEPTION 'Use a positive amount with at most two decimal places.' USING ERRCODE='22023'; END IF;
      total:=total+amount;
      SELECT * INTO c FROM public.categories WHERE id=(entry->>'categoryId')::bigint AND account_id=p_budget_id AND NOT is_system AND NOT coalesce(is_archived,false) FOR UPDATE;
      IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
    END LOOP;
    IF withdrawal<0 OR withdrawal<>round(withdrawal,2) OR withdrawal>total OR withdrawal>coalesce(buffer.current_balance,0) THEN
      RAISE EXCEPTION 'Insufficient buffer money for this allocation.' USING ERRCODE='22023'; END IF;
    IF total>greatest(0,available+withdrawal) THEN
      RAISE EXCEPTION 'Amount exceeds available to save.' USING ERRCODE='22023'; END IF;
    IF withdrawal>0 THEN
      UPDATE public.categories SET current_balance=current_balance-withdrawal,updated_at=now() WHERE id=buffer.id;
      INSERT INTO public.category_balance_audit(category_id,account_id,user_id,old_balance,new_balance,change_amount,change_type,metadata)
      VALUES(buffer.id,p_budget_id,auth.uid(),buffer.current_balance,buffer.current_balance-withdrawal,-withdrawal,'income_buffer_fund',jsonb_build_object('source','allocation_batch','operation_id',p_operation_id));
    END IF;
    FOR entry IN SELECT value FROM jsonb_array_elements(allocations) LOOP
      amount:=(entry->>'amount')::numeric;
      SELECT * INTO c FROM public.categories WHERE id=(entry->>'categoryId')::bigint AND account_id=p_budget_id;
      UPDATE public.categories SET current_balance=current_balance+amount,updated_at=now() WHERE id=c.id RETURNING to_jsonb(categories.*) INTO entry;
      changed:=changed||jsonb_build_array(entry);
      INSERT INTO public.category_balance_audit(category_id,account_id,user_id,old_balance,new_balance,change_amount,change_type,metadata)
      VALUES(c.id,p_budget_id,auth.uid(),c.current_balance,c.current_balance+amount,amount,
        CASE WHEN p_command->>'source'='manual' THEN 'allocation_manual' ELSE 'allocation_batch' END,
        jsonb_build_object('allocation_month',allocation_month,'operation_id',p_operation_id));
      INSERT INTO public.category_monthly_funding(account_id,user_id,category_id,month,funded_amount,target_amount)
      VALUES(p_budget_id,auth.uid(),c.id,allocation_month,amount,c.monthly_amount)
      ON CONFLICT(user_id,category_id,month) DO UPDATE SET funded_amount=public.category_monthly_funding.funded_amount+excluded.funded_amount,target_amount=excluded.target_amount,updated_at=now();
    END LOOP;
    result:=jsonb_build_object('success',true,'allocationsProcessed',jsonb_array_length(allocations),'totalAmount',total,'month',allocation_month,
      'fundingTracked',true,'bufferWithdrawn',withdrawal,'category',changed->0,'allocation',jsonb_build_object('amount',total,'month',allocation_month,'fundingTracked',true));
  ELSE
    amount:=(p_command->>'amount')::numeric;
    IF amount IS NULL OR abs(amount)>99999999.99 OR amount<>round(amount,2) OR (kind<>'set-balance' AND amount<=0) THEN
      RAISE EXCEPTION 'Enter a valid amount with at most two decimal places.' USING ERRCODE='22023'; END IF;
    IF kind IN ('buffer-add','buffer-release') THEN c:=buffer;
    ELSE
      SELECT * INTO c FROM public.categories WHERE id=(p_command->>'categoryId')::bigint AND account_id=p_budget_id AND NOT is_system AND NOT coalesce(is_archived,false) FOR UPDATE;
      IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
    END IF;
    old_balance:=c.current_balance;
    metadata:=jsonb_build_object('operation_id',p_operation_id);
    IF kind='transfer' THEN
      SELECT * INTO other FROM public.categories WHERE id=(p_command->>'toCategoryId')::bigint AND account_id=p_budget_id AND NOT is_system AND NOT coalesce(is_archived,false) FOR UPDATE;
      IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
      IF c.id=other.id OR amount>c.current_balance THEN
        RAISE EXCEPTION 'Choose a different envelope with enough money to move.' USING ERRCODE='22023'; END IF;
      UPDATE public.categories SET current_balance=current_balance+amount,updated_at=now() WHERE id=other.id;
      INSERT INTO public.category_balance_audit(category_id,account_id,user_id,old_balance,new_balance,change_amount,change_type,metadata)
      VALUES(other.id,p_budget_id,auth.uid(),other.current_balance,other.current_balance+amount,amount,'transfer_to',metadata||jsonb_build_object('transfer_category_id',c.id,'transfer_category_name',c.name));
      metadata:=metadata||jsonb_build_object('transfer_category_id',other.id,'transfer_category_name',other.name);
      change_type:='transfer_from'; c.current_balance:=old_balance-amount;
      result:=jsonb_build_object('success',true,'transfer',jsonb_build_object('fromCategoryId',c.id,'toCategoryId',other.id,'amount',amount,'fromNewBalance',c.current_balance,'toNewBalance',other.current_balance+amount));
    ELSIF kind='set-balance' THEN
      IF NOT (expected ? c.id::text) OR expected IS NULL THEN
        RAISE EXCEPTION 'Refresh the envelope before setting its balance.' USING ERRCODE='22023'; END IF;
      IF amount-old_balance>greatest(0,available) THEN RAISE EXCEPTION 'Amount exceeds available to save.' USING ERRCODE='22023'; END IF;
      c.current_balance:=amount; change_type:='manual_edit';
    ELSE
      IF (kind='buffer-add' AND amount>greatest(0,available)) OR (kind='buffer-release' AND amount>old_balance) THEN
        RAISE EXCEPTION 'There is not enough available money for this change.' USING ERRCODE='22023'; END IF;
      c.current_balance:=old_balance+CASE WHEN kind='buffer-add' THEN amount ELSE -amount END;
      change_type:='income_buffer_fund'; metadata:=metadata||jsonb_build_object('direction',CASE WHEN kind='buffer-add' THEN 'add' ELSE 'release' END);
      result:=jsonb_build_object('success',true,'newBalance',c.current_balance,CASE WHEN kind='buffer-add' THEN 'amountAdded' ELSE 'amountWithdrawn' END,amount);
    END IF;
    UPDATE public.categories SET current_balance=c.current_balance,updated_at=now() WHERE id=c.id RETURNING to_jsonb(categories.*) INTO entry;
    IF old_balance<>c.current_balance THEN
      INSERT INTO public.category_balance_audit(category_id,account_id,user_id,old_balance,new_balance,change_amount,change_type,metadata)
      VALUES(c.id,p_budget_id,auth.uid(),old_balance,c.current_balance,c.current_balance-old_balance,change_type,metadata);
    END IF;
    IF kind='set-balance' THEN result:=entry; END IF;
  END IF;
  INSERT INTO public.budget_operations(account_id,operation_id,user_id,command,result) VALUES(p_budget_id,p_operation_id,auth.uid(),p_command,result);
  RETURN jsonb_build_object('status','saved','result',result);
END $$;
REVOKE ALL ON FUNCTION public.run_envelope_command(bigint,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.run_envelope_command(bigint,uuid,jsonb) TO authenticated;

-- Serialize direct balance writers too. Legacy absolute-value edits are still
-- last-write-wins, but cannot interleave inside a protected money command.
CREATE FUNCTION public.serialize_budget_balance_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.budget_accounts WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.account_id ELSE NEW.account_id END FOR UPDATE;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER a_serialize_budget BEFORE INSERT OR UPDATE OR DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.serialize_budget_balance_write();
CREATE TRIGGER a_serialize_budget BEFORE INSERT OR UPDATE OR DELETE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.serialize_budget_balance_write();
CREATE TRIGGER a_serialize_budget BEFORE INSERT OR UPDATE OR DELETE ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION public.serialize_budget_balance_write();
CREATE TRIGGER a_serialize_budget BEFORE INSERT OR UPDATE OR DELETE ON public.pending_checks FOR EACH ROW EXECUTE FUNCTION public.serialize_budget_balance_write();
CREATE OR REPLACE FUNCTION public.save_guarded_account(p_budget_id bigint, p_kind text,
  p_id bigint, p_revision uuid, p_patch jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_row jsonb; new_row jsonb; cash public.accounts; card public.credit_cards;
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
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
    ELSE ARRAY['name','credit_limit','available_credit','include_in_totals','sort_order','statement_balance','statement_balance_as_of'] END
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
    UPDATE public.credit_cards SET name=card.name, credit_limit=card.credit_limit, available_credit=card.available_credit,
      current_balance=card.credit_limit-card.available_credit, include_in_totals=card.include_in_totals,
      sort_order=card.sort_order, statement_balance=card.statement_balance, statement_balance_as_of=card.statement_balance_as_of,
      updated_at=now() WHERE id=p_id AND account_id=p_budget_id RETURNING to_jsonb(credit_cards.*) INTO new_row;
    IF (old_row->>'available_credit')::numeric<>(new_row->>'available_credit')::numeric THEN
      INSERT INTO public.credit_card_balance_audit(credit_card_id,budget_account_id,user_id,old_available_credit,new_available_credit,change_amount,change_type)
      VALUES(p_id,p_budget_id,auth.uid(),(old_row->>'available_credit')::numeric,(new_row->>'available_credit')::numeric,
        (new_row->>'available_credit')::numeric-(old_row->>'available_credit')::numeric,'manual_edit');
    END IF;
  END IF;
  RETURN jsonb_build_object('status','saved','record',new_row,'previous',old_row);
END $$;
COMMIT;
