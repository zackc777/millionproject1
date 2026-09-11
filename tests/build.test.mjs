import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runInContext } from 'node:vm';
import { read, harness } from './harness.mjs';

const root=new URL('../',import.meta.url);
const sha=value=>createHash('sha256').update(value).digest('hex');
execFileSync(process.execPath,['scripts/build.mjs'],{cwd:root});

test('建置只載入固定同源模組；manifest、SRI、HTML 指紋一致',()=>{
  const html=read('dist/index.html'),release=JSON.parse(read('dist/release.json'));
  const baseline=JSON.parse(read('docs/baseline/release.json'));
  assert.equal(release.repository,'zackc777/millionproject1');
  assert.equal(release.mode,'github-source');assert.equal(release.modules.length,13);
  assert.equal(release.htmlSha256,sha(html));
  assert.doesNotMatch(html,/millionproject-remote-update-loader|functions\/v1\/millionproject-patch|\(0,eval\)/);
  assert.deepEqual(release.modules.slice(4).map(x=>x.source),baseline.modules.map(x=>x.path));
  let previous=-1;
  for(const module of release.modules){
    assert.match(module.url,/^\/assets\/[a-z-]+\.[a-f0-9]{16}\.js$/);
    const code=read('dist'+module.url);
    assert.equal(sha(code),module.sha256);assert.equal(code,read(module.source));
    assert.equal(module.integrity,'sha256-'+createHash('sha256').update(code).digest('base64'));
    const position=html.indexOf('src="'+module.url+'"');assert.ok(position>previous);previous=position;
    assert.doesNotMatch(code,/\beval\s*\(|\(0,eval\)|new Function\s*\(/);
  }
  assert.ok(html.lastIndexOf('init();')>previous,'Initialize only after the fixed modules');
  const config=JSON.parse(read('vercel.json'));
  assert.equal(config.outputDirectory,'dist');assert.equal(config.buildCommand,'npm run build');
});
test('sidebar、手機導覽、icons、投資核心與投資 guard 保持原始正式 response',()=>{
  const baseline=JSON.parse(read('docs/baseline/release.json'));
  for(const name of ['shell','icons','investment-core','investment-guard']){
    const module=baseline.modules.find(x=>x.name===name);
    assert.equal(sha(read(module.path)),module.sha256,name);
  }
});
test('模組失敗時不啟動應用；完整載入才呼叫 init 一次',()=>{
  const html=read('dist/index.html');
  const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
  const finish=inline.at(-1);
  for(const errors of [[],['missing module']]){
    const h=harness();let initialized=0;
    h.ctx.removeEventListener=()=>{};h.ctx.__MP_BOOT_ERRORS=errors;h.ctx.init=()=>initialized++;
    runInContext(finish,h.ctx);
    assert.equal(initialized,errors.length?0:1);
    if(errors.length)assert.match(h.ctx.document.body.innerHTML,/頁面載入不完整/);
    else assert.equal(h.ctx.MILLIONPROJECT_RELEASE_READY,true);
  }
});
