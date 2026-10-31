BEGIN;
-- One explicit completion signal after a multi-transaction import. Row triggers
-- stay rate bounded; this prevents its final suppressed chunk waiting for polling.
CREATE FUNCTION public.finish_import_refresh(p_budget_id bigint) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE resource text; enabled boolean;
BEGIN
 PERFORM public.lock_budget_write(p_budget_id);
 SELECT c.enabled INTO enabled FROM public.budget_sync_config c WHERE id;
 IF NOT enabled THEN RETURN; END IF;
 FOREACH resource IN ARRAY ARRAY['imports','transactions','envelopes'] LOOP
  BEGIN
   PERFORM realtime.send(jsonb_build_object('resource',resource),'invalidate','budget-sync:'||p_budget_id,true);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Import completion publication unavailable: %',SQLSTATE;
  END;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.finish_import_refresh(bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.finish_import_refresh(bigint) TO authenticated;
COMMIT;
