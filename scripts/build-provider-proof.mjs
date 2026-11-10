// Test executable only. The release proof calls real route/signature code while
// replacing ALL database, email-processing and provider effects at bundle time.
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const output=process.argv[2];
if(!output)throw Error('Provide the proof bundle output path');
const mocks={
  '@/lib/stripe': `import Stripe from 'stripe';const client=new Stripe('sk_test_synthetic_no_network',{httpClient:Stripe.createFetchHttpClient(async()=>{throw Error('Provider network disabled in proof')})});export const getStripe=()=>client;export const getStripeWebhookSecret=()=>process.env.STRIPE_WEBHOOK_SECRET;`,
  '@/lib/supabase/server': `export const createServiceRoleClient=()=>({from:(table)=>{if(table!=='automatic_import_setups')throw Error('Proof database operation refused');const q={select(){return q},eq(){return q},update(){return q},single:async()=>({data:{id:42,account_id:74,is_historical:true,error_count:0},error:null})};return q;}});`,
  '@/lib/automatic-imports/email-processor': `export async function processEmailAttachments({attachments}){return {processed:attachments.length,queued:2,errors:[]}}`,
  '@/lib/automatic-imports/providers/teller-service': `export async function fetchAndQueueTellerTransactions(){throw Error('Provider calls disabled in proof')}`,
  '@/lib/automatic-imports/helpers': `export function getDecryptedAccessToken(){return null}`,
  '@/lib/premium-feature-setup': `export async function setupPremiumFeatures(){throw Error('Billing disabled in proof')}`,
  '@/lib/notifications/subscription-helpers': `export async function createPaymentFailedNotification(){throw Error('Notifications disabled in proof')}`,
  '@/lib/subscription-access-control': `export async function disablePremiumAccess(){throw Error('Billing disabled in proof')}`,
  '@/lib/subscription-price-utils': `export async function getPriceInfoFromStripe(){throw Error('Billing disabled in proof')}`,
};
await build({
  stdin:{contents:`export {POST as stripe} from './src/app/api/webhooks/stripe/route';export {POST as teller} from './src/app/api/webhooks/teller/route';export {POST as resend} from './src/app/api/webhooks/email-import/route';`,resolveDir:root,loader:'ts'},
  outfile:resolve(output),bundle:true,platform:'node',format:'cjs',target:'node24',
  tsconfig:resolve(root,'tsconfig.json'),
  plugins:[{name:'isolated-proof-effects',setup(b){
    b.onResolve({filter:/^@\//},args=>mocks[args.path]?{path:args.path,namespace:'proof-fixture'}:undefined);
    b.onLoad({filter:/.*/,namespace:'proof-fixture'},args=>({contents:mocks[args.path],loader:'js',resolveDir:root}));
  }}],
});
