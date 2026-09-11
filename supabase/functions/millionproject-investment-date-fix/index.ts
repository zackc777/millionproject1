import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS"};
const JS=`window.MILLIONPROJECT_INVESTMENT_DATE_FIX_VERSION="investment-date-fix-37";
(()=>{
  if(window.__MP_INVESTMENT_DATE_FIX37)return;
  window.__MP_INVESTMENT_DATE_FIX37=true;
  const clampDate=v=>{
    const m=String(v||'').match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
    if(!m)return v;
    const y=+m[1],mo=+m[2],d=+m[3];
    const last=new Date(Date.UTC(y,mo,0)).getUTCDate();
    return String(y).padStart(4,'0')+'-'+String(mo).padStart(2,'0')+'-'+String(Math.min(d,last)).padStart(2,'0');
  };
  const wrapBuilder=obj=>new Proxy(obj,{get(target,prop,receiver){
    const val=Reflect.get(target,prop,receiver);
    if(prop==='then'&&typeof val==='function')return val.bind(target);
    if(typeof val!=='function')return val;
    return (...args)=>{
      if(prop==='lte'&&args[0]==='trade_date'&&typeof args[1]==='string')args[1]=clampDate(args[1]);
      const out=val.apply(target,args);
      return out&&typeof out==='object'?wrapBuilder(out):out;
    };
  }});
  const original=window.mpInvestmentPortfolio||window.portfolio;
  if(typeof original!=='function')return;
  const fixed=async function(){
    if(typeof c==='undefined'||!c||typeof c.from!=='function')return original.apply(this,arguments);
    const oldFrom=c.from;
    c.from=function(table){
      const out=oldFrom.call(c,table);
      return table==='investment_transactions'?wrapBuilder(out):out;
    };
    try{return await original.apply(this,arguments)}finally{c.from=oldFrom}
  };
  window.mpInvestmentPortfolio=fixed;
  window.portfolio=fixed;
  try{portfolio=fixed}catch(_){}
  setTimeout(()=>{let t='';try{t=tab}catch(_){}if(t==='p')fixed()},80);
})();`;
Deno.serve((req:Request)=>req.method==='OPTIONS'?new Response('ok',{headers:cors}):new Response(JS,{headers:{...cors,"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-store, max-age=0"}}));