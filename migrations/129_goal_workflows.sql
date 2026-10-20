-- Intent-based setup. Legacy goals keep their existing progress calculation.
BEGIN;

ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS purpose text CHECK (purpose IN ('purchase', 'reserve', 'retirement', 'debt')),
  ADD COLUMN IF NOT EXISTS creation_key uuid,
  ADD COLUMN IF NOT EXISTS funding_category_id bigint REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_non_cash_asset_id bigint REFERENCES public.non_cash_assets(id) ON DELETE RESTRICT;

ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_goal_type_check;
ALTER TABLE public.goals ADD CONSTRAINT goals_goal_type_check
  CHECK (goal_type IN ('envelope', 'account-linked', 'debt-paydown', 'asset-linked'));
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goal_type_constraints;
ALTER TABLE public.goals ADD CONSTRAINT goal_type_constraints CHECK (
  (goal_type = 'envelope' AND linked_category_id IS NOT NULL AND linked_account_id IS NULL
    AND linked_credit_card_id IS NULL AND linked_loan_id IS NULL AND linked_non_cash_asset_id IS NULL)
  OR (goal_type = 'account-linked' AND linked_account_id IS NOT NULL AND linked_category_id IS NULL
    AND linked_credit_card_id IS NULL AND linked_loan_id IS NULL AND linked_non_cash_asset_id IS NULL)
  OR (goal_type = 'debt-paydown' AND num_nonnulls(linked_credit_card_id, linked_loan_id) = 1
    AND linked_category_id IS NULL AND linked_account_id IS NULL AND linked_non_cash_asset_id IS NULL)
  OR (goal_type = 'asset-linked' AND linked_non_cash_asset_id IS NOT NULL AND linked_category_id IS NULL
    AND linked_account_id IS NULL AND linked_credit_card_id IS NULL AND linked_loan_id IS NULL)
);
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goal_purpose_matches_source;
ALTER TABLE public.goals ADD CONSTRAINT goal_purpose_matches_source CHECK (coalesce((
  (purpose IS NULL AND goal_type <> 'asset-linked')
  OR (purpose IN ('purchase', 'reserve') AND goal_type IN ('envelope', 'account-linked'))
  OR (purpose = 'retirement' AND goal_type IN ('envelope', 'asset-linked'))
  OR (purpose = 'debt' AND goal_type = 'debt-paydown')
), false));
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goal_payment_envelope_is_debt;
ALTER TABLE public.goals ADD CONSTRAINT goal_payment_envelope_is_debt CHECK (
  funding_category_id IS NULL OR goal_type = 'debt-paydown'
);
CREATE INDEX IF NOT EXISTS goals_funding_category_idx ON public.goals(funding_category_id);
CREATE INDEX IF NOT EXISTS goals_asset_idx ON public.goals(linked_non_cash_asset_id);
CREATE UNIQUE INDEX IF NOT EXISTS goals_setup_key_idx ON public.goals(account_id, creation_key) WHERE creation_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS goals_payment_envelope_unique ON public.goals(funding_category_id) WHERE funding_category_id IS NOT NULL;

