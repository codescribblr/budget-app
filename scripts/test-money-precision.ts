import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { loadEnvConfig } from '@next/env';
import { calculateBudgetTotals } from '../src/lib/budget-totals';
import { normalizeMoneyExpectation } from '../src/lib/money-precision';

loadEnvConfig(process.cwd());
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname, 'nmqlddimigebtlaophbv.supabase.co', 'Test project only');
const url = new URL(process.env.SUPABASE_DB_URL!);
assert.ok(decodeURIComponent(url.username).endsWith('.nmqlddimigebtlaophbv') || url.hostname === 'db.nmqlddimigebtlaophbv.supabase.co');
Object.assign(process.env, {PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGSSLMODE: 'require'});
const raw = 1000.10 - 250.20 - 500;
const available = calculateBudgetTotals({
  accounts: [{balance: 1000.10, include_in_totals: true}],
  categories: [{current_balance: 250.20, monthly_amount: 300, is_system: false}, {current_balance: 500, monthly_amount: 0, is_system: true, is_buffer: true}],
  creditCards: [], pendingChecks: [],
}).current_savings;
assert.notEqual(raw, available);
assert.equal(normalizeMoneyExpectation(raw), available);
execFileSync('/opt/homebrew/opt/postgresql@17/bin/psql', ['-X', '-v', 'ON_ERROR_STOP=1'], {
  stdio: ['pipe', 'inherit', 'inherit'],
  input: `BEGIN;
DO $$
DECLARE owner uuid; budget bigint; envelope bigint; other bigint; buffer bigint; op uuid:=gen_random_uuid(); command jsonb; result jsonb; saved jsonb; revision uuid;
BEGIN
 SELECT owner_id INTO owner FROM public.budget_accounts WHERE id=27;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=owner AND email LIKE '%@example.invalid') THEN RAISE EXCEPTION 'Expected preview owner'; END IF;
 PERFORM set_config('request.jwt.claim.sub',owner::text,true);
 INSERT INTO public.budget_accounts(owner_id,name) VALUES(owner,'Rollback money precision QA') RETURNING id INTO budget;
 INSERT INTO public.accounts(user_id,account_id,name,balance,account_type,include_in_totals) VALUES(owner,budget,'QA cash',1000.10,'checking',true);
 INSERT INTO public.categories(user_id,account_id,name,monthly_amount,current_balance) VALUES(owner,budget,'QA envelope',300,250.20) RETURNING id INTO envelope;
 INSERT INTO public.categories(user_id,account_id,name,monthly_amount,current_balance) VALUES(owner,budget,'QA other',0,0) RETURNING id INTO other;
 INSERT INTO public.categories(user_id,account_id,name,monthly_amount,current_balance,is_buffer,is_system) VALUES(owner,budget,'QA buffer',0,500,true,true) RETURNING id INTO buffer;
 INSERT INTO public.user_feature_flags(user_id,account_id,feature_name,enabled) VALUES(owner,budget,'income_buffer',true);
 IF public.budget_available_money(budget)<>${available} THEN RAISE EXCEPTION 'Summary and database disagree'; END IF;
 command:=jsonb_build_object('kind','allocate','allocations',jsonb_build_array(jsonb_build_object('categoryId',envelope,'amount',300)), 'month','2026-11-01','expectedAvailable',${raw},'expectedBalance',500,'bufferWithdrawAmount',50.10);
 IF public.run_envelope_command(budget,gen_random_uuid(),command)->>'status'<>'conflict' THEN RAISE EXCEPTION 'Expected reproduction of old precision failure'; END IF;
 command:=command||jsonb_build_object('expectedAvailable',${normalizeMoneyExpectation(raw) - 0.01});
 IF public.run_envelope_command(budget,gen_random_uuid(),command)->>'status'<>'conflict' THEN RAISE EXCEPTION 'One-cent stale value accepted'; END IF;
 IF (SELECT current_balance FROM public.categories WHERE id=buffer)<>500 OR EXISTS(SELECT 1 FROM public.category_balance_audit WHERE account_id=budget) THEN RAISE EXCEPTION 'Rejected command changed money'; END IF;
 command:=command||jsonb_build_object('expectedAvailable',${normalizeMoneyExpectation(raw)});
 saved:=public.run_envelope_command(budget,op,command);
 IF saved->>'status'<>'saved' OR public.budget_available_money(budget)<>0 OR (SELECT current_balance FROM public.categories WHERE id=buffer)<>449.90 THEN RAISE EXCEPTION 'Combined funding failed'; END IF;
 IF public.run_envelope_command(budget,op,command)<>saved OR (SELECT count(*) FROM public.category_balance_audit WHERE account_id=budget)<>2 THEN RAISE EXCEPTION 'Combined retry moved twice'; END IF;
 result:=public.run_envelope_command(budget,gen_random_uuid(),jsonb_build_object('kind','buffer-release','amount',49.90,'expectedAvailable',0,'expectedBalance',449.90));
 IF result->>'status'<>'saved' OR public.budget_available_money(budget)<>49.90 THEN RAISE EXCEPTION 'Buffer release failed'; END IF;
 result:=public.run_envelope_command(budget,gen_random_uuid(),jsonb_build_object('kind','buffer-add','amount',9.90,'expectedAvailable',${normalizeMoneyExpectation(49.90000000000003)},'expectedBalance',400));
 IF result->>'status'<>'saved' OR public.budget_available_money(budget)<>40 THEN RAISE EXCEPTION 'Buffer add failed'; END IF;
 result:=public.run_envelope_command(budget,gen_random_uuid(),jsonb_build_object('kind','allocate','allocations',jsonb_build_array(jsonb_build_object('categoryId',envelope,'amount',40)),'month','2026-11-01','expectedAvailable',40));
 IF result->>'status'<>'saved' OR public.budget_available_money(budget)<>0 THEN RAISE EXCEPTION 'Next allocation failed'; END IF;
 result:=public.run_envelope_command(budget,gen_random_uuid(),jsonb_build_object('kind','transfer','categoryId',envelope,'toCategoryId',other,'amount',0.10,'expectedAvailable',0));
 IF result->>'status'<>'saved' OR public.budget_available_money(budget)<>0 THEN RAISE EXCEPTION 'Transfer failed'; END IF;
 SELECT c.revision INTO revision FROM public.categories c WHERE id=envelope;
 command:=jsonb_build_object('kind','set-balance','categoryId',envelope,'amount',590.00,'expectedAvailable',0,'expectedRevisions',jsonb_build_object(envelope::text,revision));
 result:=public.run_envelope_command(budget,gen_random_uuid(),command);
 IF result->>'status'<>'saved' OR public.budget_available_money(budget)<>0.10 THEN RAISE EXCEPTION 'Balance adjustment failed'; END IF;
 command:=command||jsonb_build_object('expectedAvailable',0.10);
 IF public.run_envelope_command(budget,gen_random_uuid(),command)->>'status'<>'conflict' THEN RAISE EXCEPTION 'Stale envelope revision accepted'; END IF;
 IF (SELECT count(*) FROM public.category_balance_audit WHERE account_id=budget)<>8 OR (SELECT sum(balance) FROM public.accounts WHERE account_id=budget)<>1000.10 THEN RAISE EXCEPTION 'Unexpected audit or bank balance'; END IF;
 RAISE NOTICE 'PASS precision reproduction, summary/database parity, combined funding, safe retry, sequential buffer moves/funding/transfers/adjustments, one-cent and revision conflicts, unchanged bank balance';
END $$;
ROLLBACK;`,
});
