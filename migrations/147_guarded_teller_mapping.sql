BEGIN;
CREATE FUNCTION public.save_teller_mapping(p_budget_id bigint,p_id bigint,p_revision uuid,p_mappings jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE setup public.automatic_import_setups; mapping jsonb; processed jsonb:='[]'; a bigint; c bigint;
BEGIN
 PERFORM public.lock_budget_write(p_budget_id);
 SELECT * INTO setup FROM public.automatic_import_setups WHERE id=p_id AND account_id=p_budget_id FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','missing'); END IF;
 IF setup.revision IS DISTINCT FROM p_revision THEN RETURN jsonb_build_object('status','conflict'); END IF;
 IF setup.source_type<>'teller' OR jsonb_typeof(p_mappings) IS DISTINCT FROM 'array' OR jsonb_array_length(p_mappings)>100 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_mappings) m WHERE m->>'enabled'='true') THEN RAISE EXCEPTION 'Choose accounts to sync.' USING ERRCODE='22023'; END IF;
 FOR mapping IN SELECT value FROM jsonb_array_elements(p_mappings) LOOP
  a:=(mapping->>'target_account_id')::bigint; c:=(mapping->>'target_credit_card_id')::bigint;
  IF coalesce(mapping->>'teller_account_id','')='' THEN RAISE EXCEPTION 'Missing connected account.' USING ERRCODE='22023'; END IF;
  IF a IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounts WHERE id=a AND account_id=p_budget_id) OR c IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.credit_cards WHERE id=c AND account_id=p_budget_id) OR (a IS NOT NULL AND c IS NOT NULL) THEN RAISE EXCEPTION 'Invalid account mapping.' USING ERRCODE='22023'; END IF;
  IF mapping->>'enabled'='true' AND mapping->>'auto_create'='true' THEN
   IF trim(coalesce(mapping->>'account_name',''))='' THEN RAISE EXCEPTION 'Enter an account name.' USING ERRCODE='22023'; END IF;
   a:=null; c:=null;
   IF mapping->>'account_type'='credit_card' THEN
    INSERT INTO public.credit_cards(user_id,account_id,name,credit_limit,available_credit,include_in_totals) VALUES(auth.uid(),p_budget_id,mapping->>'account_name',0,0,true) RETURNING id INTO c;
   ELSE
    INSERT INTO public.accounts(user_id,account_id,name,account_type,balance,include_in_totals) VALUES(auth.uid(),p_budget_id,mapping->>'account_name',coalesce(mapping->>'account_type','checking'),0,true) RETURNING id INTO a;
   END IF;
  END IF;
  IF mapping->>'enabled'='true' AND a IS NULL AND c IS NULL THEN RAISE EXCEPTION 'Choose an account for each enabled connection.' USING ERRCODE='22023'; END IF;
  processed:=processed||jsonb_build_array(mapping||jsonb_build_object('target_account_id',a,'target_credit_card_id',c,'auto_create',false));
 END LOOP;
 UPDATE public.automatic_import_setups SET source_config=coalesce(source_config,'{}')||jsonb_build_object('account_mappings',processed),is_active=true,updated_at=now() WHERE id=p_id RETURNING * INTO setup;
 RETURN jsonb_build_object('status','saved','setup',to_jsonb(setup)-'source_config');
END $$;
REVOKE ALL ON FUNCTION public.save_teller_mapping(bigint,bigint,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_teller_mapping(bigint,bigint,uuid,jsonb) TO authenticated;
COMMIT;
