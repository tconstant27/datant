import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Card from '../components/Card'
import ChampionIcon from '../components/ChampionIcon'
import MapReplay, { chrono, type ParticipantCarte, type TimelineCompacte } from '../components/MapReplay'
import { useDDragon, useNomsObjets } from '../lib/ddragon'
import { fmt, ROLES } from '../lib/stats'
import { supabase } from '../lib/supabase'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Brut = any

const LIBELLE_SOURCE: Record<string, string> = { soloq: 'SoloQ', scrim: 'Scrim', official: 'Officiel' }
const NOM_CAMP: Record<number, string> = { 100: 'Côté bleu', 200: 'Côté rouge' }

function Image({
  src,
  nom,
  taille,
  rond = false,
}: {
  src: string | undefined
  nom: string
  taille: number
  rond?: boolean
}) {
  const style = { width: taille, height: taille }
  if (!src) return <span style={style} className="inline-block shrink-0 rounded bg-active" aria-hidden="true" />
  return (
    <img
      src={src}
      alt={nom}
      title={nom}
      width={taille}
      height={taille}
      loading="lazy"
      style={style}
      className={`shrink-0 border border-line-strong object-cover ${rond ? 'rounded-full' : 'rounded'}`}
    />
  )
}

export default function PartiePage() {
  const { id } = useParams()
  const dd = useDDragon()
  const nomsObjets = useNomsObjets()
  const [partie, setPartie] = useState<{ source: string; played_at: string; patch: string; raw: Brut } | null>(null)
  const [timeline, setTimeline] = useState<TimelineCompacte | null>(null)
  const [nosPuuids, setNosPuuids] = useState<Set<string>>(new Set())
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!id) return
    ;(async () => {
      const [m, tl, nous] = await Promise.all([
        supabase.from('matches').select('source, played_at, patch, raw').eq('id', id).maybeSingle(),
        supabase.from('match_timelines').select('data').eq('match_id', id).maybeSingle(),
        supabase.from('players').select('puuid, teams!inner(is_ours)').eq('teams.is_ours', true),
      ])
      if (m.error || !m.data) return setErreur(m.error?.message ?? 'Partie introuvable')
      setPartie(m.data)
      setTimeline((tl.data?.data as TimelineCompacte) ?? null)
      setNosPuuids(new Set((nous.data ?? []).map((p: { puuid: string | null }) => p.puuid ?? '')))
    })()
  }, [id])

  const info = partie?.raw?.info
  const participants: Brut[] = useMemo(() => info?.participants ?? [], [info])
  const moi = participants.find((p) => nosPuuids.has(p.puuid))
  const maxDegats = Math.max(1, ...participants.map((p) => p.totalDamageDealtToChampions ?? 0))
  const pourCarte: ParticipantCarte[] = participants.map((p) => ({
    id: p.participantId,
    side: p.teamId,
    champion: p.championName,
    nom: p.riotIdGameName ?? '',
    nous: nosPuuids.has(p.puuid),
  }))

  if (erreur) return <p className="text-sm text-warn">Erreur : {erreur}</p>
  if (!partie || !info) return <p className="text-sm text-muted">Chargement de la partie…</p>

  const duree = info.gameDuration as number

  return (
    <>
      <div className="flex flex-col gap-3">
        <Link to="/joueurs" className="text-sm no-underline">
          ← Retour aux joueurs
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs tracking-widest text-muted uppercase">
              {LIBELLE_SOURCE[partie.source]} · patch {partie.patch} ·{' '}
              {new Date(partie.played_at).toLocaleString('fr-FR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <h1 className="m-0 flex flex-wrap items-center gap-3 font-display text-3xl font-bold">
              {moi && (
                <span className={moi.win ? 'text-accent-soft' : 'text-warn'}>{moi.win ? 'Victoire' : 'Défaite'}</span>
              )}
              <span className="text-text-2">{chrono(duree * 1000)}</span>
            </h1>
          </div>
          {moi && (
            <div className="flex items-center gap-3 rounded-xl border border-line-strong bg-surface px-4 py-3">
              <ChampionIcon champion={moi.championName} taille={44} />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{moi.riotIdGameName}</span>
                <span className="text-xs text-muted">
                  {dd.nom(moi.championName)} · {moi.kills}/{moi.deaths}/{moi.assists}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Carte interactive */}
      <Card titre="Replay sur la carte">
        {timeline ? (
          <MapReplay timeline={timeline} participants={pourCarte} />
        ) : (
          <p className="m-0 text-sm text-muted">
            Les positions de cette partie ne sont pas encore en base. Clique sur « Actualiser » dans la page Joueurs
            pour les récupérer.
          </p>
        )}
      </Card>

      {/* Les deux équipes */}
      {[100, 200].map((camp) => {
        const equipe = info.teams.find((t: Brut) => t.teamId === camp)
        const joueurs = participants.filter((p) => p.teamId === camp)
        const kills = joueurs.reduce((n: number, p: Brut) => n + p.kills, 0)
        const obj = equipe?.objectives ?? {}
        return (
          <section
            key={camp}
            aria-label={NOM_CAMP[camp]}
            className={`flex flex-col gap-3 rounded-xl border bg-surface p-4 md:p-5 ${
              camp === 100 ? 'border-accent/35' : 'border-warn/35'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-bold text-bg ${camp === 100 ? 'bg-accent' : 'bg-warn'}`}
                >
                  {NOM_CAMP[camp]}
                </span>
                <span className="font-display text-xl font-bold">{equipe?.win ? 'Victoire' : 'Défaite'}</span>
                <span className="text-sm text-muted">{kills} kills</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-text-2">
                <span>Tours {obj.tower?.kills ?? 0}</span>
                <span>Dragons {obj.dragon?.kills ?? 0}</span>
                <span>Larves {obj.horde?.kills ?? 0}</span>
                <span>Hérauts {obj.riftHerald?.kills ?? 0}</span>
                <span>Barons {obj.baron?.kills ?? 0}</span>
                <span className="flex items-center gap-1">
                  Bans
                  {(equipe?.bans ?? [])
                    .filter((b: Brut) => b.championId > 0)
                    .map((b: Brut) => {
                      const champ = dd.idDepuisCle(b.championId)
                      return champ ? (
                        <ChampionIcon key={b.pickTurn} champion={champ} taille={22} className="grayscale" />
                      ) : null
                    })}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-2 py-2 font-medium">Joueur</th>
                    <th className="px-2 py-2 font-medium">KDA</th>
                    <th className="px-2 py-2 font-medium">Dégâts</th>
                    <th className="px-2 py-2 font-medium">CS</th>
                    <th className="px-2 py-2 font-medium">Or</th>
                    <th className="px-2 py-2 font-medium">Vision</th>
                    <th className="px-2 py-2 font-medium">Objets</th>
                  </tr>
                </thead>
                <tbody>
                  {joueurs.map((p: Brut) => {
                    const cs = p.totalMinionsKilled + p.neutralMinionsKilled
                    const s1 = dd.sort(p.summoner1Id)
                    const s2 = dd.sort(p.summoner2Id)
                    const cle = dd.rune(p.perks?.styles?.[0]?.selections?.[0]?.perk)
                    const sec = dd.rune(p.perks?.styles?.[1]?.style)
                    const nous = nosPuuids.has(p.puuid)
                    return (
                      <tr key={p.participantId} className={`border-t border-line ${nous ? 'bg-active' : ''}`}>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <ChampionIcon champion={p.championName} taille={40} />
                              <span className="absolute -right-1 -bottom-1 rounded bg-bg px-1 text-[10px] font-bold">
                                {p.champLevel}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <Image src={s1?.src} nom={s1?.nom ?? 'Sort'} taille={18} />
                              <Image src={s2?.src} nom={s2?.nom ?? 'Sort'} taille={18} />
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <Image src={cle?.src} nom={cle?.nom ?? 'Rune'} taille={20} rond />
                              <Image src={sec?.src} nom={sec?.nom ?? 'Arbre secondaire'} taille={14} rond />
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className={`truncate font-semibold ${nous ? 'text-accent-soft' : ''}`}>
                                {p.riotIdGameName}
                              </span>
                              <span className="text-xs text-muted">
                                {ROLES[p.teamPosition] ?? ''} · {dd.nom(p.championName)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col">
                            <span className="font-semibold">
                              {p.kills}/<span className="text-warn">{p.deaths}</span>/{p.assists}
                            </span>
                            <span className="text-xs text-muted">
                              {fmt((p.kills + p.assists) / Math.max(1, p.deaths), 2)} ·{' '}
                              {kills ? Math.round((100 * (p.kills + p.assists)) / kills) : 0} % KP
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex w-28 flex-col gap-1">
                            <span>{(p.totalDamageDealtToChampions ?? 0).toLocaleString('fr-FR')}</span>
                            <div className="h-1.5 overflow-hidden rounded-full bg-line">
                              <div
                                className={`h-full rounded-full ${camp === 100 ? 'bg-accent' : 'bg-warn'}`}
                                style={{ width: `${(100 * (p.totalDamageDealtToChampions ?? 0)) / maxDegats}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col">
                            <span>{cs}</span>
                            <span className="text-xs text-muted">{fmt(cs / (duree / 60), 1)}/min</span>
                          </div>
                        </td>
                        <td className="px-2 py-2">{(p.goldEarned ?? 0).toLocaleString('fr-FR')}</td>
                        <td className="px-2 py-2">
                          <div className="flex flex-col">
                            <span>{p.visionScore}</span>
                            <span className="text-xs text-muted">{p.wardsPlaced} wards</span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                              const objet = p[`item${i}`] as number
                              return (
                                <Image
                                  key={i}
                                  src={objet ? dd.objet(objet) : undefined}
                                  nom={objet ? (nomsObjets[objet] ?? `Objet ${objet}`) : 'Emplacement vide'}
                                  taille={26}
                                  rond={i === 6}
                                />
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )
      })}
    </>
  )
}
