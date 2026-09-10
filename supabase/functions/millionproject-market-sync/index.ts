import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"GET, POST, OPTIONS"
};

function rocToIso(s:string){
  const raw=String(s||"").trim();
  if(!/^\d{7}$/.test(raw)) return null;
  return `${Number(raw.slice(0,3))+1911}-${raw.slice(3,5)}-${raw.slice(5,7)}`;
}
function adToIso(s:string){
  const raw=String(s||"").trim();
  if(!/^\d{8}$/.test(raw)) return null;
  return `${raw.slice(0,4)}-${raw.slice(4,6)}-${raw.slice(6,8)}`;
}
function num(v:any){
  const n=Number(String(v??'').replace(/,/g,'').trim());
  return Number.isFinite(n)&&n>0?n:null;
}
function taiwanClock(){
  const d=new Date(Date.now()+8*60*60*1000);
  return {date:d.toISOString().slice(0,10),hm:d.toISOString().slice(11,16)};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
  try{
    const url=Deno.env.get('SUPABASE_URL');
    const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!key) throw new Error('Missing Supabase service credentials');
    const sb=createClient(url,key,{auth:{persistSession:false}});

    const [pRes,rRes,planRes]=await Promise.all([
      sb.from('portfolio').select('id,symbol,quantity'),
      sb.from('research_assets').select('id,symbol'),
      sb.from('investment_plans').select('id,symbol,status')
    ]);
    for(const r of [pRes,rRes,planRes]) if(r.error) throw r.error;

    const wanted=new Set<string>();
    for(const x of pRes.data||[]) if(x.symbol) wanted.add(String(x.symbol).trim().toUpperCase());
    for(const x of rRes.data||[]) if(x.symbol) wanted.add(String(x.symbol).trim().toUpperCase());
    for(const x of planRes.data||[]) if(x.symbol && x.status!=='ended') wanted.add(String(x.symbol).trim().toUpperCase());
    if(wanted.size===0) return new Response(JSON.stringify({ok:true,synced:0,message:'No symbols to sync'}),{headers:{...cors,'Content-Type':'application/json'}});

    const twseUrl='https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL';
    const tpexUrl='https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes';
    const [twseResp,tpexResp]=await Promise.all([
      fetch(twseUrl,{headers:{accept:'application/json','user-agent':'millionproject/1.0'}}),
      fetch(tpexUrl,{headers:{accept:'application/json','user-agent':'millionproject/1.0'}})
    ]);
    if(!twseResp.ok) throw new Error(`TWSE ${twseResp.status}`);
    if(!tpexResp.ok) throw new Error(`TPEX ${tpexResp.status}`);
    const [twse,tpex]=await Promise.all([twseResp.json(),tpexResp.json()]);
    if(!Array.isArray(twse)||!Array.isArray(tpex)) throw new Error('Unexpected market response');

    const bySymbol=new Map<string,any>();
    const marketMap=new Map<string,string>();
    for(const row of twse){
      const symbol=String(row.Code||'').trim().toUpperCase(); if(!wanted.has(symbol)) continue;
      marketMap.set(symbol,'TWSE');
      const px=num(row.ClosingPrice), priceDate=rocToIso(String(row.Date||''));
      if(!px||!priceDate) continue;
      bySymbol.set(symbol,{symbol,market:'TWSE',name:String(row.Name||'').trim()||null,close_price:px,price_date:priceDate,price_status:'official_close',source_time:null,source:'TWSE OpenAPI',source_url:twseUrl,updated_at:new Date().toISOString()});
    }
    for(const row of tpex){
      const symbol=String(row.SecuritiesCompanyCode||'').trim().toUpperCase(); if(!wanted.has(symbol)) continue;
      marketMap.set(symbol,'TPEX');
      if(bySymbol.has(symbol)) continue;
      const px=num(row.Close), priceDate=rocToIso(String(row.Date||''));
      if(!px||!priceDate) continue;
      bySymbol.set(symbol,{symbol,market:'TPEX',name:String(row.CompanyName||'').trim()||null,close_price:px,price_date:priceDate,price_status:'official_close',source_time:null,source:'TPEX OpenAPI',source_url:tpexUrl,updated_at:new Date().toISOString()});
    }

    // After the market has closed, TWSE/TPEX daily batch files can still lag behind.
    // In that gap, use the exchange MIS last traded price for *today* and mark it provisional.
    const tw=taiwanClock();
    let provisionalUsed=0;
    if(tw.hm>='13:35'){
      const channels=[...wanted].map(symbol=>{
        const m=marketMap.get(symbol);
        return m==='TPEX'?`otc_${symbol}.tw`:m==='TWSE'?`tse_${symbol}.tw`:null;
      }).filter(Boolean) as string[];
      if(channels.length){
        const misUrl='https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch='+encodeURIComponent(channels.join('|'))+'&json=1&delay=0';
        try{
          const misResp=await fetch(misUrl,{headers:{accept:'application/json,text/plain,*/*','user-agent':'millionproject/1.0'}});
          if(misResp.ok){
            let text=await misResp.text();
            const a=text.indexOf('{'),b=text.lastIndexOf('}');
            if(a>=0&&b>a) text=text.slice(a,b+1);
            const mis=JSON.parse(text);
            for(const row of (mis?.msgArray||[])){
              const symbol=String(row.c||'').trim().toUpperCase();
              if(!wanted.has(symbol)) continue;
              const misDate=adToIso(String(row.d||''));
              const last=num(row.z);
              const current=bySymbol.get(symbol);
              if(misDate!==tw.date||!last) continue;
              if(current?.price_date===tw.date) continue; // official daily close already available
              const market=String(row.ex||'').toLowerCase()==='otc'?'TPEX':'TWSE';
              bySymbol.set(symbol,{symbol,market,name:String(row.n||current?.name||'').trim()||null,close_price:last,price_date:misDate,price_status:'provisional_close',source_time:String(row.t||row.ot||'13:30:00'),source:`${market} MIS`,source_url:misUrl,updated_at:new Date().toISOString()});
              provisionalUsed++;
            }
          }
        }catch(e){console.warn('MIS fallback failed',e)}
      }
    }

    const rows=[...bySymbol.values()];
    if(rows.length){
      const up=await sb.from('market_prices').upsert(rows,{onConflict:'symbol'});
      if(up.error) throw up.error;
    }

    let portfolioUpdated=0,researchUpdated=0;
    for(const p of pRes.data||[]){
      const quote=bySymbol.get(String(p.symbol||'').trim().toUpperCase()); if(!quote) continue;
      const q=Number(p.quantity||0);
      const r=await sb.from('portfolio').update({current_price:quote.close_price,current_value:q*quote.close_price,as_of_date:quote.price_date,updated_at:new Date().toISOString()}).eq('id',p.id);
      if(r.error) throw r.error; portfolioUpdated++;
    }
    for(const a of rRes.data||[]){
      const quote=bySymbol.get(String(a.symbol||'').trim().toUpperCase()); if(!quote) continue;
      const r=await sb.from('research_assets').update({latest_price:quote.close_price,as_of_date:quote.price_date,updated_at:new Date().toISOString()}).eq('id',a.id);
      if(r.error) throw r.error; researchUpdated++;
    }

    const missing=[...wanted].filter(s=>!bySymbol.has(s));
    const latestDate=rows.map(x=>x.price_date).sort().at(-1)||null;
    return new Response(JSON.stringify({ok:true,source:['TWSE OpenAPI','TPEX OpenAPI','TWSE/TPEX MIS fallback'],latest_date:latestDate,synced:rows.length,provisional:provisionalUsed,portfolio_updated:portfolioUpdated,research_updated:researchUpdated,missing}),{headers:{...cors,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:e instanceof Error?e.message:String(e)}),{status:500,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
  }
});
