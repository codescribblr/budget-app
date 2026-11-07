import { readFile } from 'node:fs/promises';
import { validateCloudConfig } from './cloud-config.mjs';
const config=JSON.parse(await readFile('.cloud-build.json','utf8'));
validateCloudConfig(config,process.env.CLOUD_TARGET);
console.log('Validated Cloud Panel environment and staging isolation');
