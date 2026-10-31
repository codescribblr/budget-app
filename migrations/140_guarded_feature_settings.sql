BEGIN;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['user_feature_flags','budget_accounts','account_users','automatic_import_setups','csv_import_templates'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid()',t);
  EXECUTE format('CREATE TRIGGER guarded_revision BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision()',t);
 END LOOP;
END $$;
CREATE FUNCTION public.save_guarded_feature(p_budget_id bigint,p_name text,p_enabled boolean,p_revision uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row public.user_feature_flags; saved public.user_feature_flags; dep text; buffer_id bigint;
BEGIN
 PERFORM public.lock_budget_write(p_budget_id);
 IF p_enabled IS NULL OR p_name <> ALL(ARRAY['tags','non_cash_assets','category_types','priority_system','smart_allocation','income_buffer','goals','loans','advanced_reporting','ai_chat','ai_onboarding','automatic_imports','retirement_planning','recurring_transactions']) THEN RAISE EXCEPTION 'Invalid feature.' USING ERRCODE='22023'; END IF;
 SELECT * INTO old_row FROM public.user_feature_flags WHERE account_id=p_budget_id AND feature_name=p_name FOR UPDATE;
 IF old_row.revision IS DISTINCT FROM p_revision THEN RETURN jsonb_build_object('status','conflict'); END IF;
 IF p_enabled AND p_name <> ALL(ARRAY['tags','non_cash_assets','ai_onboarding']) AND NOT EXISTS(SELECT 1 FROM public.user_subscriptions WHERE account_id=p_budget_id AND tier='premium' AND status IN ('active','trialing')) THEN RAISE EXCEPTION 'Premium subscription required.' USING ERRCODE='42501'; END IF;
 dep:=CASE p_name WHEN 'priority_system' THEN 'category_types' WHEN 'smart_allocation' THEN 'priority_system' WHEN 'income_buffer' THEN 'smart_allocation' WHEN 'advanced_reporting' THEN 'category_types' END;
 IF p_enabled AND dep IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.user_feature_flags WHERE account_id=p_budget_id AND feature_name=dep AND enabled) THEN RAISE EXCEPTION 'Enable the required feature first.' USING ERRCODE='22023'; END IF;
 IF NOT p_enabled AND p_name='category_types' AND EXISTS(SELECT 1 FROM public.categories WHERE account_id=p_budget_id AND category_type<>'monthly_expense') THEN RAISE EXCEPTION 'Change your non-monthly envelopes before disabling category types.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.user_feature_flags(account_id,feature_name,enabled,enabled_at,disabled_at,updated_at)
 VALUES(p_budget_id,p_name,p_enabled,CASE WHEN p_enabled THEN now() END,CASE WHEN NOT p_enabled THEN now() END,now())
 ON CONFLICT(account_id,feature_name) DO UPDATE SET enabled=excluded.enabled,enabled_at=excluded.enabled_at,disabled_at=excluded.disabled_at,updated_at=now() RETURNING * INTO saved;
 IF p_name='income_buffer' THEN
  IF p_enabled THEN
   SELECT id INTO buffer_id FROM public.categories WHERE account_id=p_budget_id AND (is_buffer OR name='Income Buffer') ORDER BY is_buffer DESC,id LIMIT 1 FOR UPDATE;
   IF buffer_id IS NULL THEN
    INSERT INTO public.categories(account_id,user_id,name,monthly_amount,current_balance,sort_order,is_system,is_buffer,category_type,priority)
    VALUES(p_budget_id,auth.uid(),'Income Buffer',0,0,-1,true,true,'target_balance',10);
   ELSE UPDATE public.categories SET is_system=true,is_buffer=true,is_archived=false WHERE id=buffer_id; END IF;
  ELSE UPDATE public.categories SET is_system=false,is_buffer=false,notes='Former Income Buffer category. You can delete this or repurpose it.' WHERE account_id=p_budget_id AND is_buffer; END IF;
 END IF;
 RETURN jsonb_build_object('status','saved','record',to_jsonb(saved));
END $$;
REVOKE ALL ON FUNCTION public.save_guarded_feature(bigint,text,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_guarded_feature(bigint,text,boolean,uuid) TO authenticated;
CREATE TRIGGER template_resource AFTER INSERT OR UPDATE OR DELETE ON public.csv_import_templates FOR EACH ROW EXECUTE FUNCTION public.track_budget_resource('imports','account_id');
CREATE TRIGGER subscription_resource AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.track_budget_resource('settings','account_id');
COMMIT;
