// Datant : import des parties SoloQ de nos joueurs depuis l'API Riot.
// Fonction Supabase (Edge Function). Secrets nécessaires : RIOT_API_KEY et IMPORT_SECRET.
// Appel : POST avec l'en-tête  x-import-secret: <IMPORT_SECRET>
// (ou, plus tard depuis le site, avec la session d'un membre de l'équipe).

import { createClient } from 'npm:@supabase/supabase-js@2'

const RIOT_KEY = Deno.env.get('RIOT_API_KEY') ?? ''
const IMPORT_SECRET = Deno.env.get('IMPORT_SECRET') ?? ''
const REGION = 'https://europe.api.riotgames.com' // routage régional (comptes, parties)
const PLATFORM = 'https://euw1.api.riotgames.com' // serveur EUW (rang)
const QUEUE_SOLOQ = 420
const MATCHES_PER_PLAYER = 10 // parties récupérées par joueur et par passage

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Appel à l'API Riot avec gestion de la limite de débit (429)
async function riot(path: string, essais = 3, hote = REGION): Promise<any> {
  const res = await fetch(hote + path, { headers: { 'X-Riot-Token': RIOT_KEY } })
  if (res.status === 429 && essais > 0) {
    await sleep((Number(res.headers.get('Retry-After')) || 5) * 1000)
    return riot(path, essais - 1, hote)
  }
  if (!res.ok) throw new Error(`Riot ${res.status} sur ${path.split('?')[0]}`)
  return res.json()
}

// Noms des champions à partir de leur id (pour les bans), via Data Dragon
async function champions(): Promise<Record<number, string>> {
  const versions = await (await fetch('https://ddragon.leagueoflegends.com/api/versions.json')).json()
  const data = await (
    await fetch(`https://ddragon.leagueoflegends.com/cdn/${versions[0]}/data/fr_FR/champion.json`)
  ).json()
  const map: Record<number, string> = {}
  for (const c of Object.values<any>(data.data)) map[Number(c.key)] = c.name
  return map
}

async function autorise(req: Request): Promise<boolean> {
  if (IMPORT_SECRET && req.headers.get('x-import-secret') === IMPORT_SECRET) return true
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  if (!token) return false
  const { data } = await db.auth.getUser(token)
  if (!data.user?.email) return false
  const { data: membre } = await db.from('app_users').select('email').eq('email', data.user.email).maybeSingle()
  return !!membre
}

// Valeurs à une minute donnée (or, CS, XP) depuis la timeline
function aLaMinute(timeline: any, minute: number, pid: number) {
  const frame = timeline.info.frames[minute]
  const p = frame?.participantFrames?.[String(pid)]
  if (!p) return { gold: null, cs: null, xp: null }
  return { gold: p.totalGold, cs: p.minionsKilled + p.jungleMinionsKilled, xp: p.xp }
}

async function importerPartie(matchId: string, puuidJoueur: string, noms: Record<number, string>) {
  const match = await riot(`/lol/match/v5/matches/${matchId}`)
  const timeline = await riot(`/lol/match/v5/matches/${matchId}/timeline`)
  const info = match.info
  const moi = info.participants.find((p: any) => p.puuid === puuidJoueur)
  if (moi?.profileIcon !== undefined) {
    await db.from('players').update({ profile_icon: moi.profileIcon }).eq('puuid', puuidJoueur)
  }

  const { error: e1 } = await db.from('matches').upsert({
    id: matchId,
    source: 'soloq',
    played_at: new Date(info.gameStartTimestamp ?? info.gameCreation).toISOString(),
    duration_s: info.gameDuration,
    patch: String(info.gameVersion ?? '').split('.').slice(0, 2).join('.'),
    queue_id: info.queueId,
    our_side: moi?.teamId ?? null,
    our_win: moi?.win ?? null,
    raw: match,
  })
  if (e1) throw e1

  const equipes = info.teams.map((t: any) => ({
    match_id: matchId,
    side: t.teamId,
    win: t.win,
    first_blood: t.objectives?.champion?.first ?? null,
    first_tower: t.objectives?.tower?.first ?? null,
    first_dragon: t.objectives?.dragon?.first ?? null,
    first_baron: t.objectives?.baron?.first ?? null,
    dragons: t.objectives?.dragon?.kills ?? null,
    barons: t.objectives?.baron?.kills ?? null,
    towers: t.objectives?.tower?.kills ?? null,
    heralds: t.objectives?.riftHerald?.kills ?? null,
    grubs: t.objectives?.horde?.kills ?? null,
    bans: (t.bans ?? []).filter((b: any) => b.championId > 0).map((b: any) => noms[b.championId] ?? String(b.championId)),
  }))
  const { error: e2 } = await db.from('match_teams').upsert(equipes)
  if (e2) throw e2

  const joueurs = info.participants.map((p: any) => {
    const m10 = aLaMinute(timeline, 10, p.participantId)
    const m15 = aLaMinute(timeline, 15, p.participantId)
    return {
      match_id: matchId,
      participant_id: p.participantId,
      puuid: p.puuid,
      riot_id: p.riotIdGameName ? `${p.riotIdGameName}#${p.riotIdTagline}` : null,
      side: p.teamId,
      position: p.teamPosition || null,
      champion: p.championName,
      win: p.win,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      cs: p.totalMinionsKilled + p.neutralMinionsKilled,
      gold: p.goldEarned,
      damage_to_champions: p.totalDamageDealtToChampions,
      vision_score: p.visionScore,
      wards_placed: p.wardsPlaced,
      gold_10: m10.gold, cs_10: m10.cs, xp_10: m10.xp,
      gold_15: m15.gold, cs_15: m15.cs, xp_15: m15.xp,
    }
  })
  const { error: e3 } = await db.from('match_participants').upsert(joueurs)
  if (e3) throw e3
}

