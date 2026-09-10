import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Script } from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const sha = data => createHash('sha256').update(data).digest('hex');
const order = JSON.parse(await readFile(path.join(root, 'src/runtime/order.json')));
const files = ['src/card-model.js', 'src/card-service.js', ...order.map(n => `src/runtime/${n}.js`)];
const commit = process.env.VERCEL_GIT_COMMIT_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
let html = await readFile(path.join(root, 'index.html'), 'utf8');
const loader = /<script id="millionproject-remote-update-loader">[\s\S]*?<\/script>/g;
if ([...html.matchAll(loader)].length !== 1 || !html.includes('\ninit();\n</script>')) throw new Error('Unexpected base HTML: review before building');
html = html.replace(loader, '').replace('\ninit();\n</script>', '\n</script>');
for (const [i, script] of [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].entries()) {
  new Script(script[1], { filename: `index.html:inline-${i}` });
}
await rm(path.join(root, 'dist'), { recursive: true, force: true });
await mkdir(path.join(root, 'dist/assets'), { recursive: true });
const modules = [];
for (const file of files) {
  const code = await readFile(path.join(root, file));
  new Script(code.toString('utf8'), { filename: file });
  const hash = sha(code), name = `${path.basename(file, '.js')}.${hash.slice(0,16)}.js`;
  await writeFile(path.join(root, 'dist/assets', name), code);
  modules.push({ source: file, url: `/assets/${name}`, sha256: hash,
    integrity: `sha256-${createHash('sha256').update(code).digest('base64')}` });
}
const release = { repository: 'zackc777/millionproject1', commit, mode: 'github-source', modules };
const releaseId = sha(JSON.stringify(release)).slice(0,16);
release.releaseId = releaseId;
const start = `<script>window.MILLIONPROJECT_RELEASE=${JSON.stringify(release)};window.__MP_BOOT_ERRORS=[];window.__MP_BOOT_ERROR_HANDLER=e=>window.__MP_BOOT_ERRORS.push(e.message||'Script load failed');window.addEventListener('error',window.__MP_BOOT_ERROR_HANDLER);</script>`;
const tags = modules.map(m => `<script src="${m.url}" integrity="${m.integrity}" crossorigin="anonymous" onerror="window.__MP_BOOT_ERRORS.push('${m.source}')"></script>`).join('\n');
const finish = `<script>
window.removeEventListener('error',window.__MP_BOOT_ERROR_HANDLER);
if(window.__MP_BOOT_ERRORS.length){
  document.body.innerHTML='<main id="mp-boot-failure" class="card" role="alert"><h2>頁面載入不完整</h2><p>請重新整理後再操作。</p><button class="btn main" onclick="location.reload()">重新整理</button></main>';
  const style=document.createElement('style');style.textContent='body>*:not(#mp-boot-failure){display:none!important}';document.head.appendChild(style);
  for(const type of ['click','submit','keydown'])document.addEventListener(type,e=>{if(!e.target.closest('#mp-boot-failure')){e.preventDefault();e.stopImmediatePropagation()}},true);
}else{window.MILLIONPROJECT_RELEASE_READY=true;init();}
</script>`;
html = html.replace('</body>', `${start}\n${tags}\n${finish}\n</body>`);
if (/functions\/v1\/millionproject-patch|\(0,eval\)/.test(html)) throw new Error('Remote executable loader remains');
await writeFile(path.join(root, 'dist/index.html'), html);
await writeFile(path.join(root, 'dist/release.json'), JSON.stringify({ ...release, htmlSha256: sha(html) }, null, 2)+'\n');
console.log(`Built ${releaseId}: ${modules.length} fixed scripts; no remote executable loader`);
