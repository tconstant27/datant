import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import ChampionIcon from '../components/ChampionIcon'
import { useDDragon } from '../lib/ddragon'
import { supabase } from '../lib/supabase'
import {
  fmt,
  fmtPct,
  libelleRang,
  ORDRE_ROLES,
  poolChampions,
  resumer,
  ROLES,
  type Joueur,
  type Partie,
  type Resume,
} from '../lib/stats'

const LIBELLE_SOURCE: Record<string, string> = { soloq: 'SoloQ', scrim: 'Scrim', official: 'Officiel' }
const FILTRES = [
  { id: 'tout', label: 'Tout' },
  { id: 'equipe', label: 'Scrims + officiels' },
  { id: 'soloq', label: 'SoloQ' },
] as const
type Filtre = (typeof FILTRES)[number]['id']

// signe : la couleur dépend du signe de la valeur (bleu = avance, orange = retard)
const INDICATEURS: {
  label: string
  valeur: (r: Resume) => number | null
  texte: (r: Resume) => string
  signe?: boolean
}[] = [
  { label: 'Winrate', valeur: (r) => r.winrate, texte: (r) => fmtPct(r.winrate) },
  { label: 'KDA', valeur: (r) => r.kda, texte: (r) => fmt(r.kda, 2) },
  { label: 'Écart CS à 15 min', valeur: (r) => r.csd15, texte: (r) => fmt(r.csd15, 1, true), signe: true },
  { label: 'Écart d’or à 15 min', valeur: (r) => r.gd15, texte: (r) => fmt(r.gd15, 0, true), signe: true },
  { label: 'Participation kills', valeur: (r) => r.kp, texte: (r) => fmtPct(r.kp) },
  { label: 'Dégâts / min', valeur: (r) => r.dpm, texte: (r) => fmt(r.dpm) },
  { label: 'Vision / min', valeur: (r) => r.visionMin, texte: (r) => fmt(r.visionMin, 2) },
  { label: 'CS / min', valeur: (r) => r.csMin, texte: (r) => fmt(r.csMin, 1) },
]

const couleurSigne = (v: number | null) => (v === null || v === 0 ? '' : v > 0 ? 'text-accent-soft' : 'text-warn')