Deno.serve(async (req) => {
  if (!RIOT_KEY) return Response.json({ erreur: 'Secret RIOT_API_KEY manquant' }, { status: 500 })
  if (!(await autorise(req))) return Response.json({ erreur: 'Non autorisé' }, { status: 401 })

  const { data: equipe } = await db.from('teams').select('id').eq('is_ours', true)
  const ids = (equipe ?? []).map((t) => t.id)
  const { data: joueurs, error } = await db.from('players').select('*').in('team_id', ids)
  if (error) return Response.json({ erreur: error.message }, { status: 500 })

  const noms = await champions()
  const bilan: any[] = []

  for (const j of joueurs ?? []) {
    const ligne: any = { joueur: j.display_name, nouvelles: 0, erreurs: [] as string[] }
    try {
      // 1. Riot ID -> PUUID (une seule fois)
      let puuid = j.puuid
      if (!puuid) {
        const compte = await riot(
          `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(j.game_name)}/${encodeURIComponent(j.tag_line)}`,
        )
        puuid = compte.puuid
        await db.from('players').update({ puuid }).eq('id', j.id)
      }

      // 2. Rang SoloQ (sans bloquer l'import en cas d'échec)
      try {
        const entrees: any[] = await riot(`/lol/league/v4/entries/by-puuid/${puuid}`, 3, PLATFORM)
        const solo = entrees.find((e) => e.queueType === 'RANKED_SOLO_5x5')
        await db.from('players').update({
          rank_tier: solo?.tier ?? null,
          rank_division: solo?.rank ?? null,
          rank_lp: solo?.leaguePoints ?? null,
          rank_wins: solo?.wins ?? null,
          rank_losses: solo?.losses ?? null,
        }).eq('id', j.id)
      } catch (e) {
        ligne.erreurs.push(`rang : ${(e as Error).message}`)
      }

      // 3. Dernières parties SoloQ, sans celles déjà en base
      const idsRiot: string[] = await riot(
        `/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=${QUEUE_SOLOQ}&count=${MATCHES_PER_PLAYER}`,
      )
      const { data: dejaLa } = await db.from('matches').select('id').in('id', idsRiot)
      const connus = new Set((dejaLa ?? []).map((m) => m.id))

      // 4. Import des nouvelles parties
      // de la plus ancienne à la plus récente : l'icône de profil finale est la plus récente
      for (const id of idsRiot.filter((id) => !connus.has(id)).reverse()) {
        try {
          await importerPartie(id, puuid, noms)
          ligne.nouvelles++
        } catch (e) {
          ligne.erreurs.push(`${id} : ${(e as Error).message}`)
        }
      }
      await db.from('players').update({ last_synced_at: new Date().toISOString() }).eq('id', j.id)
    } catch (e) {
      ligne.erreurs.push((e as Error).message)
    }
    bilan.push(ligne)
  }

  return Response.json({ ok: true, bilan })
})
