-- Vue utilisée par le site : une ligne par joueur suivi et par partie,
-- avec les écarts face au vis-à-vis (même poste, équipe adverse).
-- security_invoker : la vue respecte les règles d'accès (RLS) de l'utilisateur connecté.
create or replace view v_player_games with (security_invoker = true) as
select
  p.id as player_id, p.display_name, p.role,
  m.id as match_id, m.source, m.played_at, m.duration_s, m.patch,
  mp.champion, mp.win, mp.kills, mp.deaths, mp.assists, mp.cs, mp.gold,
  mp.damage_to_champions, mp.vision_score, mp.wards_placed,
  mp.cs_10 - o.cs_10 as csd_10, mp.gold_10 - o.gold_10 as gd_10,
  mp.cs_15 - o.cs_15 as csd_15, mp.gold_15 - o.gold_15 as gd_15, mp.xp_15 - o.xp_15 as xpd_15,
  o.champion as opp_champion,
  (select sum(t.kills) from match_participants t where t.match_id = mp.match_id and t.side = mp.side) as team_kills
from players p
join match_participants mp on mp.puuid = p.puuid
join matches m on m.id = mp.match_id
left join lateral (
  select * from match_participants o
  where o.match_id = mp.match_id and o.side <> mp.side and o.position = mp.position
  limit 1
) o on true;

-- is_member() n'est utile qu'aux utilisateurs connectés
revoke execute on function public.is_member() from public, anon;
grant execute on function public.is_member() to authenticated;
