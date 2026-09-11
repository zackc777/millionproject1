import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(async (_req: Request) => {
  try {
    const r = await fetch('https://jypukgxllsilctsmfxmw.supabase.co/functions/v1/millionproject-patch?check=' + Date.now(), {cache:'no-store'});
    const code = await r.text();
    if (!r.ok) return new Response(JSON.stringify({ok:false,status:r.status,body:code.slice(0,200)}), {status:500,headers:{'content-type':'application/json'}});
    new Function(code);
    return new Response(JSON.stringify({ok:true,status:r.status,length:code.length,hasUI25:code.includes('UI-25')}), {headers:{'content-type':'application/json'}});
  } catch (e) {
    return new Response(JSON.stringify({ok:false,error:String(e)}), {status:500,headers:{'content-type':'application/json'}});
  }
});
