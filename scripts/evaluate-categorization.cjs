// Read-only aggregate evaluation. Explicit review outcomes are not an unbiased accuracy sample.
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
require(root+'/node_modules/@next/env').loadEnvConfig(root);
const url=new URL(process.env.SUPABASE_DB_URL);
Object.assign(process.env,{PGHOST:url.hostname,PGPORT:url.port||'5432',PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGSSLMODE:'require'});
const sql=`WITH observations AS (
 SELECT e.source,e.prediction,e.corrected,
 (SELECT CASE WHEN count(*)=1 THEN min(category_id) END FROM transaction_splits WHERE transaction_id=e.transaction_id) actual
 FROM transaction_category_evidence e JOIN transactions t ON t.id=e.transaction_id AND t.budget_account_id=e.account_id
 WHERE e.prediction IS NOT NULL AND e.source IN ('reviewed','manual') AND e.signature=transaction_category_signature(e.transaction_id)
), candidates AS (
 SELECT 'history' method,(prediction->'history'->'candidates'->0->>'categoryId')::bigint candidate,actual,coalesce((prediction->'history'->>'eligible')::boolean,false) candidate_gate FROM observations
 UNION ALL
 SELECT 'AI',(prediction->'ai'->'candidate'->>'categoryId')::bigint,actual,false FROM observations
 UNION ALL
 SELECT 'agreement',(prediction->'ai'->'candidate'->>'categoryId')::bigint,actual,false FROM observations WHERE prediction->'ai'->'candidate'->>'categoryId'=prediction->'history'->'candidates'->0->>'categoryId'
) SELECT method,count(*) observations,count(candidate) predictions,count(*) FILTER(WHERE candidate=actual) matching_final_choices,count(*) FILTER(WHERE candidate IS NOT NULL AND candidate IS DISTINCT FROM actual) corrections_or_splits,count(*) FILTER(WHERE candidate_gate) history_gate_samples FROM candidates GROUP BY method ORDER BY method;`;
console.log('Only saved, explicitly reviewed outcomes. Unknown legacy history and unchecked automatic imports are excluded. AI may be used on harder rows, and users may see predictions before confirming; these figures alone cannot certify automatic-assignment accuracy.');
execFileSync('/opt/homebrew/opt/postgresql@17/bin/psql',['-X','-v','ON_ERROR_STOP=1','-c',sql],{stdio:'inherit'});
