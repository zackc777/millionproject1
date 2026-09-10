# millionproject1 maintenance

- Work only in `zackc777/millionproject1`. Do not operate on `zackc777/millionproject`.
- Production branch: `main`. Production URL: `https://millionproject1.vercel.app/`.
- Read `docs/HANDOFF.md` and the baseline manifest before changes. Recheck remote main and production before publishing.
- Make incremental changes; preserve desktop sidebar, mobile navigation and all existing modules.
- Prioritize data consistency. Plans are not completed trades. Investment transaction changes must rebuild holdings and costs. Card payment is not another expense.
- Review create/edit/delete-or-disable for every user-created record. Validate desktop and mobile behavior; record gaps accurately.
- A function being ACTIVE or a deployment being READY is not sufficient: check actual response, version/hash, and behavior.
- `supabase/history/` is an exported migration archive. Do not apply it blindly: live schema has drift not represented in all historical migrations.
- Never put user records, service-role keys, private tokens, or secret environment values in this public repository.
- Run the repository's checks before proposing release. Do not hide failed gates or report unperformed tests as passed.
