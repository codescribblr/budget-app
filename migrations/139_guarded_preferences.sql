BEGIN;
ALTER TABLE public.user_profiles ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.forecast_settings ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.user_notification_preferences ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();
CREATE TRIGGER profiles_revision BEFORE INSERT OR UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision();
CREATE TRIGGER forecast_revision BEFORE INSERT OR UPDATE ON public.forecast_settings FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision();
CREATE TRIGGER preferences_revision BEFORE INSERT OR UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.replace_financial_revision();
CREATE FUNCTION public.save_personal_preferences(p_kind text,p_revision uuid,p_patch jsonb,p_type_id text DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_row jsonb; saved jsonb; allowed text[];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in again.' USING ERRCODE='42501'; END IF;
  -- Serialize creation too, when there is no row to lock yet.
  PERFORM pg_advisory_xact_lock(hashtextextended('personal-settings:'||auth.uid()::text,0));
  allowed:=CASE p_kind WHEN 'profile' THEN ARRAY['birth_year'] WHEN 'forecast' THEN ARRAY['settings'] WHEN 'notification' THEN ARRAY['emailEnabled','inAppEnabled','settings'] END;
  IF allowed IS NULL OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object' OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k<>ALL(allowed)) THEN RAISE EXCEPTION 'Invalid preferences.' USING ERRCODE='22023'; END IF;
  CASE p_kind
    WHEN 'profile' THEN SELECT to_jsonb(p) INTO old_row FROM public.user_profiles p WHERE user_id=auth.uid() FOR UPDATE;
    WHEN 'forecast' THEN SELECT to_jsonb(p) INTO old_row FROM public.forecast_settings p WHERE user_id=auth.uid() FOR UPDATE;
    WHEN 'notification' THEN SELECT to_jsonb(p) INTO old_row FROM public.user_notification_preferences p WHERE user_id=auth.uid() AND notification_type_id=p_type_id FOR UPDATE;
  END CASE;
  IF (old_row->>'revision')::uuid IS DISTINCT FROM p_revision THEN
    RETURN jsonb_build_object('status','conflict','latest',old_row-'is_admin'); END IF;
  CASE p_kind
    WHEN 'profile' THEN
      IF p_patch->>'birth_year' IS NOT NULL AND (p_patch->>'birth_year')::integer NOT BETWEEN 1900 AND extract(year FROM current_date) THEN RAISE EXCEPTION 'Enter a valid birth year.' USING ERRCODE='22023'; END IF;
      INSERT INTO public.user_profiles(user_id,birth_year) VALUES(auth.uid(),(p_patch->>'birth_year')::integer)
      ON CONFLICT(user_id) DO UPDATE SET birth_year=excluded.birth_year,updated_at=now() RETURNING jsonb_build_object('birth_year',birth_year,'revision',revision) INTO saved;
    WHEN 'forecast' THEN
      INSERT INTO public.forecast_settings(user_id,settings) VALUES(auth.uid(),coalesce(old_row->'settings','{}')||p_patch->'settings')
      ON CONFLICT(user_id) DO UPDATE SET settings=excluded.settings,updated_at=now() RETURNING to_jsonb(forecast_settings.*) INTO saved;
    WHEN 'notification' THEN
      IF p_type_id IS NULL THEN RAISE EXCEPTION 'Select a notification type.' USING ERRCODE='22023'; END IF;
      INSERT INTO public.user_notification_preferences(user_id,notification_type_id,email_enabled,in_app_enabled,settings)
      VALUES(auth.uid(),p_type_id,coalesce((p_patch->>'emailEnabled')::boolean,(old_row->>'email_enabled')::boolean,true),coalesce((p_patch->>'inAppEnabled')::boolean,(old_row->>'in_app_enabled')::boolean,true),coalesce(p_patch->'settings',old_row->'settings','{}'))
      ON CONFLICT(user_id,notification_type_id) DO UPDATE SET email_enabled=excluded.email_enabled,in_app_enabled=excluded.in_app_enabled,settings=excluded.settings,updated_at=now() RETURNING to_jsonb(user_notification_preferences.*) INTO saved;
  END CASE;
  RETURN jsonb_build_object('status','saved','record',saved);
END $$;
REVOKE ALL ON FUNCTION public.save_personal_preferences(text,uuid,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_personal_preferences(text,uuid,jsonb,text) TO authenticated;

CREATE FUNCTION public.save_guarded_budget_settings(p_budget_id bigint,p_revision uuid,p_values jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE current_revision uuid; item jsonb;
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  SELECT revision INTO current_revision FROM public.budget_resource_versions WHERE account_id=p_budget_id AND resource='settings';
  IF current_revision IS DISTINCT FROM p_revision THEN RETURN jsonb_build_object('status','conflict'); END IF;
  IF jsonb_typeof(p_values) IS DISTINCT FROM 'array' OR jsonb_array_length(p_values)>100 THEN RAISE EXCEPTION 'Invalid settings.' USING ERRCODE='22023'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_values) LOOP
    IF length(item->>'key') NOT BETWEEN 1 AND 200 OR jsonb_typeof(item->'value') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Invalid setting.' USING ERRCODE='22023'; END IF;
    UPDATE public.settings SET value=item->>'value',updated_at=now() WHERE account_id=p_budget_id AND key=item->>'key';
    IF NOT FOUND THEN INSERT INTO public.settings(account_id,user_id,key,value) VALUES(p_budget_id,auth.uid(),item->>'key',item->>'value'); END IF;
  END LOOP;
  SELECT revision INTO current_revision FROM public.budget_resource_versions WHERE account_id=p_budget_id AND resource='settings';
  RETURN jsonb_build_object('status','saved','success',true,'revision',current_revision);
END $$;
REVOKE ALL ON FUNCTION public.save_guarded_budget_settings(bigint,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_guarded_budget_settings(bigint,uuid,jsonb) TO authenticated;

-- Personal changes publish payload-free invalidations to accessible budgets,
-- and mark durable settings tokens so focus/periodic refresh also works with live delivery disabled.
CREATE FUNCTION public.track_personal_preferences() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE member record; row_data jsonb;
BEGIN
  row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  FOR member IN SELECT id FROM public.budget_accounts b WHERE deleted_at IS NULL AND (owner_id=(row_data->>'user_id')::uuid OR EXISTS (SELECT 1 FROM public.account_users u WHERE u.account_id=b.id AND u.user_id=(row_data->>'user_id')::uuid AND u.status='active')) LOOP
    -- No profile fields are broadcast. Shared marker carries only an invalidation.
    PERFORM public.mark_budget_resource(member.id,'settings');
  END LOOP;
  RETURN null;
END $$;
CREATE TRIGGER profile_resource AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.track_personal_preferences();
CREATE TRIGGER forecast_resource AFTER INSERT OR UPDATE OR DELETE ON public.forecast_settings FOR EACH ROW EXECUTE FUNCTION public.track_personal_preferences();
CREATE TRIGGER notification_resource AFTER INSERT OR UPDATE OR DELETE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.track_personal_preferences();
COMMIT;
