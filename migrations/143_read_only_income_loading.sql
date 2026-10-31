BEGIN;
-- One-time legacy conversion replaces the old write-on-GET migration. Deleting
-- the final income source must not recreate it on the next device refresh.
DO $$ DECLARE household record; values jsonb; income numeric; deductions jsonb; BEGIN
 FOR household IN SELECT id FROM public.budget_accounts b WHERE b.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM public.income_streams i WHERE i.account_id=b.id) LOOP
  SELECT jsonb_object_agg(key,value ORDER BY updated_at,id) INTO values FROM public.settings WHERE account_id=household.id;
  BEGIN
   income:=coalesce(nullif(values->>'annual_income',''),nullif(values->>'annual_salary',''),'0')::numeric;
   IF income>0 OR values ? 'tax_rate' OR values ? 'pay_frequency' THEN
    deductions:=coalesce((values->>'pre_tax_deduction_items')::jsonb,'[]');
    IF jsonb_typeof(deductions)<>'array' THEN deductions:='[]'; END IF;
    INSERT INTO public.income_streams(account_id,name,annual_income,tax_rate,pay_frequency,include_extra_paychecks,pre_tax_deduction_items,include_in_budget)
    VALUES(household.id,'Primary Income',income,coalesce(nullif(values->>'tax_rate',''),'0')::numeric,coalesce(values->>'pay_frequency','monthly'),coalesce(values->>'include_extra_paychecks','false')='true',deductions,true);
   END IF;
  EXCEPTION WHEN invalid_text_representation OR check_violation OR numeric_value_out_of_range THEN
   RAISE EXCEPTION 'Review invalid legacy income settings for budget % before migration.',household.id;
  END;
 END LOOP;
END $$;
COMMIT;
