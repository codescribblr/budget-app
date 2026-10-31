const {execFile,execFileSync}=require('node:child_process');
const {promisify}=require('node:util');
const assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..');
require(root+'/node_modules/@next/env').loadEnvConfig(root);
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,'nmqlddimigebtlaophbv.supabase.co');
const exe='/opt/homebrew/opt/postgresql@17/bin/psql';
const dbUrl=new URL(process.env.SUPABASE_DB_URL);
assert.ok(decodeURIComponent(dbUrl.username).endsWith('.nmqlddimigebtlaophbv') || dbUrl.hostname==='db.nmqlddimigebtlaophbv.supabase.co');
Object.assign(process.env,{PGHOST:dbUrl.hostname,PGPORT:dbUrl.port||'5432',PGUSER:decodeURIComponent(dbUrl.username),PGPASSWORD:decodeURIComponent(dbUrl.password),PGDATABASE:decodeURIComponent(dbUrl.pathname.slice(1)),PGSSLMODE:dbUrl.searchParams.get('sslmode')||'require'});
const args=['-X','-qAt','-v','ON_ERROR_STOP=1'];
const sql=s=>execFileSync(exe,[...args,'-c',s],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const query=async s=>(await promisify(execFile)(exe,[...args,'-c',s])).stdout.trim();
const owner=sql('select owner_id from budget_accounts where id=27');
assert.match(owner,/^[0-9a-f-]{36}$/);
const fixture=JSON.parse(sql(`with a as (insert into accounts(user_id,account_id,name,balance,account_type,include_in_totals) values('${owner}',27,'Sync QA disposable',1000,'checking',false) returning id,revision), c as (insert into credit_cards(user_id,account_id,name,credit_limit,available_credit,current_balance,include_in_totals) values('${owner}',27,'Sync QA disposable card',5000,4000,1000,false) returning id,revision) select json_build_object('account',(select row_to_json(a) from a),'card',(select row_to_json(c) from c));`));
const auth=(q,user=owner)=>`begin; set local role authenticated; set local request.jwt.claim.sub='${user}'; ${q}; commit;`;
const save=(kind,id,revision,patch)=>`select save_guarded_account(27,'${kind}',${id},'${revision}','${JSON.stringify(patch)}'::jsonb)`;
(async()=>{
 try {
  const {account:a,card:c}=fixture;
  const race=await Promise.all([query(auth(save('account',a.id,a.revision,{balance:1250}))),query(auth(save('account',a.id,a.revision,{balance:900})))]);
  const results=race.map(JSON.parse);
  assert.deepEqual(results.map(r=>r.status).sort(),['conflict','saved']);
  assert.equal(sql(`select count(*) from account_balance_audit where account_id=${a.id}`),'1');
  console.log('PASS concurrent saves: one success, one conflict, one audit');
  const original=JSON.parse(sql(`select row_to_json(a) from accounts a where id=${a.id}`));
  sql(`update accounts set name='Sync QA legacy write' where id=${a.id}`);
  const stale=JSON.parse(sql(auth(save('account',a.id,original.revision,{balance:2000}))));
  assert.equal(stale.status,'conflict');
  console.log('PASS legacy writer changes revision and invalidates stale draft');
  const card=JSON.parse(sql(auth(save('card',c.id,c.revision,{credit_limit:6000}))));
  assert.equal(card.record.current_balance,2000);
  assert.equal(JSON.parse(sql(auth(save('card',c.id,c.revision,{available_credit:4500})))).status,'conflict');
  const next=JSON.parse(sql(auth(save('card',c.id,card.record.revision,{available_credit:4500}))));
  assert.equal(next.record.current_balance,1500);
  assert.equal(sql(`select count(*) from credit_card_balance_audit where credit_card_id=${c.id}`),'1');
  console.log('PASS concurrent card limit and available credit remain consistent');
  let denied=false; try{sql(auth(save('account',a.id,stale.latest.revision,{balance:3000}),'00000000-0000-0000-0000-000000000001'));}catch(e){denied=e.stderr.toString().includes('edit access') || e.stderr.toString().includes('No write access');}
  assert.equal(denied,true); console.log('PASS unauthorized RPC denied');
  const latest=JSON.parse(sql(`select row_to_json(a) from accounts a where id=${a.id}`));
  const rollback=sql(`begin; alter table account_balance_audit add constraint sync_qa_failure check (account_id<>${a.id}) not valid; set local role authenticated; set local request.jwt.claim.sub='${owner}'; do $$ begin perform save_guarded_account(27,'account',${a.id},'${latest.revision}','{"balance":1777}'::jsonb); raise exception 'expected audit failure'; exception when check_violation then null; end $$; select balance from accounts where id=${a.id}; rollback;`);
  assert.equal(Number(rollback),latest.balance); console.log('PASS audit failure rolls back the financial update');
 } finally {
  sql(`delete from accounts where id=${fixture.account.id} and account_id=27; delete from credit_cards where id=${fixture.card.id} and account_id=27;`);
  console.log('Removed disposable test accounts and their audit rows.');
 }
})().catch(e=>{console.error(e.stderr?.toString() || e.message);process.exit(1)});
