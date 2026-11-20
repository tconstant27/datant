// Types et calculs de stats à partir de la vue v_player_games

export type Source = 'soloq' | 'scrim' | 'official'

export type Partie = {
  player_id: string
  match_id: string
  source: Source
  played_at: string
  duration_s: number
  champion: string
  opp_champion: string | null
  win: boolean
  kills: number
  deaths: number
  assists: number
  cs: number
  damage_to_champions: number
  vision_score: number
  csd_15: number | null
  gd_15: number | null
  team_kills: number | null
}

export type Joueur = {
  id: string
  display_name: string
  role: string | null
  game_name: string
  tag_line: string
  profile_icon: number | null
  rank_tier: string | null
  rank_division: string | null
  rank_lp: number | null
  rank_wins: number | null
  rank_losses: number | null
  last_synced_at: string | null
}

const TIERS: Record<string, string> = {
  IRON: 'Fer', BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or', PLATINUM: 'Platine',
  EMERALD: 'Émeraude', DIAMOND: 'Diamant', MASTER: 'Maître', GRANDMASTER: 'Grand Maître', CHALLENGER: 'Challenger',
}

export function libelleRang(j: Joueur): string {
  if (!j.rank_tier) return 'Non classé'
  const apex = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(j.rank_tier)
  return `${TIERS[j.rank_tier] ?? j.rank_tier}${apex ? '' : ' ' + (j.rank_division ?? '')} · ${j.rank_lp ?? 0} LP`
}

export const ROLES: Record<string, string> = {
  TOP: 'TOP',
  JUNGLE: 'JGL',
  MIDDLE: 'MID',
  BOTTOM: 'ADC',
  UTILITY: 'SUP',
}

export const ORDRE_ROLES = ['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']

const moyenne = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const somme = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export type Resume = {
  parties: number
  winrate: number | null
  kda: number | null
  csd15: number | null
  gd15: number | null
  kp: number | null
  dpm: number | null
  visionMin: number | null
  csMin: number | null
}

export function resumer(parties: Partie[]): Resume {
  const n = parties.length
  if (!n) {
    return { parties: 0, winrate: null, kda: null, csd15: null, gd15: null, kp: null, dpm: null, visionMin: null, csMin: null }
  }
  const minutes = somme(parties.map((p) => p.duration_s)) / 60
  const kpParties = parties.filter((p) => p.team_kills && p.team_kills > 0)
  const d15 = parties.filter((p) => p.csd_15 !== null)
  return {
    parties: n,
    winrate: (100 * parties.filter((p) => p.win).length) / n,
    kda: (somme(parties.map((p) => p.kills)) + somme(parties.map((p) => p.assists))) / Math.max(1, somme(parties.map((p) => p.deaths))),
    csd15: moyenne(d15.map((p) => p.csd_15!)),
    gd15: moyenne(d15.map((p) => p.gd_15!)),
    kp: kpParties.length ? 100 * moyenne(kpParties.map((p) => (p.kills + p.assists) / p.team_kills!))! : null,
    dpm: somme(parties.map((p) => p.damage_to_champions)) / minutes,
    visionMin: somme(parties.map((p) => p.vision_score)) / minutes,
    csMin: somme(parties.map((p) => p.cs)) / minutes,
  }
}

export type LigneChampion = { champion: string; parties: number; winrate: number; kda: number }

export function poolChampions(parties: Partie[]): LigneChampion[] {
  const groupes = new Map<string, Partie[]>()
  for (const p of parties) groupes.set(p.champion, [...(groupes.get(p.champion) ?? []), p])
  return [...groupes.entries()]
    .map(([champion, ps]) => {
      const r = resumer(ps)
      return { champion, parties: ps.length, winrate: r.winrate ?? 0, kda: r.kda ?? 0 }
    })
    .sort((a, b) => b.parties - a.parties || b.winrate - a.winrate)
}

// Mise en forme à la française
const nf = (decimales: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })

export function fmt(v: number | null, decimales = 0, signe = false): string {
  if (v === null || Number.isNaN(v)) return '—'
  const s = nf(decimales).format(v)
  return signe && v > 0 ? `+${s}` : s
}

export const fmtPct = (v: number | null) => (v === null ? '—' : `${fmt(v)} %`)
