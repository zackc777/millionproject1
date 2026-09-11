import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {"access-control-allow-origin":"*","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization, x-client-info, apikey, content-type"};
const json = (data: unknown, status=200, extra: Record<string,string>={}) => new Response(JSON.stringify(data), {status, headers:{...cors,"content-type":"application/json",...extra}});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  const url = new URL(req.url), action = url.searchParams.get("action") || "";

  if (action === "quote") {
    const symbol = (url.searchParams.get("symbol") || "").trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
    if (!symbol) return json({error:"missing symbol"},400);
    for (const ticker of [`${symbol}.TW`, `${symbol}.TWO`]) {
      try {
        const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1d&interval=1d`, {headers:{"user-agent":"Mozilla/5.0"}});
        if (!r.ok) continue;
        const j = await r.json(), m = j?.chart?.result?.[0]?.meta;
        if (m?.regularMarketPrice != null && m?.chartPreviousClose != null) {
          const price=Number(m.regularMarketPrice), prev=Number(m.chartPreviousClose);
          return json({symbol,price,prev,change:price-prev,pct:prev?(price/prev-1)*100:0,currency:m.currency||"TWD"},200,{"cache-control":"public, max-age=30"});
        }
      } catch (_) {}
    }
    return json({error:"quote_unavailable",symbol},404);
  }

  if (action === "search") {
    const raw=(url.searchParams.get("q")||"").trim(), q=raw.toLowerCase();
    if (!q) return json({results:[]});
    const out: {symbol:string,name:string,asset_type:string}[]=[];
    try {
      const r=await fetch("https://openapi.twse.com.tw/v1/opendata/t187ap03_L",{headers:{"user-agent":"Mozilla/5.0"}});
      if(r.ok){
        const rows=await r.json();
        for(const row of rows){
          const symbol=String(row["公司代號"]??row["有價證券代號"]??row["證券代號"]??"").trim();
          const name=String(row["公司名稱"]??row["公司簡稱"]??row["有價證券名稱"]??"").trim();
          if(!symbol||!name) continue;
          if(symbol.toLowerCase()===q||name.toLowerCase().includes(q)) out.push({symbol,name,asset_type:"上市個股"});
          if(out.length>=12) break;
        }
      }
    }catch(_){ }
    const known:[string,string,string][]=[["0050","元大台灣50","ETF"],["006208","富邦台50","ETF"],["00713","元大台灣高息低波","ETF"],["00878","國泰永續高股息","ETF"],["00919","群益台灣精選高息","ETF"],["00929","復華台灣科技優息","ETF"],["00980A","野村臺灣智慧優選主動式","主動式ETF"],["2330","台積電","上市個股"],["2454","聯發科","上市個股"],["2308","台達電","上市個股"],["2317","鴻海","上市個股"],["2382","廣達","上市個股"]];
    for(const [symbol,name,asset_type] of known) if(symbol.toLowerCase()===q||name.toLowerCase().includes(q)) out.push({symbol,name,asset_type});
    const seen=new Set<string>();
    return json({results:out.filter(x=>!seen.has(x.symbol)&&seen.add(x.symbol)).slice(0,12)},200,{"cache-control":"public, max-age=300"});
  }
  return json({ok:true,service:"investment-board",version:5});
});
