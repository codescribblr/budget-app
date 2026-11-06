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
