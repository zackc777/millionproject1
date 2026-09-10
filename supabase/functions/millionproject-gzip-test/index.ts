import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS"};
const B64="H4sIAIrHoGoC/yvPzEvJL9cLcQ0OiXeP8gywVcrPVrIGAHIB4jQWAAAA";
const gz=Uint8Array.from(atob(B64),c=>c.charCodeAt(0));
async function decode(){const ds=new DecompressionStream('gzip');return await new Response(new Blob([gz]).stream().pipeThrough(ds)).text();}
Deno.serve(async(req:Request)=>req.method==='OPTIONS'?new Response('ok',{headers:cors}):new Response(await decode(),{headers:{...cors,"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-store"}}));