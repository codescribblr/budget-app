import { readFile } from 'node:fs/promises';
import { verifyCloudSupabaseKey } from './cloud-config.mjs';
const config=JSON.parse(await readFile('.cloud-build.json','utf8'));
await verifyCloudSupabaseKey(config,process.env.CLOUD_TARGET);
console.log('Validated Cloud Panel environment, staging isolation and public API key');
