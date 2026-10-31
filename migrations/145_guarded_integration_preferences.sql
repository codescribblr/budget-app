BEGIN;
ALTER TABLE public.integration_settings ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();
CREATE TRIGGER integration_revision BEFORE INSERT OR UPDATE ON public.integration_settings FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision();
CREATE TRIGGER integration_resource AFTER INSERT OR UPDATE OR DELETE ON public.integration_settings FOR EACH ROW EXECUTE FUNCTION public.track_budget_resource('settings','account_id');
CREATE TRIGGER backup_resource AFTER INSERT OR UPDATE OR DELETE ON public.user_backups FOR EACH ROW EXECUTE FUNCTION public.track_budget_resource('settings','account_id');
CREATE TRIGGER invitation_resource AFTER INSERT OR UPDATE OR DELETE ON public.account_invitations FOR EACH ROW EXECUTE FUNCTION public.track_budget_resource('settings','account_id');
CREATE TRIGGER key_resource AFTER INSERT OR UPDATE OF name,permissions,expires_at,revoked_at OR DELETE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.track_budget_resource('settings','budget_account_id');
CREATE TRIGGER tag_rule_resource AFTER INSERT OR UPDATE OR DELETE ON public.tag_rules FOR EACH ROW EXECUTE FUNCTION public.track_budget_resource('transactions','account_id');
CREATE FUNCTION public.save_guarded_integration(p_budget_id bigint,p_revision uuid,p_patch jsonb,p_delete boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row public.integration_settings; saved public.integration_settings;
BEGIN
 PERFORM public.lock_budget_write(p_budget_id);
 IF NOT EXISTS(SELECT 1 FROM public.budget_accounts WHERE id=p_budget_id AND owner_id=auth.uid() AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Only the budget owner can manage integrations.' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k<>ALL(ARRAY['config','is_enabled','encrypted_api_key','api_key_hint'])) THEN RAISE EXCEPTION 'Invalid integration settings.' USING ERRCODE='22023'; END IF;
 SELECT * INTO old_row FROM public.integration_settings WHERE account_id=p_budget_id AND integration_type='rentcast' FOR UPDATE;
 IF old_row.revision IS DISTINCT FROM p_revision THEN RETURN jsonb_build_object('status','conflict'); END IF;
 IF p_delete THEN
  DELETE FROM public.integration_settings WHERE account_id=p_budget_id AND integration_type='rentcast';
  UPDATE public.non_cash_assets SET rentcast_enabled=false WHERE account_id=p_budget_id AND rentcast_enabled;
  RETURN jsonb_build_object('status','saved');
 END IF;
 saved:=jsonb_populate_record(old_row,p_patch);
 IF coalesce(saved.is_enabled,false) AND saved.encrypted_api_key IS NULL THEN RAISE EXCEPTION 'Enter an API key before enabling this integration.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.integration_settings(account_id,integration_type,config,is_enabled,encrypted_api_key,api_key_hint)
 VALUES(p_budget_id,'rentcast',coalesce(saved.config,'{}'),coalesce(saved.is_enabled,false),saved.encrypted_api_key,saved.api_key_hint)
 ON CONFLICT(account_id,integration_type) DO UPDATE SET config=excluded.config,is_enabled=excluded.is_enabled,encrypted_api_key=excluded.encrypted_api_key,api_key_hint=excluded.api_key_hint,updated_at=now() RETURNING * INTO saved;
 RETURN jsonb_build_object('status','saved','record',(to_jsonb(saved)-'encrypted_api_key')||jsonb_build_object('has_api_key',saved.encrypted_api_key IS NOT NULL));
END $$;
REVOKE ALL ON FUNCTION public.save_guarded_integration(bigint,uuid,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_guarded_integration(bigint,uuid,jsonb,boolean) TO authenticated;
COMMIT;
