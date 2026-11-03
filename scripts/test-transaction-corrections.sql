DO $$
DECLARE owner uuid; a bigint; b bigint; t1 jsonb; t2 jsonb; selection jsonb; r jsonb; op uuid:=gen_random_uuid();
  before_a numeric; before_b numeric; before_available numeric; original_splits jsonb; financial_snapshot jsonb; next_rev uuid;
BEGIN
  SELECT owner_id INTO owner FROM public.budget_accounts WHERE id=27;
  IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=owner AND email LIKE '%@example.invalid') THEN RAISE EXCEPTION 'Expected preview budget'; END IF;
  PERFORM set_config('request.jwt.claim.sub',owner::text,true);
  SELECT id INTO a FROM public.categories WHERE account_id=27 AND NOT is_system AND NOT coalesce(is_buffer,false) ORDER BY id LIMIT 1;
  SELECT id INTO b FROM public.categories WHERE account_id=27 AND NOT is_system AND NOT coalesce(is_buffer,false) AND id<>a ORDER BY id LIMIT 1;
  SELECT jsonb_build_object('banks',(SELECT jsonb_agg(jsonb_build_array(id,balance)) FROM public.accounts WHERE account_id=27),'cards',(SELECT jsonb_agg(jsonb_build_array(id,available_credit,current_balance)) FROM public.credit_cards WHERE account_id=27)) INTO financial_snapshot;
  t1:=public.save_transaction_command(27,null,null,jsonb_build_object('date','2026-10-10','description','Rollback bulk one','total_amount',20,'splits',jsonb_build_array(jsonb_build_object('category_id',a,'amount',12),jsonb_build_object('category_id',b,'amount',8))),false,gen_random_uuid())->'record';
  t2:=public.save_transaction_command(27,null,null,jsonb_build_object('date','2026-10-11','description','Rollback bulk two','total_amount',30,'splits',jsonb_build_array(jsonb_build_object('category_id',a,'amount',30))),false,gen_random_uuid())->'record';
  SELECT current_balance INTO before_a FROM public.categories WHERE id=a;
  SELECT current_balance INTO before_b FROM public.categories WHERE id=b;
  SELECT public.budget_available_money(27) INTO before_available;
  SELECT jsonb_agg(s ORDER BY id) INTO original_splits FROM public.transaction_splits s WHERE transaction_id IN ((t1->>'id')::bigint,(t2->>'id')::bigint);
  selection:=jsonb_build_array(jsonb_build_object('id',t1->'id','revision',t1->'revision'),jsonb_build_object('id',t2->'id','revision',t2->'revision'));
  r:=public.correct_transactions(27,op,selection,'{"transaction_type":"income"}');
  IF (r->>'updated')::int<>2 OR (SELECT current_balance FROM public.categories WHERE id=a)<>before_a+84 OR (SELECT current_balance FROM public.categories WHERE id=b)<>before_b+16 THEN RAISE EXCEPTION 'Incorrect split financial effect'; END IF;
  IF public.budget_available_money(27)<>before_available-100 THEN RAISE EXCEPTION 'Incorrect available money effect'; END IF;
  IF original_splits IS DISTINCT FROM (SELECT jsonb_agg(s ORDER BY id) FROM public.transaction_splits s WHERE transaction_id IN ((t1->>'id')::bigint,(t2->>'id')::bigint)) THEN RAISE EXCEPTION 'Splits were replaced'; END IF;
  IF public.correct_transactions(27,op,selection,'{"transaction_type":"income"}')<>r OR public.budget_available_money(27)<>before_available-100 THEN RAISE EXCEPTION 'Replay moved money twice'; END IF;
  IF (public.correct_transactions(27,gen_random_uuid(),selection,'{"is_historical":true}'))->>'status'<>'conflict' THEN RAISE EXCEPTION 'Stale accepted'; END IF;
  IF public.budget_available_money(27)<>before_available-100 THEN RAISE EXCEPTION 'Stale changed money'; END IF;
  SELECT jsonb_agg(jsonb_build_object('id',id,'revision',revision) ORDER BY id) INTO selection FROM public.transactions WHERE id IN ((t1->>'id')::bigint,(t2->>'id')::bigint);
  r:=public.correct_transactions(27,gen_random_uuid(),selection,'{"is_historical":true,"transaction_type":"expense","date":"2026-10-25","account_id":null,"credit_card_id":229}');
  IF public.budget_available_money(27)<>before_available-50 OR (SELECT current_balance FROM public.categories WHERE id=a)<>before_a+42 OR (SELECT current_balance FROM public.categories WHERE id=b)<>before_b+8 THEN RAISE EXCEPTION 'Historical combined effect wrong'; END IF;
  SELECT jsonb_agg(jsonb_build_object('id',id,'revision',revision) ORDER BY id) INTO selection FROM public.transactions WHERE id IN ((t1->>'id')::bigint,(t2->>'id')::bigint);
  BEGIN
    PERFORM public.correct_transactions(27,gen_random_uuid(),selection,'{"account_id":999999999,"credit_card_id":null}');
    RAISE EXCEPTION 'Invalid account accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF EXISTS(SELECT 1 FROM public.transactions WHERE id IN ((t1->>'id')::bigint,(t2->>'id')::bigint) AND credit_card_id<>229) THEN RAISE EXCEPTION 'Failure changed records'; END IF;
  r:=public.correct_transactions(27,gen_random_uuid(),selection||jsonb_build_array(jsonb_build_object('id',999999999,'revision',gen_random_uuid())),'{"is_historical":false}');
  IF r->>'status'<>'conflict' OR jsonb_array_length(r->'latest')<>2 THEN RAISE EXCEPTION 'Missing not handled'; END IF;
  r:=public.correct_transactions(27,gen_random_uuid(),selection,'{"is_historical":false}');
  IF public.budget_available_money(27)<>before_available THEN RAISE EXCEPTION 'Restore expense effect wrong'; END IF;
  IF financial_snapshot IS DISTINCT FROM (SELECT jsonb_build_object('banks',(SELECT jsonb_agg(jsonb_build_array(id,balance)) FROM public.accounts WHERE account_id=27),'cards',(SELECT jsonb_agg(jsonb_build_array(id,available_credit,current_balance)) FROM public.credit_cards WHERE account_id=27))) THEN RAISE EXCEPTION 'Recorded balances changed'; END IF;
  BEGIN
    PERFORM public.correct_transactions(27,gen_random_uuid(),selection,'{"date":"2026-02-30"}');
    RAISE EXCEPTION 'Impossible date accepted';
  EXCEPTION WHEN datetime_field_overflow OR invalid_datetime_format THEN NULL;
  END;
  -- The second record fails after the first save; the entire call must roll back.
  UPDATE public.transactions SET description='' WHERE id=(t2->>'id')::bigint;
  SELECT jsonb_agg(jsonb_build_object('id',id,'revision',revision) ORDER BY id) INTO selection FROM public.transactions WHERE id IN ((t1->>'id')::bigint,(t2->>'id')::bigint);
  BEGIN
    PERFORM public.correct_transactions(27,gen_random_uuid(),selection,'{"date":"2026-11-01"}');
    RAISE EXCEPTION 'Invalid second record accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  IF (SELECT date FROM public.transactions WHERE id=(t1->>'id')::bigint)<>'2026-10-25' THEN RAISE EXCEPTION 'First row saved despite second-row failure'; END IF;
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  BEGIN
    PERFORM public.correct_transactions(27,gen_random_uuid(),selection,'{"is_historical":true}');
    RAISE EXCEPTION 'Unauthorized correction accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS split preservation, precise balances, historical + direction + card/date changes, receipt replay, stale and missing records, invalid account, access controls, unchanged recorded balances';
END $$;
