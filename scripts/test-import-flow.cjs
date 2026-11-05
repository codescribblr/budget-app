// Browser regression for the real import components with intercepted API calls.
// Run from the repository root after npm run build. Requires Playwright Chromium:
// PLAYWRIGHT_MODULE=/path/to/node_modules/playwright node --import tsx scripts/test-import-flow.cjs
// No database or app server is used. The CSV and all API records are synthetic.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const project = createRequire(process.cwd()+'/package.json');
const {build} = project('esbuild');
const {chromium} = project(process.env.PLAYWRIGHT_MODULE || 'playwright');
const screenshots=process.env.IMPORT_FLOW_SCREENSHOTS;
if(screenshots)fs.mkdirSync(screenshots,{recursive:true});
const Papa = project('papaparse');
const {analyzeCSV} = project('./src/lib/column-analyzer.ts');
const {parseCSVWithMapping} = project('./src/lib/csv-parser-helpers.ts');
const csv = ['DATE,DESCRIPTION,AMOUNT,CHECK #,STATUS', ...Array.from({length:26},(_,i)=>`10/${String(i+1).padStart(2,'0')}/2026,Test merchant ${i+1},-${i+10}.00,,Posted`)].join('\n');
const raw = Papa.parse(csv).data;
const mapping = {dateColumn:0,descriptionColumn:1,amountColumn:2,debitColumn:null,creditColumn:null,transactionTypeColumn:null,statusColumn:4,amountSignConvention:'positive_is_income',dateFormat:'MM/dd/yyyy',hasHeaders:true};
const category = {id:1,name:'Groceries',sort_order:0,is_archived:false,category_type:'expense'};
const transport = {...category,id:2,name:'Transport'};
const navigation = `import {useSyncExternalStore} from 'react';
 const subscribe=fn=>{window.addEventListener('test-route',fn);return ()=>window.removeEventListener('test-route',fn)};
 const snapshot=()=>location.pathname+location.search;
 function go(url,replace=false){window.testRoutes.push(url);history[replace?'replaceState':'pushState']({},'',url);window.dispatchEvent(new Event('test-route'))}
 const router={push:url=>go(url),replace:url=>go(url,true),refresh:()=>window.dispatchEvent(new Event('test-route'))};
 export function useRouter(){return router}
 export function usePathname(){return useSyncExternalStore(subscribe,snapshot).split('?')[0]}
 export function useSearchParams(){useSyncExternalStore(subscribe,snapshot);return new URLSearchParams(location.search)}
 export function useParams(){return {batchId:usePathname().split('/')[3]}}
`;
const stubs = {
 'next/navigation':navigation,
 '@/hooks/use-account-permissions':'export const useAccountPermissions=()=>({isEditor:true,isOwner:true,isLoading:false})',
 '@/components/new-look/use-resource-version':`import {useSyncExternalStore} from 'react';let version=0;window.refreshImportTest=()=>{version++;window.dispatchEvent(new Event('import-test-refresh'))};const subscribe=fn=>{window.addEventListener('import-test-refresh',fn);return()=>window.removeEventListener('import-test-refresh',fn)};export const useResourceVersion=()=>useSyncExternalStore(subscribe,()=>version)`,
 '@/contexts/SubscriptionContext':'export const useSubscription=()=>({isPremium:false})',
 '@/contexts/FeatureContext':'export const useFeature=()=>false;export const useFeatures=()=>({hasPremium:false,isFeatureEnabled:()=>false,loading:false,error:null,refreshFeatures:()=>{}})',
 '@/hooks/use-ai-usage':'export const useAIUsage=()=>({stats:null,refreshStats:()=>{}})',
 'next/link':`import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`,
};
(async()=>{
 const parsed = await parseCSVWithMapping(raw,mapping,'checking-flow.csv');
 assert.equal(parsed.length,26);
 const bundle = await build({
  stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {usePathname} from 'next/navigation';import FileUpload from './src/components/import/FileUpload';import Mapping from './src/components/import/ImportMappingPage';import Batch from './src/components/import/ImportBatchPage';import Queue from './src/components/import/ImportQueueList';import {Toaster} from 'sonner';window.testRoutes=[];function App(){const path=usePathname();return <div className="new-look" style={{padding:20,maxWidth:1100,margin:'auto'}}>{path.endsWith('/map-columns')?<Mapping/>:path==='/new/imports'?<><FileUpload onFileUploaded={()=>{}}/><Queue/></>:<Batch key={path}/>}<Toaster/></div>}createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);`},
  bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'},
  plugins:[{name:'context-boundaries',setup(b){b.onResolve({filter:/.*/},args=>Object.hasOwn(stubs,args.path)?{path:args.path,namespace:'stub'}:null);b.onLoad({filter:/.*/,namespace:'stub'},args=>({contents:stubs[args.path],resolveDir:process.cwd(),loader:'jsx'}));}}]
 });
 const cssDir=path.join(process.cwd(),'.next/static/css');
 const css=fs.existsSync(cssDir)?fs.readdirSync(cssDir).filter(f=>f.endsWith('.css')).map(f=>fs.readFileSync(path.join(cssDir,f),'utf8')).join('\n'):'';
 const browser=await chromium.launch({headless:true});
 try{
  for(const scenario of [
   {name:'mapping fallback and final bulk confirmation',broken:true,width:1280,weekly:true,finish:true},
   {name:'valid template direct review',broken:false,width:1280},
   {name:'duplicate-only import opens duplicate review',broken:false,allDuplicates:true,width:1280},
   {name:'mobile mapping fallback (dark, reduced motion)',broken:true,width:390,dark:true},
   {name:'queued import direct review and retry',queue:true,failHistory:true,width:1280},
   {name:'incomplete mapping resumes through remap',remap:true,width:1280},
   {name:'remap saves template without a second prompt',remap:true,saveRemap:true,width:1280},
   {name:'prepared review load failure can retry',queue:true,failReview:true,width:1280},
   {name:'bulk category applies to mixed suggestions and unassigned rows',queue:true,bulk:'mixed',width:1280},
   {name:'bulk confirms unchanged suggested categories',queue:true,bulk:'unchanged',width:1280},
   {name:'bulk retry preserves changes through refresh',queue:true,bulk:'retry',width:1280},
   {name:'bulk stale edits show conflict without replacing newer choices',queue:true,bulk:'conflict',width:1280},
   {name:'bulk waits for the save before closing',queue:true,bulk:'slow',width:1280},
   {name:'bulk mobile action and category save (dark, reduced motion)',queue:true,bulk:'mixed',width:390,dark:true},
  ]){
   if(process.env.IMPORT_FLOW_SCENARIO&&!scenario.name.includes(process.env.IMPORT_FLOW_SCENARIO))continue;
   let tasks={csv_mapping:!scenario.remap,duplicate_detection:false,categorization:false,import_defaults_assignment:false};
   let rows=[],revisions=0,queuedBody=null,failed=false,preparedReads=0,bulkFailed=false;
   const calls=[],errors=[];let releaseBulkSave;
   const bulkSaveGate=new Promise(resolve=>{releaseBulkSave=resolve});
   function seed(transactions,isHistorical=false){rows=transactions.map((t,i)=>({id:i+1,revision:'r'+(++revisions),account_id:27,source_batch_id:'flow-batch',import_setup_id:1,transaction_date:t.date,description:t.description,merchant:t.merchant,amount:t.amount,transaction_type:t.transaction_type,hash:t.hash,original_data:{},target_account_id:10,target_credit_card_id:null,is_historical:isHistorical,tag_ids:[],suggested_category_id:null,status:'pending',csv_file_name:'checking-flow.csv',csv_fingerprint:'5-648d3d59',csv_mapping_name:'Checking mapping'}))}
   if(scenario.queue||scenario.remap)seed(parsed);
   const page=await browser.newPage({viewport:{width:scenario.width,height:1000},colorScheme:scenario.dark?'dark':'light',reducedMotion:scenario.dark?'reduce':'no-preference'});
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url()),pathname=url.pathname,body=req.postData()?JSON.parse(req.postData()):{};
    if(!pathname.startsWith('/api/')){
     if(pathname==='/bundle.js')return route.fulfill({contentType:'application/javascript',body:bundle.outputFiles[0].text});
     if(pathname==='/test.css')return route.fulfill({contentType:'text/css',body:css});
     if(pathname.startsWith('/new/imports'))return route.fulfill({contentType:'text/html',body:'<html><head><link rel="stylesheet" href="/test.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>'});
     return route.fulfill({status:404,body:''});
    }
    calls.push({path:pathname,method:req.method(),body});
    let data;
    if(pathname==='/api/categories')data=[category,transport];
    else if(pathname==='/api/accounts')data=[{id:10,name:'Checking test'}];
    else if(pathname==='/api/accounts/10')data={id:10,name:'Checking test'};
    else if(pathname==='/api/credit-cards'||pathname==='/api/tags')data=[];
    else if(pathname==='/api/automatic-imports/setups/1')data={setup:{source_type:'manual',integration_name:'Manual import'}};
    else if(pathname==='/api/import/templates')data={id:20,fingerprint:'5-648d3d59',column_count:5,date_column:0,description_column:scenario.broken?2:1,amount_column:scenario.broken?5:2,amount_sign_convention:'positive_is_income',date_format:'MM/dd/yyyy',has_headers:true};
    else if(pathname==='/api/import/queue-manual'){queuedBody=body;seed(body.transactions,body.isHistorical);data={success:true,batchId:'flow-batch',queuedCount:rows.length}}
    else if(pathname==='/api/automatic-imports/queue'){
     if(scenario.failReview&&!Object.values(tasks).includes(false)&&++preparedReads===2){return route.fulfill({status:503,json:{error:'Test loading interrupted'}})}
     data=url.searchParams.has('batches')?{batches:rows.length?[{batch_id:'flow-batch',budget_id:27,source_type:'manual',setup_name:'Manual import',file_name:'checking-flow.csv',count:rows.length,date_range:{start:'2026-10-01',end:'2026-11-04'},target_account_name:'Checking test'}]:[]}:{imports:rows.filter(r=>r.status==='pending').map(r=>({...r,processing_tasks:tasks}))};
    }else if(pathname.endsWith('/processing-status'))data={processingTasks:tasks,needsProcessing:Object.values(tasks).includes(false),defaultAccountId:10,defaultCreditCardId:null,isHistorical:rows[0]?.is_historical};
    else if(pathname==='/api/import/check-duplicates')data={duplicates:(scenario.allDuplicates?rows:rows.slice(10)).map(r=>r.hash)};
    else if(pathname==='/api/import/link-merchants')data={linked:10};
    else if(pathname==='/api/automatic-imports/queue/update-categorization'){
     for(const t of body.transactions){const row=rows.find(r=>'queued-'+r.id===t.id);row.original_data={isDuplicate:t.isDuplicate,duplicateType:t.duplicateType};row.revision='r'+(++revisions)}
     for(const task of body.completedTasks)tasks[task]=true;
     data={success:true,revisions:Object.fromEntries(rows.map(r=>['queued-'+r.id,r.revision]))};
    }else if(pathname==='/api/import/review'){
     if(body.action==='history'){
      if(scenario.failHistory&&!failed){failed=true;return route.fulfill({status:503,json:{error:'Test preparation interrupted'}})}
      for(const input of body.rows){const row=rows.find(r=>r.id===input.id);row.revision='r'+(++revisions);row.category_suggestion={version:1,fingerprint:'test',merchantId:null,merchantName:row.merchant,historyVersion:'v1',generatedAt:'now',alwaysAsk:false,history:{candidates:row.id<=4?[{categoryId:1,categoryName:'Groceries',count:3,reason:'History'}]:[],confirmedCount:3,otherCount:0,splitCount:0,recent:[],eligible:false,reason:'Review this suggestion'},outcome:row.id<=4?'suggest':'ask',source:row.id<=4?'history':null,categoryId:row.id<=4?1:null,reason:'Review this suggestion'}}
      data={results:body.rows.map(t=>({id:t.id,status:'saved'}))};
     }else if(body.action==='save'){
      if(scenario.bulk==='slow')await bulkSaveGate;
      if(scenario.bulk==='retry'&&!bulkFailed){bulkFailed=true;return route.fulfill({status:503,json:{error:'Bulk save interrupted. Please retry.'}})}
      if(body.rows.some(input=>input.revision!==rows.find(r=>r.id===input.id).revision))return route.fulfill({status:409,json:{error:'These transactions changed elsewhere. Close this editor and reopen the latest saved version.'}});
      const saved=body.rows.map(input=>{const row=rows.find(r=>r.id===input.id);assert.equal(input.revision,row.revision);row.revision='r'+(++revisions);row.category_review={state:input.state,patch:input.patch,merchant:input.merchant,forceImport:input.forceImport};return row});data={rows:saved};
     }else throw new Error('Unexpected review action '+body.action);
    }else if(pathname.endsWith('/mark-task-complete')){tasks[body.task]=true;rows[0].revision='r'+(++revisions);data={success:true}}
    else if(pathname.endsWith('/remap'))data={csvAnalysis:analyzeCSV(raw),csvData:raw,csvFileName:'checking-flow.csv',currentMapping:mapping,currentTemplateId:null,currentTemplateName:null,targetAccountId:10,targetCreditCardId:null,expectedBudgetId:27,expectedTemplateRevisions:{},expectedSetupRevision:'setup-1',expectedRevisions:Object.fromEntries(rows.map(r=>[r.id,r.revision]))};
    else if(pathname.endsWith('/apply-remap')){tasks={csv_mapping:true,duplicate_detection:false,categorization:false,import_defaults_assignment:false};data={success:true}}
    else if(pathname==='/api/automatic-imports/queue/approve-batch'){
     assert.equal(body.transactions.length,10);assert.equal(body.requireCategoryReview,true);
     for(const t of body.transactions){const row=rows.find(r=>'queued-'+r.id===t.id);assert.equal(row.category_review.state,'reviewed');assert.equal(t.revision,row.revision);row.status='approved'}data={imported:10,skipped:0};
    }else{errors.push('Unexpected API '+req.method()+' '+pathname);return route.fulfill({status:500,json:{error:'Unexpected API '+pathname}})}
    return route.fulfill({json:data});
   });
   const start=scenario.remap?'/new/imports/flow-batch':'/new/imports';
   await page.goto('https://import-flow.test'+start+(scenario.weekly?'?checkin=weekly':''));
   if(scenario.dark)await page.evaluate(()=>document.documentElement.classList.add('dark'));
   if(scenario.queue){await page.getByRole('button',{name:'Review',exact:true}).click()}
   else if(!scenario.remap){
    await page.locator('input[type=file]').setInputFiles({name:'checking-flow.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
    await page.getByRole('combobox').click();await page.getByRole('option',{name:'Checking test',exact:true}).click();
    if(scenario.finish)await page.getByRole('checkbox',{name:'Historical transactions'}).click();
    await page.getByRole('button',{name:'Continue',exact:true}).click();
   }
   if(scenario.broken||scenario.remap){
    await page.waitForURL(/map-columns/);
    if(scenario.saveRemap){await page.getByRole('switch',{name:'Save this mapping as a template',exact:true}).click();await page.getByLabel('Template Name',{exact:true}).fill('Updated checking test');}
    await page.getByRole('button',{name:scenario.remap?'Apply Re-mapping':'Continue Import',exact:true}).click();
   }
   await page.waitForURL(/imports\/flow-batch/);
   if(scenario.failHistory||scenario.failReview){await page.getByRole('button',{name:'Retry processing'}).click()}
   await page.getByRole('heading',{name:'A place for every purchase'}).waitFor();
   assert.equal(await page.locator('[data-review-id]').count(),scenario.allDuplicates?26:10);
   assert.equal(await page.getByRole('button',{name:scenario.allDuplicates?'Duplicates 26':'Needs review 10',exact:true}).getAttribute('aria-pressed'),'true');
   if(scenario.allDuplicates)assert.equal(await page.getByRole('button',{name:'Import 0 transactions',exact:true}).isDisabled(),true);
   assert.equal(await page.getByRole('button',{name:'Ready 0',exact:true}).count(),1);
   assert.equal(await page.getByRole('button',{name:/Continue to review|Resume processing|Review import settings/}).count(),0);
   if(scenario.saveRemap){const body=calls.find(c=>c.path.endsWith('/apply-remap')).body;assert.equal(body.saveAsTemplate,true);assert.equal(body.templateName,'Updated checking test');assert.equal(body.expectedBudgetId,27);}
   assert.equal(calls.filter(c=>c.path==='/api/import/check-duplicates').length,1);
   assert.equal(calls.filter(c=>c.path==='/api/import/review'&&c.body.action==='history').length,scenario.failHistory?2:1);
   assert.equal(calls.filter(c=>c.path==='/api/automatic-imports/queue/approve-batch').length,0);
   if(scenario.weekly)assert.equal(new URL(page.url()).searchParams.get('checkin'),'weekly');
   if(scenario.bulk){
    const ids=scenario.bulk==='unchanged'?[1,2,3]:[1,5,6];
    const before=structuredClone(rows);
    const target=scenario.bulk==='retry'||scenario.bulk==='conflict'?transport:category;
    const rowFor=id=>page.locator('[data-review-id="queued-'+id+'"]');
    for(const id of ids)await rowFor(id).getByRole('checkbox').check();
    const action=page.getByRole('button',{name:'Edit & confirm selected',exact:true});
    assert.equal(await action.evaluate(el=>el.classList.contains('nl-primary')),true,'Bulk action is a prominent button');
    await rowFor(ids.at(-1)).scrollIntoViewIfNeeded();
    const actionBounds=await action.boundingBox();
    assert.ok(actionBounds.y>=0&&actionBounds.y+actionBounds.height<=1000,'Bulk action remains visible while reviewing lower rows');
    if(screenshots&&scenario.bulk==='mixed')await page.screenshot({path:path.join(screenshots,`bulk-action-${scenario.width}.png`)});
    await action.click();
    const dialog=page.getByRole('dialog',{name:'Bulk Edit 3 Transactions',exact:true});
    const choose=async()=>{await dialog.getByRole('combobox',{name:'Category',exact:true}).click();await page.getByRole('option',{name:target.name,exact:true}).click()};
    if(scenario.bulk!=='unchanged')await choose();
    if(screenshots&&scenario.bulk==='mixed')await page.screenshot({path:path.join(screenshots,`bulk-dialog-${scenario.width}.png`)});
    if(scenario.bulk==='retry'||scenario.bulk==='conflict'){
     if(scenario.bulk==='conflict')rows[4].revision='remote-edit';
     const refresh=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/accounts/10');
     await page.evaluate(()=>window.refreshImportTest());await refresh;
     await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
     assert.match(await dialog.getByRole('combobox',{name:'Category',exact:true}).innerText(),/Transport/,'Refresh preserves the category draft');
    }
    await dialog.getByRole('button',{name:/Save Changes|Save & mark ready/}).click();
    if(scenario.bulk==='slow'){
     await dialog.getByRole('button',{name:'Saving...',exact:true}).waitFor();await page.keyboard.press('Escape');
     assert.equal(await dialog.isVisible(),true,'Saving cannot dismiss the editor');
     assert.equal(await dialog.getByRole('combobox',{name:'Category',exact:true}).isDisabled(),true);
     releaseBulkSave();
    }
    if(scenario.bulk==='retry'||scenario.bulk==='conflict'){
     const alert=dialog.getByRole('alert');await alert.waitFor();
     assert.match(await alert.innerText(),scenario.bulk==='retry'?/interrupted/:/changed elsewhere/);
     assert.equal(rows.filter(r=>r.category_review).length,0,'Failure cannot claim partial success');
     assert.match(await dialog.getByRole('combobox',{name:'Category',exact:true}).innerText(),/Transport/);
     if(scenario.bulk==='conflict'){
      await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await action.click();await choose();
     }
     await dialog.getByRole('button',{name:'Save & mark ready',exact:true}).click();
    }
    await dialog.waitFor({state:'hidden'});
    const saves=calls.filter(c=>c.path==='/api/import/review'&&c.body.action==='save');
    assert.equal(saves.length,scenario.bulk==='retry'||scenario.bulk==='conflict'?2:1,'Bulk edit persists and confirms all selected rows');
    assert.deepEqual(saves.at(-1).body.rows.map(r=>r.id).sort((a,b)=>a-b),ids);
    for(const id of ids){
     const row=rows[id-1],patch=row.category_review.patch;
     assert.equal(row.category_review.state,'reviewed');assert.deepEqual(patch.splits,[{category_id:target.id,amount:row.amount}]);
     assert.equal(patch.date,before[id-1].transaction_date);assert.equal(patch.account_id,before[id-1].target_account_id);
     assert.equal(patch.is_historical,before[id-1].is_historical);assert.deepEqual(patch.tag_ids,before[id-1].tag_ids);
     assert.equal(await rowFor(id).getAttribute('data-state'),'ready');
    }
    for(const row of rows.filter(r=>!ids.includes(r.id)))assert.deepEqual(row,before[row.id-1],'Unselected rows stay unchanged');
    assert.equal(await page.getByRole('button',{name:'Ready 3',exact:true}).count(),1);
    assert.equal(await page.locator('[data-review-id]').count(),10,'Confirmed rows remain visible in their review workspace');
    await page.reload();await page.getByRole('heading',{name:'A place for every purchase'}).waitFor();
    await page.getByRole('button',{name:'Ready 3',exact:true}).click();assert.equal(await page.locator('[data-review-id]').count(),3);
    for(const id of ids)assert.equal(await rowFor(id).getAttribute('data-state'),'ready');
   }else if(scenario.finish){
    assert.equal(queuedBody.isHistorical,true);assert.equal(queuedBody.targetAccountId,10);
    for(let id=5;id<=10;id++){
     await page.locator('[data-review-id="queued-'+id+'"]').getByRole('button',{name:/Choose envelope for/}).click();
     const picker=page.getByRole('dialog',{name:'Envelope for '+rows.find(r=>r.id===id).merchant,exact:true});
     await picker.getByRole('option',{name:'Groceries',exact:true}).click();
     await picker.waitFor({state:'hidden'});
     await page.waitForFunction(id=>document.querySelector('[data-review-id="queued-'+id+'"]')?.getAttribute('data-state')==='ready',id);
    }
    assert.equal(await page.locator('[data-review-id]').count(),10);
    assert.equal(await page.getByRole('button',{name:'Needs review 4',exact:true}).count(),1);
    await page.getByRole('button',{name:'Import 10 transactions',exact:true}).click();
    await page.getByRole('dialog',{name:'Import 10 transactions?'}).waitFor();
    await page.getByText('4 envelope suggestions will be confirmed automatically when you import.').waitFor();
    assert.equal(calls.filter(c=>c.path.endsWith('/approve-batch')).length,0);
    await page.getByRole('button',{name:'Review individually',exact:true}).click();
    assert.equal(await page.locator('[data-review-id]').count(),4);
    await page.getByRole('button',{name:'Import 10 transactions',exact:true}).click();
    await page.getByRole('button',{name:'Confirm all & import 10',exact:true}).click();
    await page.getByText(/10 imported/).waitFor();
    assert.equal(calls.filter(c=>c.path.endsWith('/approve-batch')).length,1);
    assert.equal(calls.filter(c=>c.path==='/api/import/review'&&c.body.action==='save').at(-1).body.rows.length,4);
   }else{
    const count=calls.filter(c=>c.path==='/api/import/check-duplicates').length;
    await page.reload();await page.getByRole('heading',{name:'A place for every purchase'}).waitFor();
    assert.equal(calls.filter(c=>c.path==='/api/import/check-duplicates').length,count);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'No horizontal overflow');
   assert.deepEqual(errors,[]);
   console.log('PASS:',scenario.name);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
