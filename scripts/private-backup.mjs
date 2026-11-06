#!/usr/bin/env node
// No npm install is needed to encrypt or recover deployment archives.
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const MAGIC = Buffer.from('BUDGET-BACKUP-1\n');
const MAX_BYTES = 48 * 1024 * 1024;
export const BUCKET = 'deployment-backups';
export function validateObject(name) {
  if (!/^(production|legacy|verification)\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.(tar\.gz|zip)\.enc$/.test(name)) throw new Error('Invalid backup object name');
  return name;
}
export function encryptionKey(value) {
  if (!/^[a-fA-F0-9]{64}$/.test(value || '')) throw new Error('BACKUP_ENCRYPTION_KEY must contain 64 hex characters');
  return Buffer.from(value, 'hex');
}
export function encrypt(plain, key, name) {
  validateObject(name);
  if (!plain.length || plain.length > MAX_BYTES) throw new Error('Backup size outside permitted limits');
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.concat([MAGIC, Buffer.from(name)]));
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}
export function decrypt(encoded, key, name) {
  validateObject(name);
  if (encoded.length <= MAGIC.length + 28 || encoded.length > MAX_BYTES + MAGIC.length + 28 || !encoded.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Invalid encrypted backup format');
  const offset = MAGIC.length;
  const cipher = createDecipheriv('aes-256-gcm', key, encoded.subarray(offset, offset + 12));
  cipher.setAAD(Buffer.concat([MAGIC, Buffer.from(name)]));
  cipher.setAuthTag(encoded.subarray(offset + 12, offset + 28));
  return Buffer.concat([cipher.update(encoded.subarray(offset + 28)), cipher.final()]);
}
export const digest = data => createHash('sha256').update(data).digest();
export function storageConfig(env = process.env) {
  const backend = env.BACKUP_STORAGE_BACKEND || 'supabase';
  if (!['supabase', 'cloud-panel'].includes(backend)) throw new Error('Unsupported backup storage backend');
  const url = new URL(backend === 'cloud-panel' ? env.CLOUD_BACKUP_URL || '' : env.NEXT_PUBLIC_SUPABASE_URL || '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Expected an HTTPS backup storage origin');
  const token = backend === 'cloud-panel' ? env.CLOUD_BACKUP_TOKEN : env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token) throw new Error(backend === 'cloud-panel' ? 'CLOUD_BACKUP_TOKEN is required' : 'SUPABASE_SERVICE_ROLE_KEY is required');
  if (backend === 'cloud-panel' && !/^[1-9][0-9]*$/.test(env.CLOUD_BACKUP_APP_ID || '')) throw new Error('CLOUD_BACKUP_APP_ID is required');
  return { backend, origin: url.origin, token, appId: env.CLOUD_BACKUP_APP_ID, key: encryptionKey(env.BACKUP_ENCRYPTION_KEY) };
}
export function createBackupStorage(config, fetcher = fetch) {
  return config.backend === 'cloud-panel' ? new CloudPanelBackupStorage(config, fetcher) : new BackupStorage(config, fetcher);
}
export class BackupStorage {
  constructor(config, fetcher = fetch) { this.config = config; this.fetcher = fetcher; }
  async request(path, options = {}) {
    const response = await this.fetcher(`${this.config.origin}/storage/v1/${path}`, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(120_000),
      headers: { apikey: this.config.token, Authorization: `Bearer ${this.config.token}`, ...options.headers },
    });
    // Response bodies and request headers can contain secrets; never log them.
    if (!response.ok) throw new Error(`Private backup storage request failed (HTTP ${response.status})`);
    return response;
  }
  async requirePrivateBucket() {
    const bucket = await (await this.request(`bucket/${BUCKET}`)).json();
    if (bucket.id !== BUCKET || bucket.public !== false) throw new Error('Deployment backup bucket must exist and be private');
  }
  objectReadPath(name) { return `object/authenticated/${BUCKET}/${name}`; }
  objectWritePath(name) { return `object/${BUCKET}/${name}`; }
  async getEncoded(name) {
    validateObject(name);
    const response = await this.request(this.objectReadPath(name));
    if (Number(response.headers.get('content-length')) > MAX_BYTES + 100) throw new Error('Remote backup exceeds size limit');
    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > MAX_BYTES + 100) throw new Error('Remote backup exceeds size limit');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  async get(name) { return decrypt(await this.getEncoded(name), this.config.key, name); }
  async upload(name, plain) { return this.importEncrypted(name, encrypt(plain, this.config.key, name)); }
  // Preserves original ciphertext and path-bound authentication when moving stores.
  async importEncrypted(name, encoded) {
    const plain = decrypt(encoded, this.config.key, name);
    await this.requirePrivateBucket();
    await this.request(this.objectWritePath(name), {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'x-upsert': 'false' }, body: encoded,
    });
    // Verify independent read-back before migrations or removing an old copy.
    const downloaded = await this.getEncoded(name);
    const restored = decrypt(downloaded, this.config.key, name);
    if (!timingSafeEqual(digest(plain), digest(restored))) throw new Error('Backup read-back checksum mismatch');
    if (!timingSafeEqual(digest(encoded), digest(downloaded))) throw new Error('Encrypted backup read-back checksum mismatch');
    const receipt = await this.verifyReplica(name, digest(downloaded).toString('hex'));
    return { object: name, bytes: plain.length, sha256: digest(plain).toString('hex'), verified: true, ...receipt };
  }
  async verifyReplica() { return {}; }
  async list(prefix) {
    if (!['production', 'legacy', 'verification'].includes(prefix)) throw new Error('Invalid backup prefix');
    await this.requirePrivateBucket();
    const rows = [];
    for (let offset = 0; ; offset += 100) {
      const page = await (await this.request(`object/list/${BUCKET}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
      })).json();
      if (!Array.isArray(page)) throw new Error('Invalid object listing');
      rows.push(...page.filter(row => row.id).map(row => ({ object: `${prefix}/${row.name}`, createdAt: row.created_at })));
      if (page.length < 100) break;
    }
    return rows;
  }
}
export class CloudPanelBackupStorage extends BackupStorage {
  async request(path, options = {}) {
    const response = await this.fetcher(`${this.config.origin}/api/ci/apps/${this.config.appId}/${path}`, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(120_000),
      headers: { Authorization: `Bearer ${this.config.token}`, ...options.headers },
    });
    if (!response.ok) throw new Error(`Private backup storage request failed (HTTP ${response.status})`);
    return response;
  }
  async requirePrivateBucket() {
    const policy = await (await this.request('backups/policy')).json();
    if (policy.backend !== 'cloud-panel' || policy.private !== true || policy.encryptedOnly !== true || policy.format !== 'BUDGET-BACKUP-1') throw new Error('Cloud Panel must enforce private encrypted backup storage');
  }
  objectReadPath(name) { return `backups/object?object=${encodeURIComponent(name)}`; }
  objectWritePath(name) { return this.objectReadPath(name); }
  async verifyReplica(name, sha256) {
    await this.request('backups/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ object: name, sha256, decrypted: true }) });
    const deadline = Date.now() + 180_000;
    do {
      const rows = await (await this.request('backups')).json();
      if (!Array.isArray(rows)) throw new Error('Invalid private backup listing');
      const object = rows.find(row => row.object === name);
      if (object?.sha256 !== sha256) throw new Error('Verified backup metadata changed');
      if (object.verifiedAt && object.replicaAt) return { backend: 'cloud-panel', replicaAt: object.replicaAt };
      await new Promise(resolve => setTimeout(resolve, 2000));
    } while (Date.now() < deadline);
    throw new Error('Private backup server replica is not confirmed; migrations stopped');
  }
  async list(prefix) {
    if (!['production', 'legacy', 'verification'].includes(prefix)) throw new Error('Invalid backup prefix');
    await this.requirePrivateBucket();
    const rows = await (await this.request('backups')).json();
    if (!Array.isArray(rows)) throw new Error('Invalid private backup listing');
    return rows.filter(row => row.object.startsWith(prefix + '/'));
  }
}
async function main() {
  const [command, first, second] = process.argv.slice(2);
  const storage = createBackupStorage(storageConfig());
  if (command === 'upload') {
    const result = await storage.upload(validateObject(second), await readFile(first));
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `backup_object=${result.object}\nbackup_sha256=${result.sha256}\n`);
    console.log(JSON.stringify(result));
  } else if (command === 'download') {
    await storage.requirePrivateBucket();
    const plain = await storage.get(validateObject(first));
    await writeFile(second, plain, { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ object: first, bytes: plain.length, sha256: digest(plain).toString('hex'), verified: true }));
  } else if (command === 'list') {
    console.log(JSON.stringify(await storage.list(first || 'production'), null, 2));
  } else throw new Error('Usage: private-backup.mjs upload <archive> <object> | download <object> <new-file> | list [production|legacy]');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
