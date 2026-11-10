/** Local-only browser rehearsal of a previously cached canonical -> old 301.
 * Run: node --import tsx scripts/rehearse-host-redirect.ts /tmp/redirect-mode.txt
 * Write "before" to that file, open http://127.0.0.1:3189/transactions?month=2026-11,
 * then write "cutover" and click "Visit original bookmark" on the old page.
 * Server output proves whether the browser reused its cached redirect. No
 * Supabase, provider credentials, DNS changes or live app calls are involved.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { legacyOriginResponse } from '../src/lib/deployment/legacy-origin';
const stateFile = process.argv[2];
if (!stateFile) throw Error('Explicit local rehearsal state file required');
const escape = (text: string) => text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
for (const port of [3188,3189]) {
  createServer(async (request,response) => {
    try {
      const mode = readFileSync(stateFile,'utf8').trim();
      if (!['before','cutover'].includes(mode)) throw Error('Invalid rehearsal state');
      const path = request.url || '/';
      if (port===3189 && mode==='before') {
        response.writeHead(301,{ Location: 'http://127.0.0.1:3188'+path, 'Cache-Control':'public, max-age=86400', 'Content-Length':'0' });response.end();
      } else if (port===3188 && mode==='cutover') {
        // Use the actual retirement handler, then map only its known canonical
        // destination to the isolated local server for this browser exercise.
        const result = await legacyOriginResponse(new NextRequest('https://budget-app-one-lime.vercel.app'+path,{method:request.method}), 'https://everydollarbudget.app');
        if (!result) throw Error('Expected retirement response');
        const headers = Object.fromEntries(result.headers);
        if (headers.location) {
          const destination = new URL(headers.location);
          if (destination.origin !== 'https://everydollarbudget.app') throw Error('Unexpected destination');
          headers.location = 'http://127.0.0.1:3189'+destination.pathname+destination.search;
        }
        response.writeHead(result.status,headers);response.end(await result.text());
      } else {
        const title = port===3188 ? 'Old hosting simulation' : 'New hosting reached';
        response.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
        response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font:20px system-ui;padding:2rem"><h1>${title}</h1><p>Isolated migration rehearsal. No budget data is used.</p><p>Path: ${escape(path)}</p><a href="http://127.0.0.1:3189${escape(path)}">Visit original bookmark</a></body></html>`);
      }
      console.log(JSON.stringify({port,mode,method:request.method,path,status:response.statusCode}));
    } catch {
      response.writeHead(503,{'Cache-Control':'no-store'});response.end('Rehearsal unavailable');
    }
  }).listen(port,'127.0.0.1');
}
