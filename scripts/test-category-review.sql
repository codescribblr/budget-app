-- Rollback-only integration checks; run with test-category-review.cjs.
BEGIN;
DO $$
DECLARE owner uuid; budget bigint; other_budget bigint; cat bigint; other_cat bigint; cat2 bigint; setup bigint; merchant bigint; grp bigint; q public.queued_imports; q2 public.queued_imports; result jsonb; decision jsonb; posted bigint; tx public.transactions; rev uuid; before_balance numeric;
BEGIN
 SELECT owner_id INTO owner FROM public.budget_accounts WHERE id=27;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 INSERT INTO public.budget_accounts(name,owner_id) VALUES('Categorization integration rollback',owner) RETURNING id INTO budget;
 INSERT INTO public.budget_accounts(name,owner_id) VALUES('Unrelated integration rollback',owner) RETURNING id INTO other_budget;
 INSERT INTO public.categories(user_id,account_id,name,monthly_amount,current_balance) VALUES(owner,budget,'Food',100,100) RETURNING id INTO cat;
 INSERT INTO public.categories(user_id,account_id,name,monthly_amount,current_balance) VALUES(owner,budget,'Fuel',100,100) RETURNING id INTO cat2;
 INSERT INTO public.categories(user_id,account_id,name,monthly_amount,current_balance) VALUES(owner,other_budget,'Private',100,100) RETURNING id INTO other_cat;
 INSERT INTO public.global_merchants(display_name,status) VALUES('Category integration '||budget,'active') RETURNING id INTO merchant;
 INSERT INTO public.merchant_groups(user_id,account_id,display_name,global_merchant_id) VALUES(owner,budget,'Integration merchant',merchant) RETURNING id INTO grp;
 INSERT INTO public.automatic_import_setups(account_id,user_id,source_type,source_identifier) VALUES(budget,owner,'manual','category-test') RETURNING id INTO setup;
 INSERT INTO public.queued_imports(account_id,import_setup_id,transaction_date,description,merchant,amount,transaction_type,hash,source_batch_id,status,original_data)
 VALUES(budget,setup,current_date,'CATEGORY QA PURCHASE','QA Merchant',30,'expense','qa-'||budget,'qa-category','reviewing','{}') RETURNING * INTO q;
 INSERT INTO public.queued_imports(account_id,import_setup_id,transaction_date,description,merchant,amount,transaction_type,hash,source_batch_id,status,original_data)
 VALUES(budget,setup,current_date,'CATEGORY QA OTHER','QA Merchant',25,'expense','qa-other-'||budget,'qa-category','reviewing','{}') RETURNING * INTO q2;
 decision:=jsonb_build_object('id',q.id,'revision',q.revision,'state','reviewed','merchant',q.merchant,'forceImport',false,'patch',jsonb_build_object('date',current_date::text,'description',q.description,'total_amount',30,'transaction_type','expense','account_id',null,'credit_card_id',null,'is_historical',false,'tag_ids','[]'::jsonb,'splits',jsonb_build_array(jsonb_build_object('category_id',cat,'amount',20),jsonb_build_object('category_id',cat2,'amount',10))));
 result:=public.save_category_review(budget,'qa-category',jsonb_build_array(decision));
 IF result->>'status'<>'saved' OR jsonb_array_length(result->'rows'->0->'category_review'->'patch'->'splits')<>2 THEN RAISE EXCEPTION 'split persistence failed'; END IF;
 result:=public.save_category_review(budget,'qa-category',jsonb_build_array(decision));
 IF result->>'status'<>'conflict' THEN RAISE EXCEPTION 'stale review accepted'; END IF;
 result:=public.store_category_suggestions(budget,'qa-category',jsonb_build_array(jsonb_build_object('id',q.id,'revision',q.revision,'suggestion','{}'::jsonb)),owner);
 IF result->0->>'status'<>'conflict' THEN RAISE EXCEPTION 'late AI overwrote choice'; END IF;
 SELECT * INTO q FROM public.queued_imports WHERE id=q.id;
 BEGIN
  PERFORM public.save_category_review(budget,'qa-category',jsonb_build_array(jsonb_set(jsonb_set(decision,'{revision}',to_jsonb(q.revision)),'{patch,splits}',jsonb_build_array(jsonb_build_object('category_id',other_cat,'amount',30)))));
  RAISE EXCEPTION 'cross-budget category accepted';
 EXCEPTION WHEN invalid_parameter_value THEN null; END;
 result:=public.approve_import_chunk(budget,'qa-category',jsonb_build_array(jsonb_build_object('id','queued-'||q.id,'queuedId',q.id,'expectedRevision',q.revision,'requireCategoryReview',true,'patch',jsonb_build_object('merchant_group_id',grp,'description','malicious client override','splits',jsonb_build_array(jsonb_build_object('category_id',cat,'amount',999))))));
 IF (result->>'imported')::int<>1 THEN RAISE EXCEPTION 'reviewed import failed %',result; END IF;
 SELECT imported_transaction_id INTO posted FROM public.queued_imports WHERE id=q.id;
 SELECT * INTO tx FROM public.transactions WHERE id=posted;
 IF tx.description<>q.description OR tx.total_amount<>30 OR (SELECT count(*) FROM public.transaction_splits WHERE transaction_id=posted)<>2 THEN RAISE EXCEPTION 'untrusted patch replaced review'; END IF;
 IF (SELECT count(*) FROM public.transaction_category_evidence WHERE transaction_id=posted)<>1 THEN RAISE EXCEPTION 'missing evidence'; END IF;
 result:=public.approve_import_chunk(budget,'qa-category',jsonb_build_array(jsonb_build_object('id','queued-'||q.id,'queuedId',q.id,'expectedRevision',q.revision,'requireCategoryReview',true,'patch','{}'::jsonb)));
 IF (result->>'skipped')::int<>1 OR (SELECT count(*) FROM public.transaction_category_evidence WHERE transaction_id=posted)<>1 THEN RAISE EXCEPTION 'replay duplicated evidence'; END IF;
 result:=public.approve_import_chunk(budget,'qa-category',jsonb_build_array(jsonb_build_object('id','queued-'||q2.id,'queuedId',q2.id,'expectedRevision',q2.revision,'requireCategoryReview',true,'patch','{}'::jsonb)));
 IF (result->>'imported')::int<>0 OR jsonb_array_length(result->'failures')<>1 THEN RAISE EXCEPTION 'unreviewed import accepted'; END IF;
 result:=public.category_history(budget,ARRAY[merchant]);
 IF result->merchant::text->0->>'confirmed'<>'true' OR jsonb_array_length(result->merchant::text->0->'splits')<>2 THEN RAISE EXCEPTION 'history lost mixed observation %',result; END IF;
 PERFORM public.save_transaction_command(budget,posted,tx.revision,jsonb_build_object('splits',jsonb_build_array(jsonb_build_object('category_id',cat2,'amount',30))),false,gen_random_uuid());
 IF (SELECT count(*) FROM public.transaction_category_evidence WHERE transaction_id=posted)<>1 OR NOT (SELECT corrected FROM public.transaction_category_evidence WHERE transaction_id=posted) THEN RAISE EXCEPTION 'correction duplicated evidence'; END IF;
 result:=public.category_history(budget,ARRAY[merchant]);
 IF (result->merchant::text->0->'splits'->0->>'categoryId')::bigint<>cat2 THEN RAISE EXCEPTION 'correction not reflected'; END IF;
 UPDATE public.transaction_splits SET category_id=cat WHERE transaction_id=posted;
 result:=public.category_history(budget,ARRAY[merchant]);
 IF result->merchant::text->0->>'confirmed'<>'false' THEN RAISE EXCEPTION 'legacy change falsely confirmed'; END IF;
 DELETE FROM public.transactions WHERE id=posted;
 IF EXISTS(SELECT 1 FROM public.transaction_category_evidence WHERE transaction_id=posted) THEN RAISE EXCEPTION 'deleted transaction evidence survived'; END IF;
 -- Undo restores edited fields, not just the Ready label.
 decision:=jsonb_build_object('id',q2.id,'revision',q2.revision,'state','reviewed','merchant',q2.merchant,'patch',jsonb_build_object('date',current_date::text,'description','EDITED QA','total_amount',25,'transaction_type','expense','tag_ids','[]'::jsonb,'splits',jsonb_build_array(jsonb_build_object('category_id',cat,'amount',25))));
 result:=public.save_category_review(budget,'qa-category',jsonb_build_array(decision));
 SELECT * INTO q2 FROM public.queued_imports WHERE id=q2.id;
 decision:=jsonb_set(jsonb_set(jsonb_set(decision,'{state}','"unreviewed"'),'{revision}',to_jsonb(q2.revision)),'{patch,description}','"CATEGORY QA OTHER"');
 result:=public.save_category_review(budget,'qa-category',jsonb_build_array(decision));
 SELECT * INTO q2 FROM public.queued_imports WHERE id=q2.id;
 IF q2.category_review IS NOT NULL OR q2.description<>'CATEGORY QA OTHER' THEN RAISE EXCEPTION 'undo did not restore fields'; END IF;
 -- Authenticated clients cannot fabricate machine confidence or a reviewed flag.
 INSERT INTO public.account_users(account_id,user_id,role,status) VALUES(budget,owner,'owner','active') ON CONFLICT(account_id,user_id) DO NOTHING;
 PERFORM set_config('role','authenticated',true);
 UPDATE public.queued_imports SET merchant=public.queued_imports.merchant WHERE id=q2.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'permission fixture cannot update its own queue row'; END IF;
 BEGIN
  UPDATE public.queued_imports SET category_suggestion='{"outcome":"auto"}' WHERE id=q2.id;
  RAISE EXCEPTION 'client forged machine confidence';
 EXCEPTION WHEN insufficient_privilege THEN null; END;
 PERFORM set_config('role','none',true);
 -- New manual entries are explicit evidence; replay remains one observation.
 rev:=gen_random_uuid();
 decision:=jsonb_build_object('date',current_date::text,'description','MANUAL QA','total_amount',5,'transaction_type','expense','merchant_group_id',grp,'splits',jsonb_build_array(jsonb_build_object('category_id',cat,'amount',5)));
 result:=public.save_transaction_command(budget,null,null,decision,false,rev);
 posted:=(result->'record'->>'id')::bigint;
 PERFORM public.save_transaction_command(budget,null,null,decision,false,rev);
 IF (SELECT count(*) FROM public.transaction_category_evidence WHERE transaction_id=posted AND source='manual')<>1 THEN RAISE EXCEPTION 'manual evidence missing or duplicated'; END IF;
 SELECT * INTO q2 FROM public.queued_imports WHERE id=q2.id;
 -- Switching to classic may intentionally revise a saved decision. Preserve its existing contract,
 -- but do not treat that legacy import as independently confirmed training evidence.
 decision:=jsonb_set(jsonb_set(decision,'{total_amount}','25'),'{splits}',jsonb_build_array(jsonb_build_object('category_id',cat,'amount',25)));
 result:=public.save_category_review(budget,'qa-category',jsonb_build_array(jsonb_build_object('id',q2.id,'revision',q2.revision,'state','reviewed','merchant',q2.merchant,'patch',decision||jsonb_build_object('tag_ids','[]'::jsonb))));
 IF result->>'status'<>'saved' THEN RAISE EXCEPTION 'classic review fixture not saved %',result; END IF;
 SELECT * INTO q2 FROM public.queued_imports WHERE id=q2.id;
 result:=public.approve_import_chunk(budget,'qa-category',jsonb_build_array(jsonb_build_object('id','queued-'||q2.id,'queuedId',q2.id,'expectedRevision',q2.revision,'patch',jsonb_set(decision,'{splits}',jsonb_build_array(jsonb_build_object('category_id',cat2,'amount',25))))));
 IF (result->>'imported')::int<>1 THEN RAISE EXCEPTION 'classic edited import failed %',result; END IF;
 SELECT imported_transaction_id INTO posted FROM public.queued_imports WHERE id=q2.id;
 IF (SELECT category_id FROM public.transaction_splits WHERE transaction_id=posted)<>cat2 OR EXISTS(SELECT 1 FROM public.transaction_category_evidence WHERE transaction_id=posted) THEN RAISE EXCEPTION 'classic edit ignored or falsely confirmed'; END IF;
 result:=public.save_category_preference(budget,merchant,null,true);
 IF result->>'status'<>'saved' THEN RAISE EXCEPTION 'preference failed'; END IF;
 result:=public.save_category_preference(budget,merchant,null,false);
 IF result->>'status'<>'conflict' THEN RAISE EXCEPTION 'stale preference accepted'; END IF;
 result:=public.begin_category_ai_run(gen_random_uuid(),budget,owner,'qa-category','hash-1',999999);
 IF result->>'status'<>'started' THEN RAISE EXCEPTION 'AI run failed to start %',result; END IF;
 result:=public.begin_category_ai_run(gen_random_uuid(),budget,owner,'qa-category','hash-2',999999);
 IF result->>'status'<>'busy' THEN RAISE EXCEPTION 'simultaneous provider run was allowed'; END IF;
 SELECT id INTO rev FROM public.import_category_runs WHERE account_id=budget LIMIT 1;
 PERFORM public.record_category_ai_result(rev,'{"suggestions":[],"tokensUsed":10,"responseTimeMs":50}'::jsonb);
 PERFORM public.record_category_ai_result(rev,'{"suggestions":[],"tokensUsed":10,"responseTimeMs":50}'::jsonb);
 IF (SELECT count(*) FROM public.ai_usage_tracking WHERE request_metadata->>'runId'=rev::text)<>1 THEN RAISE EXCEPTION 'usage recorded twice'; END IF;
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
 BEGIN
  PERFORM public.save_category_review(budget,'qa-category',jsonb_build_array(decision));
  RAISE EXCEPTION 'unauthorized user allowed';
 EXCEPTION WHEN insufficient_privilege THEN null; END;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 RAISE NOTICE 'PASS saved splits, stale writes, late AI, budget isolation, trusted approval, partial import, idempotent evidence, corrections, legacy edits, deletion, preference revisions';
