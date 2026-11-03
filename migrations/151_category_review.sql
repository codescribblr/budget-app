BEGIN;
ALTER TABLE public.queued_imports ADD COLUMN category_review jsonb, ADD COLUMN category_suggestion jsonb;
CREATE TABLE public.category_review_preferences (
 account_id bigint NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
 merchant_id bigint NOT NULL REFERENCES public.global_merchants(id) ON DELETE CASCADE,
 always_ask boolean NOT NULL DEFAULT false, revision uuid NOT NULL DEFAULT gen_random_uuid(),
 updated_by uuid REFERENCES auth.users(id), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,merchant_id)
);
CREATE TABLE public.category_automation_config (
 account_id bigint PRIMARY KEY REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
 history_enabled boolean NOT NULL DEFAULT false,
 ai_enabled boolean NOT NULL DEFAULT false,
 ai_model text, ai_prompt_version text, ai_threshold numeric NOT NULL DEFAULT 1 CHECK(ai_threshold BETWEEN 0 AND 1),
 validation_notes text NOT NULL DEFAULT ''
);
CREATE TABLE public.transaction_category_evidence (
 transaction_id bigint PRIMARY KEY REFERENCES public.transactions(id) ON DELETE CASCADE,
 account_id bigint NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
 signature text NOT NULL, source text NOT NULL CHECK(source IN ('reviewed','manual','auto')),
 session_id text NOT NULL, actor uuid REFERENCES auth.users(id), confirmed_at timestamptz NOT NULL DEFAULT now(),
 corrected boolean NOT NULL DEFAULT false, prediction jsonb
);
CREATE INDEX category_evidence_budget ON public.transaction_category_evidence(account_id);
CREATE TABLE public.import_category_runs (
 id uuid PRIMARY KEY, account_id bigint NOT NULL REFERENCES public.budget_accounts(id) ON DELETE CASCADE,
 batch_id text NOT NULL, kind text NOT NULL CHECK(kind IN ('history','ai')), request_hash text NOT NULL,
 state text NOT NULL DEFAULT 'running' CHECK(state IN ('running','complete','failed')),
 response jsonb, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX category_runs_scope ON public.import_category_runs(account_id,batch_id,created_at DESC);
ALTER TABLE public.category_review_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_automation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_category_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_category_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.category_review_preferences,public.category_automation_config,public.transaction_category_evidence,public.import_category_runs FROM anon,authenticated;
GRANT SELECT ON public.category_review_preferences,public.transaction_category_evidence TO authenticated;
GRANT ALL ON public.category_review_preferences,public.category_automation_config,public.transaction_category_evidence,public.import_category_runs TO service_role;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['category_review_preferences','transaction_category_evidence'] LOOP
 EXECUTE format('CREATE POLICY budget_read ON public.%I FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.budget_accounts b WHERE b.id=account_id AND b.deleted_at IS NULL AND (b.owner_id=auth.uid() OR EXISTS(SELECT 1 FROM public.account_users u WHERE u.account_id=b.id AND u.user_id=auth.uid() AND u.status=''active''))))',t);
 END LOOP;
END $$;

-- Clients can request a human decision; they cannot write machine confidence or provenance directly.
CREATE FUNCTION public.guard_category_metadata() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user NOT IN ('postgres','service_role','supabase_admin') AND
  (NEW.category_review IS DISTINCT FROM CASE WHEN TG_OP='INSERT' THEN null ELSE OLD.category_review END OR NEW.category_suggestion IS DISTINCT FROM CASE WHEN TG_OP='INSERT' THEN null ELSE OLD.category_suggestion END) THEN
  RAISE EXCEPTION 'Use the revision-checked review command.' USING ERRCODE='42501';
 END IF;
 IF TG_OP='UPDATE' AND (NEW.transaction_date,NEW.description,NEW.merchant,NEW.amount,NEW.transaction_type,NEW.target_account_id,NEW.target_credit_card_id) IS DISTINCT FROM
  (OLD.transaction_date,OLD.description,OLD.merchant,OLD.amount,OLD.transaction_type,OLD.target_account_id,OLD.target_credit_card_id) THEN
  NEW.category_suggestion:=null;
  IF NEW.category_review IS NOT DISTINCT FROM OLD.category_review THEN NEW.category_review:=null; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER category_metadata_guard BEFORE INSERT OR UPDATE ON public.queued_imports FOR EACH ROW EXECUTE FUNCTION public.guard_category_metadata();

CREATE FUNCTION public.transaction_category_signature(p_id bigint) RETURNS text LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT md5(jsonb_build_array(t.description,t.date,t.total_amount,t.transaction_type,t.merchant_group_id,t.merchant_override_id,
   (SELECT coalesce(jsonb_agg(jsonb_build_array(category_id,amount) ORDER BY category_id,amount),'[]') FROM public.transaction_splits WHERE transaction_id=t.id))::text)
 FROM public.transactions t WHERE t.id=p_id
$$;
REVOKE ALL ON FUNCTION public.transaction_category_signature(bigint) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.save_category_review(p_budget_id bigint,p_batch_id text,p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb; q public.queued_imports; p jsonb; s jsonb; total numeric; decisions jsonb:='[]'; review jsonb;
BEGIN
 PERFORM public.lock_budget_write(p_budget_id);
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 100 OR
 (SELECT count(DISTINCT value->>'id') FROM jsonb_array_elements(p_rows))<>jsonb_array_length(p_rows) THEN RAISE EXCEPTION 'Choose up to 100 distinct transactions.' USING ERRCODE='22023'; END IF;
 FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  SELECT * INTO q FROM public.queued_imports WHERE id=(r->>'id')::bigint AND account_id=p_budget_id AND source_batch_id=p_batch_id FOR UPDATE;
  IF NOT FOUND OR q.status IN ('imported','rejected') OR q.revision IS DISTINCT FROM (r->>'revision')::uuid THEN RETURN jsonb_build_object('status','conflict'); END IF;
 END LOOP;
 FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  SELECT * INTO q FROM public.queued_imports WHERE id=(r->>'id')::bigint;
  IF r->>'state'='unreviewed' AND NOT (r ? 'patch') THEN
   UPDATE public.queued_imports SET category_review=null WHERE id=q.id RETURNING * INTO q;
  ELSE
   IF r->>'state' NOT IN ('reviewed','skipped','unreviewed') OR r->>'state' IS NULL THEN RAISE EXCEPTION 'Invalid review decision.' USING ERRCODE='22023'; END IF;
   p:=r->'patch';
   IF jsonb_typeof(p) IS DISTINCT FROM 'object' OR coalesce(length(btrim(p->>'description')),0) NOT BETWEEN 1 AND 10000 OR coalesce(length(btrim(r->>'merchant')),0) NOT BETWEEN 1 AND 500 OR
    (p->>'date') IS NULL OR (p->>'date')::date::text<>(p->>'date') OR coalesce(p->>'transaction_type','') NOT IN ('income','expense') OR
    (p->>'total_amount') IS NULL OR (p->>'total_amount')::numeric<=0 OR (p->>'total_amount')::numeric>99999999.99 OR (p->>'total_amount')::numeric<>round((p->>'total_amount')::numeric,2) THEN RAISE EXCEPTION 'Check the date, merchant, description and amount.' USING ERRCODE='22023'; END IF;
   IF (p->>'account_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.accounts WHERE id=(p->>'account_id')::bigint AND account_id=p_budget_id)) OR
    (p->>'credit_card_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.credit_cards WHERE id=(p->>'credit_card_id')::bigint AND account_id=p_budget_id)) OR
    (p->>'account_id' IS NOT NULL AND p->>'credit_card_id' IS NOT NULL) THEN RAISE EXCEPTION 'Choose an account in this budget.' USING ERRCODE='22023'; END IF;
   IF jsonb_typeof(p->'splits') IS DISTINCT FROM 'array' OR jsonb_array_length(p->'splits')>100 OR jsonb_typeof(p->'tag_ids') IS DISTINCT FROM 'array' OR
    EXISTS(SELECT 1 FROM jsonb_array_elements_text(p->'tag_ids') x WHERE NOT EXISTS(SELECT 1 FROM public.tags WHERE id=x::bigint AND account_id=p_budget_id)) THEN RAISE EXCEPTION 'Invalid splits or tags.' USING ERRCODE='22023'; END IF;
   total:=0;
   FOR s IN SELECT value FROM jsonb_array_elements(p->'splits') LOOP
    IF NOT EXISTS(SELECT 1 FROM public.categories WHERE id=(s->>'category_id')::bigint AND account_id=p_budget_id AND NOT coalesce(is_buffer,false)) OR
      (s->>'amount') IS NULL OR (s->>'amount')::numeric<=0 OR (s->>'amount')::numeric<>round((s->>'amount')::numeric,2) THEN RAISE EXCEPTION 'Choose an envelope and positive amount for each split.' USING ERRCODE='22023'; END IF;
    total:=total+(s->>'amount')::numeric;
   END LOOP;
   IF r->>'state'='reviewed' AND total<>(p->>'total_amount')::numeric THEN RAISE EXCEPTION 'Splits must add up to the transaction total.' USING ERRCODE='22023'; END IF;
   review:=jsonb_build_object('state',r->>'state','patch',p,'merchant',r->>'merchant','forceImport',coalesce((r->>'forceImport')::boolean,false),'actor',auth.uid(),'savedAt',now(),'suggestion',q.category_suggestion);
   IF r->>'state'='unreviewed' THEN review:=null; END IF;
   UPDATE public.queued_imports SET category_review=review,transaction_date=(p->>'date')::date,description=p->>'description',merchant=r->>'merchant',amount=(p->>'total_amount')::numeric,
    transaction_type=p->>'transaction_type',target_account_id=(p->>'account_id')::bigint,target_credit_card_id=(p->>'credit_card_id')::bigint,
    is_historical=coalesce((p->>'is_historical')::boolean,false),tag_ids=ARRAY(SELECT value::bigint FROM jsonb_array_elements_text(p->'tag_ids')),updated_at=now() WHERE id=q.id RETURNING * INTO q;
  END IF;
  decisions:=decisions||jsonb_build_array(to_jsonb(q)-'csv_data'-'csv_analysis');
 END LOOP;
 RETURN jsonb_build_object('status','saved','rows',decisions);
END $$;
REVOKE ALL ON FUNCTION public.save_category_review(bigint,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_category_review(bigint,text,jsonb) TO authenticated;

CREATE FUNCTION public.save_category_preference(p_budget_id bigint,p_merchant_id bigint,p_revision uuid,p_always_ask boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.category_review_preferences;
BEGIN
 PERFORM public.lock_budget_write(p_budget_id);
 SELECT * INTO r FROM public.category_review_preferences WHERE account_id=p_budget_id AND merchant_id=p_merchant_id FOR UPDATE;
 IF (FOUND AND r.revision IS DISTINCT FROM p_revision) OR (NOT FOUND AND p_revision IS NOT NULL) THEN RETURN jsonb_build_object('status','conflict'); END IF;
 INSERT INTO public.category_review_preferences(account_id,merchant_id,always_ask,updated_by) VALUES(p_budget_id,p_merchant_id,p_always_ask,auth.uid())
 ON CONFLICT(account_id,merchant_id) DO UPDATE SET always_ask=excluded.always_ask,revision=gen_random_uuid(),updated_by=auth.uid(),updated_at=now() RETURNING * INTO r;
 -- Existing unreviewed proposals are demoted immediately, without touching human choices.
 UPDATE public.queued_imports SET category_suggestion=category_suggestion||jsonb_build_object('alwaysAsk',p_always_ask,'preferenceRevision',r.revision,'outcome','suggest','reason',CASE WHEN p_always_ask THEN 'You asked to review this merchant every time.' ELSE 'Suggestions are enabled. Confirm this purchase or refresh your suggestions.' END)
 WHERE account_id=p_budget_id AND status NOT IN ('imported','rejected') AND (category_suggestion->>'merchantId')::bigint=p_merchant_id;
 PERFORM public.mark_budget_resource(p_budget_id,'imports');
 RETURN jsonb_build_object('status','saved','preference',to_jsonb(r));
END $$;
REVOKE ALL ON FUNCTION public.save_category_preference(bigint,bigint,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_category_preference(bigint,bigint,uuid,boolean) TO authenticated;

-- Bounded, budget-wide evidence. Legacy history remains useful but is never called confirmed.
CREATE INDEX category_history_lookup ON public.transactions(budget_account_id,merchant_group_id,date DESC);
CREATE FUNCTION public.category_history(p_budget_id bigint,p_merchants bigint[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM public.lock_budget_write(p_budget_id);
 IF cardinality(p_merchants)>100 THEN RAISE EXCEPTION 'Too many merchants.' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_object_agg(m.id::text,h.observations),'{}') INTO result
 FROM unnest(p_merchants) m(id) CROSS JOIN LATERAL (
  SELECT coalesce(jsonb_agg(to_jsonb(rows) ORDER BY rows.date DESC,rows.id DESC),'[]') observations FROM (
   SELECT t.id,t.date,t.description,t.total_amount AS amount,t.transaction_type,
    coalesce(e.source IN ('reviewed','manual') AND e.signature=public.transaction_category_signature(t.id),false) confirmed,
    coalesce(e.session_id,'legacy') session,coalesce(e.corrected,false) corrected,e.confirmed_at AS "confirmedAt",
    (SELECT coalesce(jsonb_agg(jsonb_build_object('categoryId',s.category_id,'categoryName',c.name,'amount',s.amount) ORDER BY s.id),'[]') FROM public.transaction_splits s JOIN public.categories c ON c.id=s.category_id AND c.account_id=p_budget_id WHERE s.transaction_id=t.id) splits
   FROM public.transactions t LEFT JOIN public.merchant_groups mg ON mg.id=t.merchant_group_id
   LEFT JOIN public.transaction_category_evidence e ON e.transaction_id=t.id AND e.account_id=p_budget_id
   WHERE t.budget_account_id=p_budget_id AND coalesce(t.merchant_override_id,mg.global_merchant_id)=m.id AND t.date::date>=current_date-interval '1 year' AND t.date::date<=current_date
   ORDER BY t.date DESC,t.id DESC LIMIT 100
  ) rows
 ) h;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.category_history(bigint,bigint[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.category_history(bigint,bigint[]) TO authenticated;

-- Server-only CAS persistence; an AI response may be saved as an alternative but never changes a review decision.
CREATE FUNCTION public.store_category_suggestions(p_budget_id bigint,p_batch_id text,p_rows jsonb,p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb; q public.queued_imports; results jsonb:='[]';
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.budget_accounts b WHERE b.id=p_budget_id AND b.deleted_at IS NULL AND (b.owner_id=p_actor OR EXISTS(SELECT 1 FROM public.account_users u WHERE u.account_id=b.id AND u.user_id=p_actor AND u.status='active' AND u.role IN ('owner','editor')))) THEN RAISE EXCEPTION 'No write access.' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.budget_accounts WHERE id=p_budget_id FOR UPDATE;
 FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  SELECT * INTO q FROM public.queued_imports WHERE id=(r->>'id')::bigint AND account_id=p_budget_id AND source_batch_id=p_batch_id FOR UPDATE;
  IF NOT FOUND OR q.status IN ('imported','rejected') OR q.revision IS DISTINCT FROM (r->>'revision')::uuid THEN
   results:=results||jsonb_build_array(jsonb_build_object('id',r->>'id','status','conflict')); CONTINUE;
  END IF;
  UPDATE public.queued_imports SET category_suggestion=r->'suggestion',updated_at=now() WHERE id=q.id RETURNING * INTO q;
  results:=results||jsonb_build_array(jsonb_build_object('id',q.id,'status','saved','revision',q.revision,'suggestion',q.category_suggestion));
 END LOOP;
 RETURN results;
END $$;
REVOKE ALL ON FUNCTION public.store_category_suggestions(bigint,text,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.store_category_suggestions(bigint,text,jsonb,uuid) TO service_role;

-- A single current observation, replaced on guarded edits. Unsupported/classic edits make its signature stale.
ALTER FUNCTION public.save_transaction_command(bigint,bigint,uuid,jsonb,boolean,uuid) RENAME TO save_transaction_command_without_category_evidence;
REVOKE ALL ON FUNCTION public.save_transaction_command_without_category_evidence(bigint,bigint,uuid,jsonb,boolean,uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.save_transaction_command(p_budget_id bigint,p_id bigint,p_revision uuid,p_patch jsonb,p_delete boolean DEFAULT false,p_operation_id uuid DEFAULT null)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; previous jsonb; signature text;
BEGIN
 result:=public.save_transaction_command_without_category_evidence(p_budget_id,p_id,p_revision,p_patch,p_delete,p_operation_id);
 IF NOT p_delete AND result->>'status'='saved' AND p_patch ? 'splits' AND jsonb_array_length(p_patch->'splits')>0 THEN
  signature:=public.transaction_category_signature((result->'record'->>'id')::bigint);
  INSERT INTO public.transaction_category_evidence(transaction_id,account_id,signature,source,session_id,actor,corrected)
  VALUES((result->'record'->>'id')::bigint,p_budget_id,signature,'manual',coalesce(p_operation_id::text,p_id::text,result->'record'->>'id'),auth.uid(),p_id IS NOT NULL)
  ON CONFLICT(transaction_id) DO UPDATE SET signature=excluded.signature,source='manual',actor=auth.uid(),confirmed_at=now(),corrected=true
  WHERE transaction_category_evidence.signature<>excluded.signature OR transaction_category_evidence.source='auto';
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_transaction_command(bigint,bigint,uuid,jsonb,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_transaction_command(bigint,bigint,uuid,jsonb,boolean,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_import_chunk(p_budget_id bigint,p_batch_id text,p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE item jsonb; q public.queued_imports; patch jsonb; result jsonb; hash_value text; existing bigint; imported_id bigint;
  imported integer:=0; skipped integer:=0; failures jsonb:='[]'; skipped_items jsonb:='[]';
BEGIN
  PERFORM public.lock_budget_write(p_budget_id);
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid review chunk.' USING ERRCODE='22023'; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    BEGIN
      SELECT * INTO q FROM public.queued_imports WHERE id=(item->>'queuedId')::bigint AND account_id=p_budget_id AND source_batch_id=p_batch_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'This queued transaction is no longer available.' USING ERRCODE='22023'; END IF;
      IF q.status='imported' THEN
        skipped:=skipped+1;skipped_items:=skipped_items||jsonb_build_array(jsonb_build_object('id',item->>'id','description',q.description,'reason','Already imported.')); CONTINUE;
      END IF;
      IF (item->>'expectedRevision')::uuid IS NULL OR q.revision<>(item->>'expectedRevision')::uuid THEN
        RAISE EXCEPTION 'Changed elsewhere. Reload and review this transaction before importing.' USING ERRCODE='22023'; END IF;
      IF q.status='rejected' THEN RAISE EXCEPTION 'This transaction was rejected elsewhere.' USING ERRCODE='22023'; END IF;
      hash_value:=q.hash||CASE WHEN coalesce((item->>'forceImport')::boolean,false) THEN ':separate:queued-'||q.id ELSE '' END;
      SELECT l.transaction_id INTO existing FROM public.imported_transactions i JOIN public.imported_transaction_links l ON l.imported_transaction_id=i.id WHERE i.account_id=p_budget_id AND i.hash=hash_value LIMIT 1;
      IF FOUND THEN
        skipped:=skipped+1;skipped_items:=skipped_items||jsonb_build_array(jsonb_build_object('id',item->>'id','description',q.description,'reason','Duplicate already exists.')); CONTINUE;
      END IF;
      SELECT id INTO imported_id FROM public.imported_transactions WHERE account_id=p_budget_id AND hash=hash_value LIMIT 1;
      IF FOUND THEN RAISE EXCEPTION 'An earlier import with this identity needs review before it can be imported again.' USING ERRCODE='22023'; END IF;
      patch:=item->'patch';
      IF coalesce((item->>'requireCategoryReview')::boolean,false) THEN
        IF q.category_review->>'state'='reviewed' THEN
          patch:=(q.category_review->'patch')||jsonb_build_object('merchant_group_id',patch->'merchant_group_id');
          IF coalesce((q.category_review->>'forceImport')::boolean,false) IS DISTINCT FROM coalesce((item->>'forceImport')::boolean,false) THEN RAISE EXCEPTION 'Review the duplicate decision again.' USING ERRCODE='22023'; END IF;
        ELSIF q.category_review IS NULL AND q.category_suggestion->>'outcome'='auto' AND NOT coalesce((q.category_suggestion->>'alwaysAsk')::boolean,false) THEN
          IF NOT EXISTS(SELECT 1 FROM public.category_automation_config WHERE account_id=p_budget_id AND btrim(validation_notes)<>'' AND
              ((q.category_suggestion->>'automaticBasis'='history' AND history_enabled) OR
               (q.category_suggestion->>'automaticBasis'='ai' AND ai_enabled AND ai_model=q.category_suggestion->'ai'->>'model' AND ai_prompt_version=q.category_suggestion->'ai'->>'promptVersion' AND (q.category_suggestion->'ai'->>'confidence')::numeric>=ai_threshold))) OR
             NOT EXISTS(SELECT 1 FROM public.merchant_groups mg JOIN public.global_merchants gm ON gm.id=mg.global_merchant_id AND gm.status='active' WHERE mg.id=(patch->>'merchant_group_id')::bigint AND mg.account_id=p_budget_id AND mg.global_merchant_id=(q.category_suggestion->>'merchantId')::bigint) OR
             EXISTS(SELECT 1 FROM public.category_review_preferences WHERE account_id=p_budget_id AND merchant_id=(q.category_suggestion->>'merchantId')::bigint AND always_ask) OR
             NOT EXISTS(SELECT 1 FROM public.categories WHERE id=(q.category_suggestion->>'categoryId')::bigint AND account_id=p_budget_id AND NOT coalesce(is_archived,false) AND NOT coalesce(is_buffer,false) AND NOT coalesce(is_system,false) AND NOT coalesce(is_goal,false)) THEN
            RAISE EXCEPTION 'This suggestion needs review again.' USING ERRCODE='22023'; END IF;
          patch:=jsonb_build_object('date',q.transaction_date,'description',q.description,'total_amount',q.amount,'transaction_type',q.transaction_type,'account_id',q.target_account_id,'credit_card_id',q.target_credit_card_id,'is_historical',q.is_historical,'tag_ids',coalesce(to_jsonb(q.tag_ids),'[]'),'merchant_group_id',patch->'merchant_group_id','splits',jsonb_build_array(jsonb_build_object('category_id',(q.category_suggestion->>'categoryId')::bigint,'amount',q.amount)));
        ELSE RAISE EXCEPTION 'Confirm the envelope before importing this transaction.' USING ERRCODE='22023'; END IF;
      END IF;
      result:=public.save_transaction_command_without_category_evidence(p_budget_id,null,null,patch,false,gen_random_uuid());
      INSERT INTO public.imported_transactions(user_id,account_id,import_date,source_type,source_identifier,transaction_date,merchant,description,amount,hash,metadata)
      VALUES(auth.uid(),p_budget_id,now()::text,'CSV Import','Automatic Import - Batch '||p_batch_id,patch->>'date',q.merchant,patch->>'description',(patch->>'total_amount')::numeric,hash_value,
        jsonb_build_object('originalRow',q.original_data,'suggestedCategory',q.suggested_category_id,'suggestedMerchant',q.merchant)) RETURNING id INTO imported_id;
      INSERT INTO public.imported_transaction_links(imported_transaction_id,transaction_id) VALUES(imported_id,(result->'record'->>'id')::bigint);
      UPDATE public.queued_imports SET status='imported',imported_transaction_id=(result->'record'->>'id')::bigint,imported_at=now(),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() WHERE id=q.id;
      IF coalesce((item->>'requireCategoryReview')::boolean,false) THEN
        INSERT INTO public.transaction_category_evidence(transaction_id,account_id,signature,source,session_id,actor,prediction)
        VALUES((result->'record'->>'id')::bigint,p_budget_id,public.transaction_category_signature((result->'record'->>'id')::bigint),
          CASE WHEN q.category_review->>'state'='reviewed' THEN 'reviewed' ELSE 'auto' END,p_batch_id,auth.uid(),coalesce(q.category_review->'suggestion',q.category_suggestion));
      END IF;
      imported:=imported+1;
    EXCEPTION WHEN unique_violation OR check_violation OR foreign_key_violation OR invalid_parameter_value OR invalid_text_representation OR numeric_value_out_of_range OR not_null_violation THEN
      failures:=failures||jsonb_build_array(jsonb_build_object('id',item->>'id','description',item->'patch'->>'description','error',SQLERRM));
    END;
  END LOOP;
  RETURN jsonb_build_object('imported',imported,'skipped',skipped,'requested',jsonb_array_length(p_items),'skippedItems',skipped_items,'failures',failures);
END $$;
REVOKE ALL ON FUNCTION public.approve_import_chunk(bigint,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_import_chunk(bigint,text,jsonb) TO authenticated;

-- Provider calls are explicit and serialized per user; request IDs survive transport retries.
ALTER TABLE public.import_category_runs ADD COLUMN user_id uuid REFERENCES auth.users(id), ADD COLUMN provider_result jsonb;
CREATE FUNCTION public.begin_category_ai_run(p_id uuid,p_budget_id bigint,p_user_id uuid,p_batch_id text,p_hash text,p_limit integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.import_category_runs; used integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,151));
 IF NOT EXISTS(SELECT 1 FROM public.budget_accounts b WHERE b.id=p_budget_id AND b.deleted_at IS NULL AND (b.owner_id=p_user_id OR EXISTS(SELECT 1 FROM public.account_users u WHERE u.account_id=b.id AND u.user_id=p_user_id AND u.status='active' AND u.role IN ('owner','editor')))) THEN RAISE EXCEPTION 'No write access.' USING ERRCODE='42501'; END IF;
 SELECT * INTO r FROM public.import_category_runs WHERE id=p_id;
 IF FOUND THEN
  IF r.account_id<>p_budget_id OR r.user_id<>p_user_id OR r.request_hash<>p_hash THEN RAISE EXCEPTION 'Run identity already used.' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('status',r.state,'response',r.response,'providerResult',r.provider_result);
 END IF;
 IF EXISTS(SELECT 1 FROM public.import_category_runs WHERE user_id=p_user_id AND state='running' AND created_at>now()-interval '10 minutes') THEN RETURN jsonb_build_object('status','busy'); END IF;
 -- A lost process never starts again automatically. Its lease eventually permits an explicit new run.
 UPDATE public.import_category_runs SET state='failed',completed_at=now() WHERE user_id=p_user_id AND state='running' AND created_at<=now()-interval '10 minutes';
 SELECT count(*) INTO used FROM public.ai_usage_tracking WHERE user_id=p_user_id AND feature_type='categorization' AND timestamp>=date_trunc('day',now());
 IF used>=p_limit THEN RETURN jsonb_build_object('status','limit'); END IF;
 INSERT INTO public.import_category_runs(id,account_id,batch_id,kind,request_hash,user_id) VALUES(p_id,p_budget_id,p_batch_id,'ai',p_hash,p_user_id);
 RETURN jsonb_build_object('status','started');
END $$;
REVOKE ALL ON FUNCTION public.begin_category_ai_run(uuid,bigint,uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_category_ai_run(uuid,bigint,uuid,text,text,integer) TO service_role;
CREATE FUNCTION public.record_category_ai_result(p_id uuid,p_result jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.import_category_runs;
BEGIN
 SELECT * INTO r FROM public.import_category_runs WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown AI run.' USING ERRCODE='22023'; END IF;
 IF r.provider_result IS NOT NULL THEN RETURN; END IF;
 UPDATE public.import_category_runs SET provider_result=p_result WHERE id=p_id;
 INSERT INTO public.ai_usage_tracking(user_id,account_id,feature_type,tokens_used,tokens_input,tokens_output,response_time_ms,request_metadata)
 VALUES(r.user_id,r.account_id,'categorization',coalesce((p_result->>'tokensUsed')::int,0),0,0,(p_result->>'responseTimeMs')::int,jsonb_build_object('runId',p_id,'transactionCount',jsonb_array_length(p_result->'suggestions')));
END $$;
REVOKE ALL ON FUNCTION public.record_category_ai_result(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_category_ai_result(uuid,jsonb) TO service_role;

COMMIT;
