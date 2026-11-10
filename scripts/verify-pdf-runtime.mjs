import assert from 'node:assert/strict';
import { readFile, realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, sep } from 'node:path';

// Exercise the deployed dependency, not the development node_modules tree.
const root = await realpath(resolve(process.argv[2] || '.next/standalone'));
const build = JSON.parse(await readFile('.next/required-server-files.json', 'utf8'));
assert.ok(build.config.serverExternalPackages?.includes('pdf-parse'), 'The PDF engine must remain external to the Next bundle');
const runtimeRequire = createRequire(resolve(root, 'package.json'));
const libraryPath = await realpath(runtimeRequire.resolve('pdf-parse/lib/pdf-parse.js'));
assert.ok(libraryPath.startsWith(root + sep), 'The standalone artifact must contain its PDF engine');
const parse = runtimeRequire(libraryPath);
const fixture = await readFile(new URL('./fixtures/pdf-import-synthetic.pdf', import.meta.url));
const parsed = await parse(new Uint8Array(fixture));
assert.equal(parsed.numpages, 1);
for (const text of ['PDF TEST GROCER', '-12.34', 'PDF TEST BOOKSTORE', '-8.90', 'PDF TEST PAYROLL', '250.00', 'PDF TEST CAFE', '-4.56']) {
  assert.ok(parsed.text.includes(text), 'Standalone PDF extraction lost synthetic statement content');
}
console.log('Standalone PDF engine extracted all four synthetic transactions');
