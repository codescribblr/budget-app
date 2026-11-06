import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encrypt, decrypt, validateObject, encryptionKey, storageConfig, BackupStorage, BUCKET } from './private-backup.mjs';
const key = randomBytes(32), name = 'production/123-abcdef.tar.gz.enc', plain = Buffer.from('private database contents\n');
test('round trip uses random nonces and does not expose plaintext', () => {
  const a = encrypt(plain, key, name), b = encrypt(plain, key, name);
  assert.deepEqual(decrypt(a, key, name), plain);
  assert.notDeepEqual(a, b); assert.equal(a.includes(plain), false);
});
test('tampering, truncation, wrong keys and renamed objects fail closed', () => {
  const encoded = encrypt(plain, key, name), altered = Buffer.from(encoded);
  altered[altered.length - 1] ^= 1;
  for (const blob of [altered, encoded.subarray(0, 10), encoded.subarray(0, -1)]) assert.throws(() => decrypt(blob, key, name));
  assert.throws(() => decrypt(encoded, randomBytes(32), name));
  assert.throws(() => decrypt(encoded, key, 'production/other.tar.gz.enc'));
});
test('reject unsafe paths, invalid keys and non-origin URLs', () => {
  for (const v of ['../x.zip.enc', 'legacy/../../x.zip.enc', 'production/a?b.zip.enc', 'production/a\nb.zip.enc']) assert.throws(() => validateObject(v));
  for (const v of ['', 'a'.repeat(63), 'z'.repeat(64)]) assert.throws(() => encryptionKey(v));
  for (const url of ['http://example.com', 'https://a:b@example.com', 'https://example.com/foreign']) assert.throws(() => storageConfig({ NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: 'secret', BACKUP_ENCRYPTION_KEY: key.toString('hex') }));
});
function fakeStorage({ publicBucket = false, corrupt = false, failDownload = false } = {}) {
  let stored, uploads = 0;
  const fetcher = async (url, options) => {
    assert.equal(options.redirect, 'error');
    if (url.endsWith(`/bucket/${BUCKET}`)) return Response.json({id: BUCKET, public: publicBucket});
    if (options.method === 'POST') { stored = Buffer.from(options.body); uploads++; return Response.json({}); }
    if (failDownload) return new Response('sensitive detail', {status:503});
    if (corrupt) stored[stored.length - 1] ^= 1;
    return new Response(stored);
  };
  return { storage: new BackupStorage({origin:'https://example.com',token:'secret',key}, fetcher), uploads:()=>uploads };
}
test('only private uploads whose independently downloaded bytes verify succeed', async () => {
  const good = fakeStorage(); assert.equal((await good.storage.upload(name, plain)).verified, true); assert.equal(good.uploads(), 1);
  const open = fakeStorage({publicBucket:true}); await assert.rejects(open.storage.upload(name, plain), /private/); assert.equal(open.uploads(), 0);
  await assert.rejects(fakeStorage({corrupt:true}).storage.upload(name, plain));
  await assert.rejects(fakeStorage({failDownload:true}).storage.upload(name, plain), /HTTP 503/);
});

function fakePanel({ corrupt = false, metadataMismatch = false } = {}) {
  let stored, receipt, uploads = 0;
  const fetcher = async (url, options) => {
    assert.ok(url.startsWith('https://panel.example/api/ci/apps/19/'));
    assert.equal(options.redirect, 'error'); assert.equal(options.headers.apikey, undefined);
    assert.equal(options.headers.Authorization, 'Bearer app-backup-only');
    if (url.endsWith('/backups/policy')) return Response.json({ backend: 'cloud-panel', private: true, encryptedOnly: true, format: 'BUDGET-BACKUP-1' });
    if (url.endsWith('/backups/verify')) { receipt=JSON.parse(options.body); return Response.json({verified:true}); }
    if (url.endsWith('/backups')) return Response.json([{object:name,sha256:metadataMismatch?'0'.repeat(64):receipt.sha256,verifiedAt:'2026-11-06T00:00:00Z',replicaAt:'2026-11-06T00:00:01Z'}]);
    assert.equal(new URL(url).searchParams.get('object'),name);
    if (options.method === 'POST') { stored=Buffer.from(options.body); uploads++; return Response.json({}); }
    const response=Buffer.from(stored);if(corrupt)response[response.length-1]^=1;
    return new Response(response);
  };
  return {fetcher,receipt:()=>receipt,uploads:()=>uploads,stored:()=>stored};
}
test('Cloud Panel credentials remain app-scoped and need no Supabase storage settings', async () => {
  const {createBackupStorage}=await import('./private-backup.mjs');
  const config=storageConfig({BACKUP_STORAGE_BACKEND:'cloud-panel',CLOUD_BACKUP_URL:'https://panel.example',CLOUD_BACKUP_APP_ID:'19',CLOUD_BACKUP_TOKEN:'app-backup-only',BACKUP_ENCRYPTION_KEY:key.toString('hex')});
  const fake=fakePanel(),storage=createBackupStorage(config,fake.fetcher);
  const encoded=encrypt(plain,key,name),result=await storage.importEncrypted(name,encoded);
  assert.deepEqual(fake.stored(),encoded);assert.equal(result.backend,'cloud-panel');assert.ok(result.replicaAt);
  assert.equal(fake.receipt().decrypted,true);
  assert.deepEqual(await storage.get(name),plain);
  assert.equal((await storage.list('production')).length,1);
  assert.throws(()=>storageConfig({...process.env,BACKUP_STORAGE_BACKEND:'typo'}),/Unsupported/);
  assert.throws(()=>storageConfig({BACKUP_STORAGE_BACKEND:'cloud-panel',CLOUD_BACKUP_URL:'https://panel.example',CLOUD_BACKUP_APP_ID:'19/../../20',CLOUD_BACKUP_TOKEN:'token',BACKUP_ENCRYPTION_KEY:key.toString('hex')}),/APP_ID/);
});
test('Cloud Panel verification follows successful decryption and requires the matching replica', async()=>{
  const {createBackupStorage}=await import('./private-backup.mjs');
  const config={backend:'cloud-panel',origin:'https://panel.example',appId:'19',token:'app-backup-only',key};
  const bad=fakePanel({corrupt:true});await assert.rejects(createBackupStorage(config,bad.fetcher).upload(name,plain));assert.equal(bad.receipt(),undefined);
  const mismatch=fakePanel({metadataMismatch:true});await assert.rejects(createBackupStorage(config,mismatch.fetcher).upload(name,plain),/metadata changed/);
});
