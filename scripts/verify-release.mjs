import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const [address,commit,manifestPath='dist/release.json']=process.argv.slice(2);
if(!address||!/^[0-9a-f]{40}$/.test(commit||''))throw new Error('Usage: node scripts/verify-release.mjs URL FULL_COMMIT_SHA [local release.json]');
const base=new URL(address);
if(!['https:','http:'].includes(base.protocol))throw new Error('Expected an HTTP(S) deployment URL');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const expected=JSON.parse(await readFile(manifestPath,'utf8'));
assert.equal(expected.commit,commit,'Build the expected commit first');
async function get(path,type){
  const url=new URL(path,base);url.searchParams.set('release_check',commit);
  const response=await fetch(url,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,`${path}: HTTP ${response.status}`);
  assert.match(response.headers.get('content-type')||'',type,`${path}: unexpected response type`);
  return Buffer.from(await response.arrayBuffer());
}
const actual=JSON.parse((await get('/release.json',/application\/json/)).toString());
assert.deepEqual(actual,expected,'Deployment manifest differs from the local build');
assert.equal(actual.repository,'zackc777/millionproject1');assert.equal(actual.mode,'github-source');
const html=await get('/',/text\/html/);
assert.equal(hash(html),expected.htmlSha256,'Production HTML does not match this build');
assert.ok(!html.includes('millionproject-remote-update-loader'));
for(const module of expected.modules){
  assert.match(module.url,/^\/assets\/[a-z-]+\.[a-f0-9]{16}\.js$/);
  const data=await get(module.url,/(?:application|text)\/javascript/);
  assert.equal(hash(data),module.sha256,`${module.source}: content differs`);
}
console.log(`Verified ${base.origin}: ${commit}, ${expected.modules.length} module responses and HTML match the local build.`);
console.log('Browser layout, authenticated CRUD and database behavior are separate release gates.');
