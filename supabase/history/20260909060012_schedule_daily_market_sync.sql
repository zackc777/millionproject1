do $$
declare j bigint;
begin
  for j in select jobid from cron.job where jobname='millionproject_market_sync' loop
    perform cron.unschedule(j);
  end loop;
end $$;

select cron.schedule(
  'millionproject_market_sync',
  '45 9 * * 1-5',
  $$select extensions.http_get('https://jypukgxllsilctsmfxmw.supabase.co/functions/v1/millionproject-market-sync');$$
);

