import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS"};
const JS=`window.MILLIONPROJECT_CARD_GUARD_VERSION='cardguard-33';
(()=>{
  if(window.__MP_CARDGUARD33)return; window.__MP_CARDGUARD33=true;
  const pad=n=>String(n).padStart(2,'0');
  const localYmd=(d=new Date())=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const parse=s=>new Date(String(s).slice(0,10)+'T12:00:00');
  const dim=(y,m)=>new Date(y,m+1,0).getDate();
  const dm=(y,m,day)=>new Date(y,m,Math.min(Math.max(1,+day||1),dim(y,m)));
  const cycleEnd=(date,day)=>{const d=parse(date),e=dm(d.getFullYear(),d.getMonth(),day);return d<=e?e:dm(d.getFullYear(),d.getMonth()+1,day)};
  const dueFor=(end,day)=>dm(end.getFullYear(),end.getMonth()+1,day);
  const short=d=>(d.getMonth()+1)+'/'+d.getDate();
  const futureMsg='實際金流不能使用未來日期。若是尚未發生的固定帳單，請先放在「固定責任／預算」，實際付款時再記錄。';
  const css='#mpcc-cycle-preview{margin-top:10px;padding:11px 13px;border:1px solid #dbe7ff;background:#f4f8ff;border-radius:13px;color:#334155;font-size:12px;line-height:1.55}#mpcc-cycle-preview b{color:#1d4ed8}#mpcc-cycle-preview.warn{border-color:#fed7aa;background:#fff7ed;color:#9a3412}#mpcc-cycle-preview.warn b{color:#c2410c}';
  const st=document.createElement('style');st.id='mp-cardguard-style';st.textContent=css;document.head.appendChild(st);
  async function cardByIssuer(issuer){try{if(typeof c==='undefined'||typeof u==='undefined'||!c||!u)return null;const {data}=await c.from('credit_cards').select('issuer,statement_day,due_day,status').eq('user_id',u.id).eq('issuer',issuer).maybeSingle();return data||null}catch{return null}}
  async function preview(){
    const dateEl=document.getElementById('mpcc-date'),cardEl=document.getElementById('mpcc-card');if(!dateEl||!cardEl)return;
    const today=localYmd();dateEl.max=today;
    let box=document.getElementById('mpcc-cycle-preview');if(!box){box=document.createElement('div');box.id='mpcc-cycle-preview';const form=dateEl.closest('.entry-form');if(form)form.insertAdjacentElement('afterend',box);else dateEl.parentElement?.appendChild(box)}
    const d=dateEl.value,issuer=cardEl.value;if(!d||!issuer){box.textContent='選擇日期與卡片後，這裡會顯示帳單歸屬。';return}
    const card=await cardByIssuer(issuer);if(!card){box.textContent='找不到這張卡的結帳設定。';return}
    const ce=cycleEnd(d,+card.statement_day||1),due=dueFor(ce,+card.due_day||1),isFuture=d>today;
    box.classList.toggle('warn',isFuture);
    box.innerHTML=(isFuture?'<b>未來日期：</b>這筆目前不屬於已發生支出。<br>':'')+'<b>帳單歸屬：</b>'+short(ce)+' 結帳 → '+short(due)+' 繳款'+(isFuture?'<br>實際發生後再記錄，月支出與信用卡帳單才會一致。':'');
  }
  function setDateGuards(){const today=localYmd();['mpcc-date','mp31-date','mp28-date'].forEach(id=>{const el=document.getElementById(id);if(el)el.max=today});preview()}
  const oldCardSpend=window.mpAddCardSpend;if(typeof oldCardSpend==='function'&&!oldCardSpend.__mpGuard33){const w=async function(){const d=document.getElementById('mpcc-date')?.value;if(d&&d>localYmd())return alert(futureMsg);return oldCardSpend.apply(this,arguments)};w.__mpGuard33=true;window.mpAddCardSpend=w}
  const oldQuickSave=window.mp31Save;if(typeof oldQuickSave==='function'&&!oldQuickSave.__mpGuard33){const w=async function(){const d=document.getElementById('mp31-date')?.value;if(d&&d>localYmd())return alert(futureMsg);return oldQuickSave.apply(this,arguments)};w.__mpGuard33=true;window.mp31Save=w}
  document.addEventListener('change',e=>{if(e.target?.id==='mpcc-date'||e.target?.id==='mpcc-card')preview()},true);
  const obs=new MutationObserver(()=>{if(document.getElementById('mpcc-date')||document.getElementById('mp31-date'))requestAnimationFrame(setDateGuards)});const app=document.getElementById('app');if(app)obs.observe(app,{childList:true,subtree:true});setTimeout(setDateGuards,100);
})();`;
Deno.serve((req:Request)=>req.method==='OPTIONS'?new Response('ok',{headers:cors}):new Response(JS,{headers:{...cors,"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-store, max-age=0"}}));