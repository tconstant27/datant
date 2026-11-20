-- Datant : schéma de la base (étape 2)
-- À coller dans Supabase › SQL Editor › New query, puis « Run ».

-- Comptes autorisés à voir l'outil (toi, le coach, les joueurs)
create table app_users (
  email text primary key,
  created_at timestamptz not null default now()
);

create or replace function is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from app_users where email = auth.jwt() ->> 'email');
$$;

-- Équipes : la nôtre et les adversaires
create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_ours boolean not null default false,
  created_at timestamptz not null default now()
);

-- Joueurs suivis (les nôtres et les adversaires scoutés)
create table players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete set null,
  display_name text not null,
  role text check (role in ('TOP','JUNGLE','MIDDLE','BOTTOM','UTILITY')),
  game_name text not null,
  tag_line text not null,
  puuid text unique,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (game_name, tag_line)
);

-- Parties : SoloQ (API Riot), scrims et officiels (collecteur)
create table matches (
  id text primary key,                     -- ex. EUW1_7000000000 ou id de partie perso
  source text not null check (source in ('soloq','scrim','official')),
  played_at timestamptz not null,
  duration_s integer not null,
  patch text,
  queue_id integer,
  opponent_team_id uuid references teams(id) on delete set null,
  our_side integer check (our_side in (100, 200)),  -- 100 = bleu, 200 = rouge
  our_win boolean,
  notes text,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index on matches (source, played_at desc);

create table match_timelines (
  match_id text primary key references matches(id) on delete cascade,
  data jsonb not null
);

-- Une ligne par équipe et par partie (objectifs)
create table match_teams (
  match_id text references matches(id) on delete cascade,
  side integer check (side in (100, 200)),
  win boolean not null,
  first_blood boolean,
  first_tower boolean,
  first_dragon boolean,
  first_baron boolean,
  dragons integer, barons integer, towers integer, heralds integer, grubs integer,
  bans text[],
  primary key (match_id, side)
);

-- Une ligne par joueur et par partie
create table match_participants (
  match_id text references matches(id) on delete cascade,
  participant_id integer,
  puuid text,
  riot_id text,
  side integer check (side in (100, 200)),
  position text,
  champion text not null,
  win boolean not null,
  kills integer, deaths integer, assists integer,
  cs integer, gold integer,
  damage_to_champions integer,
  vision_score integer,
  wards_placed integer,
  -- valeurs à 10 et 15 min, calculées depuis la timeline
  gold_10 integer, cs_10 integer, xp_10 integer,
  gold_15 integer, cs_15 integer, xp_15 integer,
  primary key (match_id, participant_id)
);
create index on match_participants (puuid);

-- Notes du staff
create table coach_goals (
  player_id uuid primary key references players(id) on delete cascade,
  text text not null default '',
  updated_at timestamptz not null default now()
);

create table scouting_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  vod_url text,
  text text not null default '',
  created_at timestamptz not null default now()
);

-- Sécurité : seuls les membres listés dans app_users lisent et écrivent.
-- Les imports automatiques passent par la clé serveur, qui n'est pas concernée.
do $$
declare t text;
begin
  foreach t in array array['app_users','teams','players','matches','match_timelines',
                           'match_teams','match_participants','coach_goals','scouting_notes']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "membres" on %I for all to authenticated using (is_member()) with check (is_member())', t);
  end loop;
end $$;
