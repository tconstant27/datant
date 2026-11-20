-- Icône de profil et rang SoloQ des joueurs (remplis par import-soloq)
alter table players
  add column if not exists profile_icon integer,
  add column if not exists rank_tier text,
  add column if not exists rank_division text,
  add column if not exists rank_lp integer,
  add column if not exists rank_wins integer,
  add column if not exists rank_losses integer;
