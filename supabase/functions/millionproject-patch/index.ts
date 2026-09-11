import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS"};
const JS=`window.MILLIONPROJECT_REMOTE_PATCH_VERSION="loader-36-investment-crud";
(async()=>{
  const base="https://jypukgxllsilctsmfxmw.supabase.co/functions/v1/";
  const mods=["millionproject-quality","millionproject-features","millionproject-cards","millionproject-shell","millionproject-runtime","millionproject-icons","millionproject-card-guard","millionproject-investment-core","millionproject-investment-guard"];
  for(const m of mods){
    try{
      const r=await fetch(base+m+"?v=36&ts="+Date.now(),{cache:"no-store"});
      if(!r.ok)throw new Error(m+" "+r.status);
      const code=await r.text();
      (0,eval)(code);
    }catch(e){console.error("millionproject module failed",m,e)}
  }
})();`;
Deno.serve((req:Request)=>req.method==='OPTIONS'?new Response('ok',{headers:cors}):new Response(JS,{headers:{...cors,"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-store, max-age=0"}}));