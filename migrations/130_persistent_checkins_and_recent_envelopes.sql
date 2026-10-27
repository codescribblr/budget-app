-- Personal review metadata only; financial records are unaffected.
BEGIN;
CREATE TABLE public.budget_checkins (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id bigint NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
  cadence text NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  period_start date NOT NULL,
  items jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(items) = 'object'),
  completed_at timestamptz,
  PRIMARY KEY (user_id, account_id, cadence, period_start)
);
ALTER TABLE public.budget_checkins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.budget_checkins FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.budget_checkins TO authenticated;
GRANT ALL ON public.budget_checkins TO service_role;
CREATE POLICY "Own check-ins in accessible budgets" ON public.budget_checkins
FOR ALL TO authenticated
USING (user_id = auth.uid() AND (
  EXISTS (SELECT 1 FROM public.account_users au WHERE au.account_id = budget_checkins.account_id AND au.user_id = auth.uid() AND au.status = 'active')
  OR EXISTS (SELECT 1 FROM public.budget_accounts ba WHERE ba.id = budget_checkins.account_id AND ba.owner_id = auth.uid() AND ba.deleted_at IS NULL)
)) WITH CHECK (user_id = auth.uid() AND (
  EXISTS (SELECT 1 FROM public.account_users au WHERE au.account_id = budget_checkins.account_id AND au.user_id = auth.uid() AND au.status = 'active')
  OR EXISTS (SELECT 1 FROM public.budget_accounts ba WHERE ba.id = budget_checkins.account_id AND ba.owner_id = auth.uid() AND ba.deleted_at IS NULL)
));

-- One transaction locks and merges the row. Concurrent tabs cannot overwrite a
-- reviewed step or remove a completion receipt. Repeated writes keep first dates.
CREATE FUNCTION public.save_budget_checkin(p_account_id bigint, p_cadence text,
  p_period_start date, p_items jsonb, p_planning boolean DEFAULT false)
RETURNS public.budget_checkins LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result public.budget_checkins; required text[];
BEGIN
  required := CASE p_cadence WHEN 'daily' THEN ARRAY['accounts','budget']
    WHEN 'weekly' THEN ARRAY['imports','reports','budget']
    ELSE CASE WHEN p_planning THEN ARRAY['reports','plan','goals'] ELSE ARRAY['reports','plan'] END END;
  IF jsonb_typeof(p_items) <> 'object' OR EXISTS (
    SELECT 1 FROM jsonb_each_text(p_items) e WHERE e.key <> ALL(
      CASE p_cadence WHEN 'daily' THEN ARRAY['accounts','budget']
      WHEN 'weekly' THEN ARRAY['imports','reports','budget'] ELSE ARRAY['reports','plan','goals'] END)
  ) THEN RAISE EXCEPTION 'Invalid check-in steps'; END IF;
  INSERT INTO public.budget_checkins AS existing (user_id, account_id, cadence, period_start, items)
    VALUES (auth.uid(), p_account_id, p_cadence, p_period_start, p_items)
    ON CONFLICT (user_id, account_id, cadence, period_start)
    DO UPDATE SET items = EXCLUDED.items || existing.items
    RETURNING * INTO result;
  IF result.completed_at IS NULL AND result.items ?& required THEN
    UPDATE public.budget_checkins SET completed_at = (
      SELECT max(value::timestamptz) FROM jsonb_each_text(result.items) WHERE key = ANY(required)
    ) WHERE user_id = auth.uid() AND account_id = p_account_id AND cadence = p_cadence AND period_start = p_period_start
    RETURNING * INTO result;
  END IF;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_budget_checkin(bigint,text,date,jsonb,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_budget_checkin(bigint,text,date,jsonb,boolean) TO authenticated;

-- Rank by the date of the transaction, not the date a CSV was uploaded. Include
-- each split's category once, and exclude envelopes that cannot be reviewed.
CREATE FUNCTION public.recent_budget_envelopes(p_account_id bigint)
RETURNS TABLE(category_id bigint, transaction_date date)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT recent.category_id, recent.transaction_date FROM (
    SELECT DISTINCT ON (c.id) c.id AS category_id, t.date::date AS transaction_date, t.id AS transaction_id
    FROM public.categories c
    JOIN public.transaction_splits s ON s.category_id = c.id
    JOIN public.transactions t ON t.id = s.transaction_id
    WHERE c.account_id = p_account_id AND t.budget_account_id = p_account_id
      AND NOT coalesce(c.is_system, false) AND NOT coalesce(c.is_buffer, false) AND NOT coalesce(c.is_archived, false)
    ORDER BY c.id, t.date DESC, t.id DESC
  ) recent ORDER BY recent.transaction_date DESC, recent.transaction_id DESC, recent.category_id LIMIT 7;
$$;
REVOKE ALL ON FUNCTION public.recent_budget_envelopes(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recent_budget_envelopes(bigint) TO authenticated;
COMMIT;
