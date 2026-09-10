import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const html = await Deno.readTextFile(new URL('./app.html', import.meta.url));
Deno.serve(()=>new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}}));