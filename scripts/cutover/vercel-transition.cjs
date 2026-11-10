// Standalone transition deployment. No application or provider dependencies.
const {randomUUID}=require('node:crypto');
const TARGET='https://everydollarbudget.app';
const common={'Cache-Control':'no-store, max-age=0','Retry-After':'60','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'};
const page='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maintenance · Every Dollar Budget</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7f6;color:#173b32;font:18px/1.6 system-ui,sans-serif}main{max-width:34rem;padding:2rem}h1{font-size:2.5rem;line-height:1.2}a{color:#146b50}</style></head><body><main><p>Every Dollar Budget</p><h1>We’ll be right back</h1><p>We’re moving to our new home. Budget changes are temporarily paused. Please try again shortly.</p><p>If you have unsaved changes in another tab, keep that tab open until maintenance ends.</p><a href="">Try again</a></main></body></html>';
function versionValid(v){return v&&typeof v.releaseId==='string'&&/^[a-z0-9][a-z0-9_-]{7,127}$/.test(v.releaseId)&&typeof v.commitSha==='string'&&/^[a-f0-9]{40}$/.test(v.commitSha)&&typeof v.buildTime==='string'&&Number.isFinite(Date.parse(v.buildTime))&&typeof v.buildTimestamp==='number'&&Number.isFinite(v.buildTimestamp)&&v.buildTimestamp>0;}
function createHandler(mode,fetcher=fetch){
 return async(req,res)=>{
  for(const[k,v]of Object.entries(common))res.setHeader(k,v);
  const send=(status,body,type='application/json')=>{res.statusCode=status;res.setHeader('Content-Type',type);res.end(req.method==='HEAD'?undefined:type==='application/json'?JSON.stringify(body):body);};
  const url=new URL(req.url,'https://budget-app-one-lime.vercel.app');
  const read=['GET','HEAD'].includes(req.method);
  res.setHeader('X-Budget-Transition',mode==='redirect'?'redirect':'maintenance');
  if(mode!=='redirect'){
   return send(503,read&&!url.pathname.startsWith('/api/')?page:{error:'Budget changes are temporarily paused for the hosting move.',code:'APP_MAINTENANCE'},read&&!url.pathname.startsWith('/api/')?'text/html; charset=utf-8':'application/json');
  }
  if(read&&['/api/version','/version.json'].includes(url.pathname)){
   try{
    const r=await fetcher(TARGET+'/api/version',{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(4000)});
    if(!r.ok)throw Error();const v=await r.json();if(!versionValid(v))throw Error();
    return send(200,{releaseId:v.releaseId,commitSha:v.commitSha,buildTime:v.buildTime,buildTimestamp:v.buildTimestamp});
   }catch{return send(503,{error:'The new release is temporarily unavailable.'});}
  }
  if(!read||url.pathname==='/api'||url.pathname.startsWith('/api/'))return send(503,{error:'The app has moved. Refresh the page to continue.',migrationTarget:TARGET});
  const target=new URL(TARGET);
  target.pathname=url.pathname;target.search=url.search;
  if(url.pathname==='/auth/callback'){target.pathname='/login';target.search='';}
  target.searchParams.set('__budget_move',randomUUID());
  res.statusCode=307;res.setHeader('Location',target.toString());res.end();
 };
}
module.exports=createHandler(require('./transition-mode.json').mode);
module.exports.createHandler=createHandler;
