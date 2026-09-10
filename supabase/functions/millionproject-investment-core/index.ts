import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { browserPatch } from "./payload.ts";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"GET, OPTIONS"};
const src=browserPatch.toString();
const JS=src.slice(src.indexOf('{')+1,src.lastIndexOf('}'));
Deno.serve((req:Request)=>req.method==='OPTIONS'?new Response('ok',{headers:cors}):new Response(JS,{headers:{...cors,"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-store, max-age=0"}}));