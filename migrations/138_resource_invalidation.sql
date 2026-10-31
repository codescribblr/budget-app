BEGIN;
CREATE TABLE public.budget_resource_versions (
  account_id bigint NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
  resource text NOT NULL CHECK(resource IN ('balances','envelopes','transactions','imports','planning','settings')),
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at timestamptz,
  PRIMARY KEY(account_id,resource)
);
ALTER TABLE public.budget_resource_versions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.budget_resource_versions TO authenticated;
GRANT ALL ON public.budget_resource_versions TO service_role;
CREATE POLICY "Read accessible resource versions" ON public.budget_resource_versions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.budget_accounts b WHERE b.id=account_id AND b.deleted_at IS NULL AND
    (b.owner_id=auth.uid() OR EXISTS (SELECT 1 FROM public.account_users u WHERE u.account_id=b.id AND u.user_id=auth.uid() AND u.status='active')))
);
CREATE FUNCTION public.mark_budget_resource(p_budget_id bigint,p_resource text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE batch_key text; published timestamptz; enabled boolean;
BEGIN
  IF p_budget_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.budget_accounts WHERE id=p_budget_id) THEN RETURN; END IF;
  batch_key:='budget_resources.r'||md5(p_budget_id::text||p_resource);
  IF current_setting(batch_key,true)='marked' THEN RETURN; END IF;
  PERFORM set_config(batch_key,'marked',true);
  INSERT INTO public.budget_resource_versions(account_id,resource) VALUES(p_budget_id,p_resource)
  ON CONFLICT(account_id,resource) DO UPDATE SET revision=gen_random_uuid(),changed_at=clock_timestamp()
  RETURNING published_at INTO published;
  SELECT c.enabled INTO enabled FROM public.budget_sync_config c WHERE id;
  -- Bounded source publication across separate transactions as well as within
  -- a chunk. Suppressed trailing changes remain visible through durable tokens.
  IF enabled AND (published IS NULL OR published<clock_timestamp()-interval '1 second') THEN
    BEGIN
      PERFORM realtime.send(jsonb_build_object('resource',p_resource),'invalidate','budget-sync:'||p_budget_id,true);
      UPDATE public.budget_resource_versions SET published_at=clock_timestamp() WHERE account_id=p_budget_id AND resource=p_resource;
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Budget publication unavailable: %',SQLSTATE;
    END;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.mark_budget_resource(bigint,text) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.track_budget_resource() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data jsonb; budget_id bigint;
BEGIN
  row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  budget_id:=(row_data->>TG_ARGV[1])::bigint;
  PERFORM public.mark_budget_resource(budget_id,TG_ARGV[0]);
  RETURN null;
END $$;
DROP TRIGGER accounts_sync ON public.accounts;
DROP TRIGGER cards_sync ON public.credit_cards;
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('accounts','balances','account_id'),('credit_cards','balances','account_id'),('pending_checks','balances','account_id'),
    ('categories','envelopes','account_id'),('category_monthly_funding','envelopes','account_id'),('category_balance_audit','envelopes','account_id'),
    ('transactions','transactions','budget_account_id'),('queued_imports','imports','account_id'),('automatic_import_setups','imports','account_id'),
    ('loans','planning','account_id'),('non_cash_assets','planning','account_id'),('goals','planning','account_id'),('income_streams','planning','account_id'),
    ('settings','settings','account_id'),('user_feature_flags','settings','account_id'),('account_users','settings','account_id'),('budget_accounts','settings','id'),
    ('tags','transactions','account_id'),('merchant_groups','transactions','account_id'),('merchant_mappings','transactions','account_id')
  ) AS items(table_name,resource,scope_column) LOOP
    EXECUTE format('CREATE TRIGGER resource_version AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.track_budget_resource(%L,%L)',item.table_name,item.resource,item.scope_column);
  END LOOP;
END $$;
-- Editing a goal envelope target elsewhere must invalidate an open goal draft.
CREATE FUNCTION public.invalidate_linked_goal_plan() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.monthly_amount IS DISTINCT FROM OLD.monthly_amount THEN UPDATE public.goals SET updated_at=now() WHERE account_id=NEW.account_id AND linked_category_id=NEW.id; END IF;
  RETURN null;
END $$;
CREATE TRIGGER linked_goal_plan_revision AFTER UPDATE OF monthly_amount ON public.categories FOR EACH ROW EXECUTE FUNCTION public.invalidate_linked_goal_plan();
COMMIT;