function Segmente<T extends string>({
  options,
  valeur,
  onChange,
  label,
}: {
  options: readonly { id: T; label: string }[]
  valeur: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valeur === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-10 cursor-pointer rounded-lg border-0 px-3.5 text-sm transition-colors ${
            valeur === o.id
              ? 'bg-accent font-semibold text-bg'
              : 'bg-transparent font-medium text-text-2 hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function IconeProfil({ joueur, taille }: { joueur: Joueur; taille: number }) {
  const dd = useDDragon()
  const src = dd.profil(joueur.profile_icon)
  return src ? (
    <img
      src={src}
      alt=""
      width={taille}
      height={taille}
      style={{ width: taille, height: taille }}
      className="shrink-0 rounded-full border-2 border-line-strong object-cover"
    />
  ) : (
    <span
      style={{ width: taille, height: taille }}
      className="flex shrink-0 items-center justify-center rounded-full bg-active font-display font-bold text-accent-soft"
      aria-hidden="true"
    >
      {joueur.display_name.slice(0, 1)}
    </span>
  )
}

export default function JoueursPage() {
  const dd = useDDragon()
  const [joueurs, setJoueurs] = useState<Joueur[]>([])
  const [selection, setSelection] = useState<string | null>(null)
  const [parties, setParties] = useState<Partie[]>([])
  const [filtre, setFiltre] = useState<Filtre>('tout')
  const [objectif, setObjectif] = useState('')
  const [etatObjectif, setEtatObjectif] = useState<'' | 'enregistre' | 'erreur'>('')
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [actualisation, setActualisation] = useState<'' | 'en_cours' | string>('')
  const [version, setVersion] = useState(0) // incrémentée pour recharger les données

  // Nos joueurs
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('players')
        .select(
          'id, display_name, role, game_name, tag_line, profile_icon, rank_tier, rank_division, rank_lp, rank_wins, rank_losses, last_synced_at, teams!inner(is_ours)',
        )
        .eq('teams.is_ours', true)
      if (error) return setErreur(error.message)
      const liste = (data as unknown as Joueur[]).sort(
        (a, b) => ORDRE_ROLES.indexOf(a.role ?? '') - ORDRE_ROLES.indexOf(b.role ?? ''),
      )
      setJoueurs(liste)
      setSelection((s) => s ?? liste[0]?.id ?? null)
      if (!liste.length) setChargement(false)
    })()
  }, [version])

  // Parties et objectif du joueur sélectionné
  useEffect(() => {
    if (!selection) return
    ;(async () => {
      setChargement(true)
      setEtatObjectif('')
      const [p, g] = await Promise.all([
        supabase.from('v_player_games').select('*').eq('player_id', selection).order('played_at', { ascending: false }),
        supabase.from('coach_goals').select('text').eq('player_id', selection).maybeSingle(),
      ])
      if (p.error) setErreur(p.error.message)
      setParties((p.data ?? []) as Partie[])
      setObjectif(g.data?.text ?? '')
      setChargement(false)
    })()
  }, [selection, version])

  // Lance l'import SoloQ depuis le site (session du membre connecté)
  const actualiser = async () => {
    setActualisation('en_cours')
    const { data, error } = await supabase.functions.invoke('import-soloq', { method: 'POST' })
    if (error || !data?.ok) {
      setActualisation(`Échec de l'actualisation${data?.erreur ? ' : ' + data.erreur : ''}`)
      return
    }
    const bilan = data.bilan as { nouvelles: number; erreurs: string[] }[]
    const nouvelles = bilan.reduce((n, b) => n + b.nouvelles, 0)
    const erreurs = bilan.flatMap((b) => b.erreurs)
    setActualisation(
      erreurs.length
        ? `${nouvelles} nouvelle(s) partie(s), ${erreurs.length} erreur(s) : ${erreurs[0]}`
        : nouvelles
          ? `${nouvelles} nouvelle(s) partie(s) importée(s)`
          : 'Déjà à jour',
    )
    setVersion((v) => v + 1)
  }

  const joueur = joueurs.find((j) => j.id === selection)
  const filtrees = useMemo(
    () =>
      parties.filter((p) =>
        filtre === 'tout' ? true : filtre === 'soloq' ? p.source === 'soloq' : p.source !== 'soloq',
      ),
    [parties, filtre],
  )
  const resumeEquipe = useMemo(() => resumer(parties.filter((p) => p.source !== 'soloq')), [parties])
  const resumeSoloq = useMemo(() => resumer(parties.filter((p) => p.source === 'soloq')), [parties])
  const pool = useMemo(() => poolChampions(filtrees), [filtrees])
  const championFetiche = poolChampions(parties)[0]?.champion
  const dernieres = filtrees.slice(0, 10)
  const barres = [...dernieres].reverse()
  const maxEcart = Math.max(500, ...barres.map((p) => Math.abs(p.gd_15 ?? 0)))

  const enregistrerObjectif = async () => {
    if (!selection) return
    const { error } = await supabase
      .from('coach_goals')
      .upsert({ player_id: selection, text: objectif, updated_at: new Date().toISOString() })
    setEtatObjectif(error ? 'erreur' : 'enregistre')
  }

  if (erreur) {
    return <p className="text-sm text-warn">Erreur de chargement : {erreur}</p>
  }

  const victoires = joueur?.rank_wins ?? 0
  const defaites = joueur?.rank_losses ?? 0

  return (
    <>
      {/* Choix du joueur et filtre */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Choisir un joueur" className="flex flex-wrap gap-2">
          {joueurs.map((j) => (
            <button
              key={j.id}
              type="button"
              aria-pressed={selection === j.id}
              onClick={() => setSelection(j.id)}
              className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full border py-1 pr-4 pl-1 text-sm transition-colors ${
                selection === j.id
                  ? 'border-accent bg-active font-semibold text-text'
                  : 'border-line-strong bg-surface font-medium text-text-2 hover:text-text'
              }`}
            >
              <IconeProfil joueur={j} taille={36} />
              <span>
                <span className="text-xs font-bold text-accent-soft">{ROLES[j.role ?? ''] ?? '—'}</span>{' '}
                {j.display_name}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Segmente label="Type de parties" options={FILTRES} valeur={filtre} onChange={setFiltre} />
          <button
            type="button"
            onClick={actualiser}
            disabled={actualisation === 'en_cours'}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium text-text hover:border-accent disabled:cursor-wait disabled:opacity-60"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={actualisation === 'en_cours' ? 'animate-spin' : ''}
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            {actualisation === 'en_cours' ? 'Import en cours…' : 'Actualiser'}
          </button>
        </div>
      </div>
      {actualisation && actualisation !== 'en_cours' && (
        <p role="status" className="-mt-3 mb-0 text-sm text-text-2">
          {actualisation}
        </p>
      )}

      {/* Bandeau joueur avec le splash art de son champion le plus joué */}
      {joueur && (
        <section className="relative overflow-hidden rounded-2xl border border-line bg-surface">
          {championFetiche && (
            <img
              src={dd.splash(championFetiche)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-[center_20%] opacity-45"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/30" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center gap-5 p-6 md:p-8">
            <div className="relative">
              <IconeProfil joueur={joueur} taille={88} />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-bg">
                {ROLES[joueur.role ?? ''] ?? '—'}
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs tracking-widest text-muted uppercase">Triforce Esport</span>
              <h1 className="m-0 font-display text-4xl font-bold">{joueur.display_name}</h1>
              <span className="text-sm text-text-2">
                {joueur.game_name}
                <span className="text-muted">#{joueur.tag_line}</span>
              </span>
              {joueur.last_synced_at && (
                <span className="text-xs text-muted">
                  Données mises à jour le{' '}
                  {new Date(joueur.last_synced_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 md:ml-auto">
              <div className="flex flex-col gap-1 rounded-xl border border-line-strong bg-bg/70 px-4 py-3">
                <span className="text-xs text-muted">Rang SoloQ</span>
                <span className="font-display text-lg font-bold">{libelleRang(joueur)}</span>
                {joueur.rank_tier && (
                  <span className="text-xs text-muted">
                    {victoires} V · {defaites} D ·{' '}
                    {fmtPct(victoires + defaites ? (100 * victoires) / (victoires + defaites) : null)}
                  </span>
                )}
              </div>
              {championFetiche && (
                <div className="flex items-center gap-3 rounded-xl border border-line-strong bg-bg/70 px-4 py-3">
                  <ChampionIcon champion={championFetiche} taille={40} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted">Le plus joué</span>
                    <span className="font-display text-lg font-bold">{dd.nom(championFetiche)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {chargement ? (
        <p className="text-sm text-muted">Chargement des parties…</p>
      ) : (
        <>
          {/* Indicateurs : matchs d'équipe vs SoloQ */}
          <section aria-label="Indicateurs" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            {INDICATEURS.map((ind) => (
              <div
                key={ind.label}
                className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong"
              >
                <span className="text-sm text-muted">{ind.label}</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span
                      className={`font-display text-2xl font-bold ${ind.signe ? couleurSigne(ind.valeur(resumeEquipe)) : ''}`}
                    >
                      {ind.texte(resumeEquipe)}
                    </span>
                    <span className="text-xs text-muted">Scrims + off.</span>
                  </div>
                  <div className="flex flex-col border-l border-line pl-3">
                    <span
                      className={`font-display text-2xl font-bold ${ind.signe ? couleurSigne(ind.valeur(resumeSoloq)) : 'text-text-2'}`}
                    >
                      {ind.texte(resumeSoloq)}
                    </span>
                    <span className="text-xs text-muted">SoloQ</span>
                  </div>
                </div>
              </div>
            ))}
          </section>
          <p className="-mt-3 mb-0 text-xs text-muted">
            {resumeEquipe.parties} parties d'équipe · {resumeSoloq.parties} parties SoloQ. Les écarts sont calculés face
            au joueur adverse au même poste.
          </p>

          <div className="flex flex-wrap items-start gap-5">
            {/* Écart d'or à 15 min */}
            <Card titre="Écart d’or à 15 min" className="min-w-0 flex-[999_1_480px]">
              {barres.length === 0 ? (
                <p className="m-0 text-sm text-muted">Aucune partie pour ce filtre.</p>
              ) : (
                <>
                  <span className="text-xs text-muted">
                    {barres.length} dernières parties · au-dessus de la ligne : avance sur le vis-à-vis
                  </span>
                  <div
                    role="img"
                    aria-label="Histogramme de l'écart d'or à 15 minutes sur les dernières parties"
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${barres.length}, minmax(0, 1fr))` }}
                  >
                    {barres.map((p) => {
                      const v = p.gd_15 ?? 0
                      const h = `${(Math.abs(v) / maxEcart) * 100}%`
                      return (
                        <div
                          key={p.match_id}
                          className="flex flex-col items-center gap-2"
                          title={`${dd.nom(p.champion)} vs ${p.opp_champion ? dd.nom(p.opp_champion) : '?'} : ${fmt(v, 0, true)} or`}
                        >
                          <div className="flex h-52 w-full flex-col">
                            <div className="flex h-1/2 items-end">
                              {v > 0 && <div className="w-full rounded-t bg-accent" style={{ height: h }} />}
                            </div>
                            <div className="flex h-1/2 items-start border-t border-line-strong">
                              {v < 0 && <div className="w-full rounded-b bg-warn" style={{ height: h }} />}
                            </div>
                          </div>
                          <ChampionIcon
                            champion={p.champion}
                            taille={28}
                            className={p.win ? 'ring-2 ring-accent/70' : 'opacity-70'}
                          />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>plus ancienne</span>
                    <span>icône entourée = victoire</span>
                    <span>plus récente</span>
                  </div>
                </>
              )}
            </Card>

            {/* Pool de champions */}
            <Card titre="Pool de champions" className="min-w-0 flex-[1_1_340px]">
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {pool.map((c) => (
                  <li key={c.champion} className="flex items-center gap-3 rounded-lg bg-input px-3 py-2">
                    <ChampionIcon champion={c.champion} taille={36} />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-semibold">{dd.nom(c.champion)}</span>
                        <span className="text-xs text-muted">
                          {c.parties} p. · KDA {fmt(c.kda, 2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                          <div
                            className={`h-full rounded-full ${c.winrate >= 50 ? 'bg-accent' : 'bg-warn'}`}
                            style={{ width: `${c.winrate}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold">{fmtPct(c.winrate)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Dernières parties */}
          <Card titre="Dernières parties">
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {dernieres.map((p) => (
                <li key={p.match_id}>
                  <Link
                    to={`/partie/${p.match_id}`}
                    aria-label={`Voir le détail de la partie du ${new Date(p.played_at).toLocaleDateString('fr-FR')}`}
                    className={`flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border px-3 py-2.5 text-text no-underline transition-colors hover:border-accent ${
                      p.win ? 'border-accent/30 bg-accent/5' : 'border-warn/30 bg-warn/5'
                    }`}
                  >
                    <div className="flex w-24 flex-col">
                      <span className={`text-sm font-bold ${p.win ? 'text-accent-soft' : 'text-warn'}`}>
                        {p.win ? 'Victoire' : 'Défaite'}
                      </span>
                      <span className="text-xs text-muted">
                        {LIBELLE_SOURCE[p.source]} ·{' '}
                        {new Date(p.played_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChampionIcon champion={p.champion} taille={44} />
                      <span className="text-xs text-muted">vs</span>
                      {p.opp_champion ? (
                        <ChampionIcon champion={p.opp_champion} taille={30} className="opacity-80" />
                      ) : (
                        '?'
                      )}
                    </div>
                    <div className="flex w-24 flex-col">
                      <span className="text-sm font-semibold">
                        {p.kills} / <span className="text-warn">{p.deaths}</span> / {p.assists}
                      </span>
                      <span className="text-xs text-muted">
                        KDA {fmt((p.kills + p.assists) / Math.max(1, p.deaths), 2)}
                      </span>
                    </div>
                    <div className="flex gap-5 text-sm">
                      <div className="flex flex-col">
                        <span className={`font-semibold ${couleurSigne(p.csd_15)}`}>{fmt(p.csd_15, 0, true)}</span>
                        <span className="text-xs text-muted">CS à 15</span>
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-semibold ${couleurSigne(p.gd_15)}`}>{fmt(p.gd_15, 0, true)}</span>
                        <span className="text-xs text-muted">or à 15</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold">{p.cs}</span>
                        <span className="text-xs text-muted">CS</span>
                      </div>
                    </div>
                    <span className="ml-auto flex items-center gap-2 text-xs text-muted">
                      {Math.floor(p.duration_s / 60)}:{String(p.duration_s % 60).padStart(2, '0')}
                      <span aria-hidden="true" className="text-base text-text-2">
                        ›
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* Objectifs du coach */}
          <Card titre="Objectifs du coach">
            <label htmlFor="objectif" className="text-sm text-muted">
              Axes de travail pour les prochaines semaines
            </label>
            <textarea
              id="objectif"
              rows={3}
              value={objectif}
              onChange={(e) => {
                setObjectif(e.target.value)
                setEtatObjectif('')
              }}
              placeholder="Ex. : garder +5 CS à 15 min, warder la jungle adverse avant 6 min."
              className="resize-y rounded-lg border border-line-strong bg-input p-3 text-sm text-text outline-none focus:border-accent"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={enregistrerObjectif}
                className="min-h-11 cursor-pointer rounded-lg border-0 bg-accent px-4 text-sm font-semibold text-bg"
              >
                Enregistrer
              </button>
              {etatObjectif === 'enregistre' && <span className="text-sm text-ok">Enregistré</span>}
              {etatObjectif === 'erreur' && <span className="text-sm text-warn">Échec de l'enregistrement</span>}
            </div>
          </Card>
        </>
      )}
    </>
  )
}
