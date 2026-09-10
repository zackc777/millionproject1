import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS"};
const JS=`window.MILLIONPROJECT_INVESTMENT_GUARD_VERSION="investment-guard-38";
(()=>{
 if(window.__MP_INV_GUARD38)return;window.__MP_INV_GUARD38=true;
 const oldAdd=window.addFinanceEntry,oldEdit=window.editFinanceEntry,oldDelete=window.deleteFinanceEntry;
 async function getEntry(id){try{const {data,error}=await c.from('finance_entries').select('*').eq('user_id',u.id).eq('id',id).maybeSingle();if(error)throw error;return data}catch(e){console.warn(e);return null}}
 window.addFinanceEntry=async()=>{
   const type=document.getElementById('et')?.value;
   if(type!=='investment')return typeof oldAdd==='function'?oldAdd():null;
   const date=document.getElementById('ed')?.value||new Date().toISOString().slice(0,10),amount=+(document.getElementById('ea')?.value||0),note=document.getElementById('en')?.value||'',cat=document.getElementById('ec')?.value||'核心ETF';
   if(typeof openInvestmentBuy!=='function')return alert('投資交易模組尚未載入');
   openInvestmentBuy({date,amount:amount||'',strategy:String(cat).includes('ETF')?cat:'核心ETF',notes:note});
 };
 window.editFinanceEntry=async id=>{
   const x=await getEntry(id);if(!x)return;
   if(x.entry_type!=='investment')return typeof oldEdit==='function'?oldEdit(id):null;
   const {data:tx,error}=await c.from('investment_transactions').select('id').eq('user_id',u.id).eq('finance_entry_id',id).maybeSingle();if(error)return alert('讀取投資交易失敗：'+error.message);
   if(tx?.id&&typeof mpInvEditTrade==='function')return mpInvEditTrade(tx.id);
   if(typeof mpInvRepairLegacy==='function')return mpInvRepairLegacy(id);
 };
 window.deleteFinanceEntry=async id=>{
   const x=await getEntry(id);if(!x)return;
   if(x.entry_type!=='investment')return typeof oldDelete==='function'?oldDelete(id):null;
   const {data:tx,error}=await c.from('investment_transactions').select('id').eq('user_id',u.id).eq('finance_entry_id',id).maybeSingle();if(error)return alert('讀取投資交易失敗：'+error.message);
   if(tx?.id&&typeof mpInvDeleteTrade==='function')return mpInvDeleteTrade(tx.id);
   if(typeof mpInvDeleteLegacy==='function')return mpInvDeleteLegacy(id);
 };
 try{addFinanceEntry=window.addFinanceEntry;editFinanceEntry=window.editFinanceEntry;deleteFinanceEntry=window.deleteFinanceEntry}catch(_){}
})();
(()=>{
  if(window.__MP_INV_DATE_FIX38)return;window.__MP_INV_DATE_FIX38=true;
  const clampDate=v=>{const m=String(v||'').match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);if(!m)return v;const y=+m[1],mo=+m[2],d=+m[3],last=new Date(Date.UTC(y,mo,0)).getUTCDate();return String(y).padStart(4,'0')+'-'+String(mo).padStart(2,'0')+'-'+String(Math.min(d,last)).padStart(2,'0')};
  const wrapBuilder=obj=>new Proxy(obj,{get(target,prop,receiver){const val=Reflect.get(target,prop,receiver);if(prop==='then'&&typeof val==='function')return val.bind(target);if(typeof val!=='function')return val;return (...args)=>{if(prop==='lte'&&args[0]==='trade_date'&&typeof args[1]==='string')args[1]=clampDate(args[1]);const out=val.apply(target,args);return out&&typeof out==='object'?wrapBuilder(out):out}}});
  async function polish38(){
    const plan=document.querySelector('.month-plan');if(plan){plan.style.display='block';plan.style.gridTemplateColumns='1fr';}
    const card=document.querySelector('.mp35-market');if(!card||typeof c==='undefined'||typeof u==='undefined'||!c||!u)return;
    try{
      const {data:holds,error:hErr}=await c.from('portfolio').select('symbol').eq('user_id',u.id);if(hErr)throw hErr;
      const syms=[...new Set((holds||[]).map(x=>String(x.symbol||'').trim().toUpperCase()).filter(Boolean))];if(!syms.length)return;
      const {data:prices,error:pErr}=await c.from('market_prices').select('symbol,price_date,price_status,source,source_time').in('symbol',syms).order('price_date',{ascending:false});if(pErr)throw pErr;
      if(!(prices||[]).length)return;
      const latestDate=(prices||[]).map(x=>String(x.price_date||'')).sort().at(-1)||'';
      const latest=(prices||[]).filter(x=>String(x.price_date||'')===latestDate);
      const provisional=latest.some(x=>x.price_status==='provisional_close');
      const time=latest.find(x=>x.source_time)?.source_time||'13:30:00';
      const tiny=card.querySelector('.tiny');
      if(tiny)tiny.innerHTML=provisional?'<b>今日盤後暫定</b> · '+latestDate+' '+time+' 最後成交價 · 官方日收盤批次發布後自動轉為正式收盤':'<b>官方正式收盤</b> · '+latestDate+' · TWSE / TPEX 日行情';
      const head=card.querySelector('.split > div');
      if(head&&!head.querySelector('.mp38-market-pill')){const p=document.createElement('span');p.className='pill '+(provisional?'watch':'buy')+' mp38-market-pill';p.textContent=provisional?'盤後暫定':'正式收盤';p.style.marginTop='6px';head.appendChild(p)}else if(head){const p=head.querySelector('.mp38-market-pill');if(p){p.className='pill '+(provisional?'watch':'buy')+' mp38-market-pill';p.textContent=provisional?'盤後暫定':'正式收盤'}}
    }catch(e){console.warn('investment polish',e)}
  }
  window.mpInvestmentPolish=polish38;
  const original=window.mpInvestmentPortfolio||window.portfolio;
  if(typeof original!=='function')return;
  const fixed=async function(){if(typeof c==='undefined'||!c||typeof c.from!=='function'){const r=await original.apply(this,arguments);await polish38();return r}const oldFrom=c.from;c.from=function(table){const out=oldFrom.call(c,table);return table==='investment_transactions'?wrapBuilder(out):out};let result;try{result=await original.apply(this,arguments)}finally{c.from=oldFrom}await polish38();return result};
  window.mpInvestmentPortfolio=fixed;window.portfolio=fixed;try{portfolio=fixed}catch(_){}
  const st=document.createElement('style');st.id='mp-investment38-style';st.textContent='.month-plan{display:block!important;grid-template-columns:1fr!important}.month-plan>.card{width:100%!important;min-width:0}.month-plan .smart-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.mp35-market .split{align-items:center}.mp38-market-pill{display:inline-flex}@media(max-width:900px){.month-plan .smart-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}.mp35-txn{grid-template-columns:58px 80px minmax(0,1fr) minmax(150px,auto)!important}}@media(max-width:680px){.month-plan .smart-grid{grid-template-columns:1fr!important}.mp35-market .split{align-items:flex-start}.mp35-market .split>button{flex:0 0 auto}.mp35-txn{grid-template-columns:52px 70px minmax(0,1fr)!important}.mp35-txn>.amt{grid-column:2/-1!important;text-align:left!important}.mp35-txn>.amt .actions{justify-content:flex-start!important}}';document.head.appendChild(st);
  setTimeout(()=>{let t='';try{t=tab}catch(_){}if(t==='p')fixed()},60);
})();`;
Deno.serve((req:Request)=>req.method==='OPTIONS'?new Response('ok',{headers:cors}):new Response(JS,{headers:{...cors,"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-store, max-age=0"}}));