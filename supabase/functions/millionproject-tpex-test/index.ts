import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(async()=>{
  try{
    const r=await fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes',{headers:{'accept':'application/json','user-agent':'millionproject/1.0'}});
    const text=await r.text();
    let first:any=null;let count=0;
    try{const j=JSON.parse(text);count=Array.isArray(j)?j.length:0;first=Array.isArray(j)?j[0]:j}catch{}
    return new Response(JSON.stringify({status:r.status,count,first,raw:text.slice(0,300)}),{headers:{'Content-Type':'application/json'}})
  }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:String(e)}),{status:500,headers:{'Content-Type':'application/json'}})}
});
