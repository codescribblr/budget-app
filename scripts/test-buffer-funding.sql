DO $$
DECLARE owner uuid; budget bigint; envelope bigint; buffer bigint; op uuid:=gen_random_uuid(); command jsonb; result jsonb; replay jsonb;
BEGIN
 SELECT owner_id INTO owner FROM public.budget_accounts WHERE id=27;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=owner AND email LIKE '%@example.invalid') THEN RAISE EXCEPTION 'Expected preview owner'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 INSERT INTO public.budget_accounts(owner_id,name) VALUES(owner,'Rollback buffer funding QA') RETURNING id INTO budget;
 INSERT INTO public.accounts(user_id,account_id,name,balance,account_type,include_in_totals) VALUES(owner,budget,'QA cash',600,'checking',true);
 INSERT INTO public.categories(user_id,account_id,name,monthly_amount,current_balance) VALUES(owner,budget,'QA spending',250,0) RETURNING id INTO envelope;
 INSERT INTO public.categories(user_id,account_id,name,monthly_amount,current_balance,is_buffer,is_system) VALUES(owner,budget,'QA buffer',0,500,true,true) RETURNING id INTO buffer;
 INSERT INTO public.user_feature_flags(user_id,account_id,feature_name,enabled) VALUES(owner,budget,'income_buffer',true);
 command:=jsonb_build_object('kind','allocate','allocations',jsonb_build_array(jsonb_build_object('categoryId',envelope,'amount',250)), 'month','2026-11-01','expectedAvailable',100,'expectedBalance',500,'bufferWithdrawAmount',150);
 IF public.run_envelope_command(budget,gen_random_uuid(),command||'{"expectedAvailable":99}'::jsonb)->>'status'<>'conflict' THEN RAISE EXCEPTION 'Stale available accepted'; END IF;
 IF public.run_envelope_command(budget,gen_random_uuid(),command||'{"expectedBalance":499}'::jsonb)->>'status'<>'conflict' THEN RAISE EXCEPTION 'Stale buffer accepted'; END IF;
 IF EXISTS(SELECT 1 FROM public.category_balance_audit WHERE account_id=budget) THEN RAISE EXCEPTION 'Rejected commands wrote audit'; END IF;
 result:=public.run_envelope_command(budget,op,command);
 IF result->>'status'<>'saved' OR (result->'result'->>'bufferWithdrawn')::numeric<>150 OR public.budget_available_money(budget)<>0 THEN RAISE EXCEPTION 'Mixed-source receipt/available incorrect'; END IF;
 IF (SELECT current_balance FROM public.categories WHERE id=envelope)<>250 OR (SELECT current_balance FROM public.categories WHERE id=buffer)<>350 THEN RAISE EXCEPTION 'Mixed-source balances incorrect'; END IF;
 IF (SELECT funded_amount FROM public.category_monthly_funding WHERE category_id=envelope AND month='2026-11-01')<>250 OR (SELECT count(*) FROM public.category_balance_audit WHERE account_id=budget)<>2 THEN RAISE EXCEPTION 'Funding/audit incorrect'; END IF;
 replay:=public.run_envelope_command(budget,op,command);
 IF replay<>result OR (SELECT count(*) FROM public.category_balance_audit WHERE account_id=budget)<>2 THEN RAISE EXCEPTION 'Retry moved money twice'; END IF;
 command:=command||'{"expectedAvailable":0,"expectedBalance":350,"bufferWithdrawAmount":250}'::jsonb;
 result:=public.run_envelope_command(budget,gen_random_uuid(),command);
 IF result->>'status'<>'saved' OR public.budget_available_money(budget)<>0 OR (SELECT current_balance FROM public.categories WHERE id=buffer)<>100 OR (SELECT current_balance FROM public.categories WHERE id=envelope)<>500 THEN RAISE EXCEPTION 'Buffer-only funding incorrect'; END IF;
 command:=command||'{"expectedBalance":100,"bufferWithdrawAmount":100,"allocations":[]}'::jsonb;
 BEGIN
   PERFORM public.run_envelope_command(budget,gen_random_uuid(),command);
   RAISE EXCEPTION 'Expected invalid allocation rejection';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF (SELECT current_balance FROM public.categories WHERE id=buffer)<>100 THEN RAISE EXCEPTION 'Rejected allocation withdrew buffer'; END IF;
 UPDATE public.user_feature_flags SET enabled=false WHERE account_id=budget AND feature_name='income_buffer';
 command:=command||jsonb_build_object('allocations',jsonb_build_array(jsonb_build_object('categoryId',envelope,'amount',100)));
 BEGIN
   PERFORM public.run_envelope_command(budget,gen_random_uuid(),command);
   RAISE EXCEPTION 'Expected disabled feature rejection';
 EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 IF (SELECT sum(balance) FROM public.accounts WHERE account_id=budget)<>600 OR (SELECT count(*) FROM public.category_balance_audit WHERE account_id=budget)<>4 THEN RAISE EXCEPTION 'Bank balances or audit changed unexpectedly'; END IF;
 RAISE NOTICE 'PASS mixed-source and buffer-only allocation, funding/audit, stale source rejection, safe replay, atomic rejection, disabled buffer, unchanged bank balances';
END $$;