-- Setup changes several related records. Keep them in a single transaction:
-- no orphan envelope, excluded account, or half-created goal on failure.
CREATE OR REPLACE FUNCTION public.create_guided_goal(budget_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  purpose_value text := payload->>'purpose';
  kind text := payload->>'goal_type';
  goal_name text := btrim(payload->>'name');
  target numeric := (payload->>'target_amount')::numeric;
  monthly numeric := (payload->>'monthly_contribution')::numeric;
  category_id bigint := (payload->>'linked_category_id')::bigint;
  payment_id bigint := (payload->>'funding_category_id')::bigint;
  cash_id bigint := (payload->>'linked_account_id')::bigint;
  card_id bigint := (payload->>'linked_credit_card_id')::bigint;
  loan_id bigint := (payload->>'linked_loan_id')::bigint;
  asset_id bigint := (payload->>'linked_non_cash_asset_id')::bigint;
  create_payment boolean := coalesce((payload->>'create_funding_envelope')::boolean, false);
  card_in_totals boolean := false;
  source_row record;
  new_id bigint;
  setup_key uuid := (payload->>'creation_key')::uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.user_has_account_write_access(budget_id) THEN
    RAISE EXCEPTION 'You do not have permission to create goals in this budget';
  END IF;
  -- Serialize guided setup in this household, including duplicate source checks.
  PERFORM pg_catalog.pg_advisory_xact_lock(129, (budget_id % 2147483647)::integer);
  IF setup_key IS NOT NULL THEN
    SELECT id INTO new_id FROM public.goals WHERE account_id = budget_id AND creation_key = setup_key;
    IF FOUND THEN RETURN new_id; END IF;
  END IF;
  IF goal_name IS NULL OR length(goal_name) NOT BETWEEN 1 AND 255
    OR monthly IS NULL OR monthly < 0 OR monthly > 99999999.99 OR monthly <> round(monthly, 2) THEN
    RAISE EXCEPTION 'Enter a name and a valid monthly amount';
  END IF;
  IF purpose_value IS NULL OR NOT (
    (purpose_value IN ('purchase', 'reserve') AND kind IN ('envelope', 'account-linked'))
    OR (purpose_value = 'retirement' AND kind IN ('envelope', 'asset-linked'))
    OR (purpose_value = 'debt' AND kind = 'debt-paydown')
  ) THEN RAISE EXCEPTION 'Choose a tracking method that fits this goal'; END IF;
  IF kind <> 'debt-paydown' AND (target IS NULL OR target <= 0 OR target > 99999999.99 OR target <> round(target, 2)) THEN
    RAISE EXCEPTION 'Enter a positive target amount';
  END IF;
  IF (payload ? 'starting_balance') OR (payload ? 'new_account_name') THEN
    RAISE EXCEPTION 'Guided setup never creates money or a bank account';
  END IF;
  IF kind <> 'debt-paydown' AND (payment_id IS NOT NULL OR create_payment) THEN
    RAISE EXCEPTION 'Payment envelopes are only for debt goals';
  END IF;
  IF create_payment AND payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Choose a new or an existing payment envelope';
  END IF;

  IF kind = 'debt-paydown' THEN
    IF num_nonnulls(card_id, loan_id) <> 1 THEN RAISE EXCEPTION 'Choose one card or loan'; END IF;
    IF card_id IS NOT NULL THEN
      SELECT * INTO source_row FROM public.credit_cards WHERE id = card_id AND account_id = budget_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Card is not in this budget'; END IF;
      target := greatest(0, source_row.credit_limit - source_row.available_credit);
      card_in_totals := source_row.include_in_totals;
    ELSE
      SELECT * INTO source_row FROM public.loans WHERE id = loan_id AND account_id = budget_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Loan is not in this budget'; END IF;
      target := source_row.balance;
    END IF;
    IF target <= 0 THEN RAISE EXCEPTION 'This debt is already paid off'; END IF;
    IF EXISTS (SELECT 1 FROM public.goals WHERE account_id = budget_id
      AND status <> 'completed' AND (linked_credit_card_id = card_id OR linked_loan_id = loan_id)) THEN
      RAISE EXCEPTION 'This debt already has an unfinished goal';
    END IF;
    IF create_payment AND card_in_totals THEN
      RAISE EXCEPTION 'This card already reserves its full balance in budget totals. An additional payment envelope would reserve it twice';
    END IF;
  ELSIF kind = 'account-linked' THEN
    SELECT * INTO source_row FROM public.accounts WHERE id = cash_id AND account_id = budget_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Account is not in this budget'; END IF;
    IF source_row.linked_goal_id IS NOT NULL OR EXISTS (
      SELECT 1 FROM public.goals WHERE account_id = budget_id AND linked_account_id = cash_id
    ) THEN RAISE EXCEPTION 'This account already has a goal'; END IF;
  ELSIF kind = 'asset-linked' THEN
    SELECT * INTO source_row FROM public.non_cash_assets WHERE id = asset_id AND account_id = budget_id FOR UPDATE;
    IF NOT FOUND OR source_row.asset_type <> 'investment' THEN
      RAISE EXCEPTION 'Choose an investment asset in this budget';
    END IF;
    IF EXISTS (SELECT 1 FROM public.goals WHERE account_id = budget_id
      AND linked_non_cash_asset_id = asset_id AND status <> 'completed') THEN
      RAISE EXCEPTION 'This investment already has an unfinished goal';
    END IF;
  END IF;

  IF kind = 'envelope' AND category_id IS NOT NULL OR payment_id IS NOT NULL THEN
    SELECT * INTO source_row FROM public.categories
      WHERE id = coalesce(category_id, payment_id) AND account_id = budget_id FOR UPDATE;
    IF NOT FOUND OR source_row.is_system OR coalesce(source_row.is_buffer, false)
      OR coalesce(source_row.is_archived, false) OR coalesce(source_row.is_goal, false) THEN
      RAISE EXCEPTION 'Choose an active ordinary envelope';
    END IF;
    IF EXISTS (SELECT 1 FROM public.goals WHERE account_id = budget_id
      AND (linked_category_id = source_row.id OR funding_category_id = source_row.id)) THEN
      RAISE EXCEPTION 'This envelope is already used by a goal';
    END IF;
  END IF;

  IF kind = 'envelope' THEN
    IF category_id IS NULL THEN
      INSERT INTO public.categories(user_id, account_id, name, monthly_amount, current_balance, is_goal, sort_order)
        VALUES(auth.uid(), budget_id, goal_name, monthly, 0, true, 0) RETURNING id INTO category_id;
    ELSE
      -- Reuse its balance and history. The reviewed monthly plan replaces its target.
      UPDATE public.categories SET is_goal = true, monthly_amount = monthly, monthly_target = monthly,
        category_type = 'monthly_expense', annual_target = NULL, target_balance = NULL
        WHERE id = category_id AND account_id = budget_id;
    END IF;
  END IF;
  IF create_payment THEN
    INSERT INTO public.categories(user_id, account_id, name, monthly_amount, current_balance, is_goal, sort_order)
      VALUES(auth.uid(), budget_id, goal_name || ' payments', monthly, 0, false, 0) RETURNING id INTO payment_id;
  END IF;
  INSERT INTO public.goals(user_id, account_id, name, target_amount, target_date,
    goal_type, purpose, monthly_contribution, linked_category_id, funding_category_id,
    linked_account_id, linked_credit_card_id, linked_loan_id, linked_non_cash_asset_id, notes, creation_key)
    VALUES(auth.uid(), budget_id, goal_name, target, nullif(payload->>'target_date', '')::date,
      kind, purpose_value, monthly, category_id, payment_id, cash_id, card_id, loan_id, asset_id,
      nullif(btrim(payload->>'notes'), ''), setup_key)
    RETURNING id INTO new_id;
  IF kind = 'account-linked' THEN
    UPDATE public.accounts SET include_in_totals = false, linked_goal_id = new_id
      WHERE id = cash_id AND account_id = budget_id;
  END IF;
  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_guided_goal(bigint, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_guided_goal(bigint, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
