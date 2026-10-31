-- Small, private invalidations; never publish financial record payloads.
BEGIN;
CREATE TABLE public.budget_sync_config (id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT true);
INSERT INTO public.budget_sync_config DEFAULT VALUES;
ALTER TABLE public.budget_sync_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.budget_sync_config FROM anon, authenticated;
GRANT ALL ON public.budget_sync_config TO service_role;

CREATE POLICY "Receive accessible budget sync" ON realtime.messages FOR SELECT TO authenticated
USING (extension='broadcast' AND EXISTS (
  SELECT 1 FROM public.budget_accounts b WHERE b.deleted_at IS NULL AND
    (realtime.topic()='budget-sync:'||b.id::text
      OR realtime.topic()='budget-sync:'||b.id::text||':user:'||auth.uid()::text)
    AND (b.owner_id=auth.uid() OR EXISTS (SELECT 1 FROM public.account_users u
      WHERE u.account_id=b.id AND u.user_id=auth.uid() AND u.status='active'))
));

CREATE FUNCTION public.emit_budget_sync() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE row_data jsonb; channel_topic text; resource text; batch_key text;
BEGIN
  IF NOT (SELECT enabled FROM public.budget_sync_config WHERE id) THEN RETURN NULL; END IF;
  row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  channel_topic:='budget-sync:'||(row_data->>'account_id');
  resource:=TG_TABLE_NAME;
  IF TG_TABLE_NAME='budget_checkins' THEN channel_topic:=channel_topic||':user:'||(row_data->>'user_id'); END IF;
  -- Multiple rows/statements in one transaction produce one wake-up per family.
  -- The committed event causes a fresh read of the entire resource, not this row.
  batch_key:='budget_sync.r'||md5(channel_topic||resource);
  IF current_setting(batch_key,true)='sent' THEN RETURN NULL; END IF;
  PERFORM set_config(batch_key,'sent',true);
  PERFORM realtime.send(jsonb_build_object('resource',resource),'invalidate',channel_topic,true);
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- Live delivery is optional. A publication outage must not fail a money save.
  RAISE WARNING 'Budget sync publication unavailable: %', SQLSTATE;
  RETURN NULL;
END $$;
CREATE TRIGGER accounts_sync AFTER INSERT OR UPDATE OR DELETE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.emit_budget_sync();
CREATE TRIGGER cards_sync AFTER INSERT OR UPDATE OR DELETE ON public.credit_cards
FOR EACH ROW EXECUTE FUNCTION public.emit_budget_sync();
CREATE TRIGGER checkins_sync AFTER INSERT OR UPDATE OR DELETE ON public.budget_checkins
FOR EACH ROW EXECUTE FUNCTION public.emit_budget_sync();
COMMIT;