END $$;
-- Bulk confirmation follows the same durable review/evidence path as individual choices.
DO $$
DECLARE owner uuid; budget bigint; cat bigint; setup bigint; merchant bigint; grp bigint; rows jsonb; decisions jsonb; result jsonb; refs jsonb;
BEGIN
 SELECT owner_id INTO owner FROM public.budget_accounts WHERE id=27;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 INSERT INTO public.budget_accounts(name,owner_id) VALUES('Bulk confirmation rollback',owner) RETURNING id INTO budget;
 INSERT INTO public.categories(user_id,account_id,name,monthly_amount,current_balance) VALUES(owner,budget,'Food',100,100) RETURNING id INTO cat;
 INSERT INTO public.global_merchants(display_name,status) VALUES('Bulk confirmation '||budget,'active') RETURNING id INTO merchant;
 INSERT INTO public.merchant_groups(user_id,account_id,display_name,global_merchant_id) VALUES(owner,budget,'Bulk merchant',merchant) RETURNING id INTO grp;
 INSERT INTO public.automatic_import_setups(account_id,user_id,source_type,source_identifier) VALUES(budget,owner,'manual','bulk-confirm-test') RETURNING id INTO setup;
 INSERT INTO public.queued_imports(account_id,import_setup_id,transaction_date,description,merchant,amount,transaction_type,hash,source_batch_id,status,original_data,category_suggestion)
 SELECT budget,setup,current_date,'BULK QA '||n,'QA Merchant',20,'expense','bulk-'||budget||'-'||n,'qa-bulk-confirm','reviewing','{}',
 jsonb_build_object('outcome','suggest','source',CASE WHEN n=1 THEN 'history' ELSE 'ai' END,'categoryId',cat,'merchantId',merchant,'alwaysAsk',true) FROM generate_series(1,2) n;
 SELECT jsonb_agg(jsonb_build_object('id',q.id,'revision',q.revision,'state','reviewed','merchant',q.merchant,'forceImport',false,'patch',jsonb_build_object('date',current_date::text,'description',q.description,'total_amount',q.amount,'transaction_type','expense','account_id',null,'credit_card_id',null,'is_historical',false,'tag_ids','[]'::jsonb,'splits',jsonb_build_array(jsonb_build_object('category_id',cat,'amount',q.amount))))) INTO decisions FROM public.queued_imports q WHERE q.account_id=budget;
 result:=public.save_category_review(budget,'qa-bulk-confirm',decisions);
 IF result->>'status'<>'saved' OR jsonb_array_length(result->'rows')<>2 THEN RAISE EXCEPTION 'bulk confirmation failed %',result; END IF;
 -- Approval must use the new revisions, without losing suggestion provenance.
 SELECT jsonb_agg(jsonb_build_object('id','queued-'||(q->>'id'),'queuedId',q->'id','expectedRevision',q->'revision','requireCategoryReview',true,'patch',jsonb_build_object('merchant_group_id',grp))) INTO refs FROM jsonb_array_elements(result->'rows') q;
 result:=public.approve_import_chunk(budget,'qa-bulk-confirm',refs);
 IF (result->>'imported')::int<>2 OR jsonb_array_length(result->'failures')<>0 THEN RAISE EXCEPTION 'bulk reviewed import failed %',result; END IF;
 IF (SELECT count(*) FROM public.transaction_category_evidence WHERE account_id=budget AND source='reviewed')<>2 THEN RAISE EXCEPTION 'bulk confirmation did not record individual review evidence'; END IF;
 result:=public.category_history(budget,ARRAY[merchant]);
 IF jsonb_array_length(result->merchant::text)<>2 OR EXISTS(SELECT 1 FROM jsonb_array_elements(result->merchant::text) h WHERE h->>'confirmed'<>'true') THEN RAISE EXCEPTION 'bulk confirmation missing from confirmed history %',result; END IF;
 result:=public.approve_import_chunk(budget,'qa-bulk-confirm',refs);
 IF (result->>'skipped')::int<>2 OR (SELECT current_balance FROM public.categories WHERE id=cat)<>60 THEN RAISE EXCEPTION 'bulk retry changed balances twice %',result; END IF;
 RAISE NOTICE 'PASS bulk history/AI confirmation, fresh revisions, confirmed evidence and retry-safe import';
END $$;
ROLLBACK;
