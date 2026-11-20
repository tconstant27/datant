-- Import SoloQ automatique chaque jour à 4 h 30 UTC (5 h 30 à Paris en hiver).
-- Prérequis : un secret Vault nommé « import_secret » contenant la même valeur
-- que le secret IMPORT_SECRET de la fonction (Supabase › Integrations › Vault).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'import-soloq-quotidien',
  '30 4 * * *',
  $$
  select net.http_post(
    url := 'https://dyuiznxmwdolbgpgpoxy.supabase.co/functions/v1/import-soloq',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-import-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'import_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
