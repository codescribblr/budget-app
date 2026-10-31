-- Additive concurrency protection. Classic requests remain valid.
BEGIN;
ALTER TABLE public.accounts ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.credit_cards ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();

CREATE FUNCTION public.replace_financial_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Every writer gets a new opaque token; clients cannot choose or restore it.
  NEW.revision := gen_random_uuid();
  RETURN NEW;
END $$;
CREATE TRIGGER accounts_revision BEFORE INSERT OR UPDATE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision();
CREATE TRIGGER credit_cards_revision BEFORE INSERT OR UPDATE ON public.credit_cards
FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision();

CREATE FUNCTION public.save_guarded_account(p_budget_id bigint, p_kind text,
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
REVOKE ALL ON FUNCTION public.save_guarded_account(bigint,text,bigint,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_guarded_account(bigint,text,bigint,uuid,jsonb) TO authenticated;
COMMIT;
