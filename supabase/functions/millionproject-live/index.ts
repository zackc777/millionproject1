import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const BASE = "https://millionproject1.vercel.app/";
const SUPABASE_URL = "https://jypukgxllsilctsmfxmw.supabase.co";
const PUBLISHABLE = "sb_publishable_u7KFH6kyuuJZies_avPwug_TXWnb6A8";

Deno.serve(async (_req: Request) => {
  try {
    const ts = Date.now();
    const baseRes = await fetch(`${BASE}?mp_live=${ts}`, {
      headers: { "cache-control": "no-cache", "pragma": "no-cache" },
      redirect: "follow",
    });
    if (!baseRes.ok) {
      return new Response(`Base fetch failed: ${baseRes.status}`, {
        status: 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    let html = await baseRes.text();

    const patchRes = await fetch(`${SUPABASE_URL}/functions/v1/millionproject-patch?ts=${ts}`, {
      headers: { apikey: PUBLISHABLE, Authorization: `Bearer ${PUBLISHABLE}` },
      redirect: "follow",
    });
    const patch = patchRes.ok ? await patchRes.text() : "";

    const marker = `<script>window.MILLIONPROJECT_LIVE_PROXY=true;window.MILLIONPROJECT_LIVE_AT='${new Date().toISOString()}';</script>`;
    const patchTag = patch ? `<script>${patch.replaceAll("</script>", "<\\/script>")}</script>` : "";
    const injected = `${marker}${patchTag}`;
    html = html.includes("</body>") ? html.replace("</body>", `${injected}</body>`) : `${html}${injected}`;

    const blob = new Blob([html], { type: "text/html;charset=UTF-8" });
    return new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Content-Disposition": "inline; filename=\"millionproject.html\"",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Content-Type-Options": "nosniff",
        "X-Millionproject-Live": "2",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return new Response(`millionproject live error: ${e instanceof Error ? e.message : String(e)}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});
