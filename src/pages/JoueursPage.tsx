import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'
import {
  fmt,
  fmtPct,
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

const INDICATEURS: { label: string; valeur: (r: Resume) => string }[] = [
  { label: 'Winrate', valeur: (r) => fmtPct(r.winrate) },
  { label: 'KDA', valeur: (r) => fmt(r.kda, 2) },
  { label: 'Écart CS à 15 min', valeur: (r) => fmt(r.csd15, 1, true) },
  { label: 'Écart d’or à 15 min', valeur: (r) => fmt(r.gd15, 0, true) },
  { label: 'Participation kills', valeur: (r) => fmtPct(r.kp) },
  { label: 'Dégâts / min', valeur: (r) => fmt(r.dpm) },
  { label: 'Vision / min', valeur: (r) => fmt(r.visionMin, 2) },
  { label: 'CS / min', valeur: (r) => fmt(r.csMin, 1) },
]

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
    <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valeur === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-10 cursor-pointer rounded-lg border-0 px-3.5 text-sm ${
            valeur === o.id ? 'bg-accent font-semibold text-bg' : 'bg-transparent font-medium text-text-2 hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function JoueursPage() {
  const [joueurs, setJoueurs] = useState<Joueur[]>([])
  const [selection, setSelection] = useState<string | null>(null)
  const [parties, setParties] = useState<Partie[]>([])
  const [filtre, setFiltre] = useState<Filtre>('tout')
  const [objectif, setObjectif] = useState('')
  const [etatObjectif, setEtatObjectif] = useState<'' | 'enregistre' | 'erreur'>('')
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  // Nos joueurs
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, display_name, role, game_name, tag_line, teams!inner(is_ours)')
        .eq('teams.is_ours', true)
      if (error) return setErreur(error.message)
      const liste = (data as unknown as Joueur[]).sort(
        (a, b) => ORDRE_ROLES.indexOf(a.role ?? '') - ORDRE_ROLES.indexOf(b.role ?? ''),
      )
      setJoueurs(liste)
      setSelection((s) => s ?? liste[0]?.id ?? null)
      if (!liste.length) setChargement(false)
    })()
  }, [])

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
  }, [selection])

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

  return (
    <>
      <PageHeader
        surtitre="Progression individuelle"
        titre="Joueurs"
        actions={<Segmente label="Type de parties" options={FILTRES} valeur={filtre} onChange={setFiltre} />}
      />

      {/* Choix du joueur */}
      <div role="group" aria-label="Choisir un joueur" className="flex flex-wrap gap-2">
        {joueurs.map((j) => (
          <button
            key={j.id}
            type="button"
            aria-pressed={selection === j.id}
            onClick={() => setSelection(j.id)}
            className={`min-h-11 cursor-pointer rounded-xl border px-4 text-sm ${
              selection === j.id
                ? 'border-accent bg-accent font-semibold text-bg'
                : 'border-line-strong bg-surface font-medium text-text-2 hover:text-text'
            }`}
          >
            {ROLES[j.role ?? ''] ?? '—'} · {j.display_name}
          </button>
        ))}
      </div>

      {joueur && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line-strong bg-active font-display text-lg font-bold text-accent-soft">
            {ROLES[joueur.role ?? ''] ?? '—'}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="m-0 font-display text-3xl font-bold">{joueur.display_name}</h2>
            <span className="text-sm text-muted">
              {joueur.game_name}#{joueur.tag_line} · {parties.length} parties en base
            </span>
          </div>
        </div>
      )}

      {chargement ? (
        <p className="text-sm text-muted">Chargement des parties…</p>
      ) : (
        <>
          {/* Indicateurs : matchs d'équipe vs SoloQ */}
          <section aria-label="Indicateurs" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            {INDICATEURS.map((ind) => (
              <div key={ind.label} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
                <span className="text-sm text-muted">{ind.label}</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="font-display text-2xl font-bold">{ind.valeur(resumeEquipe)}</span>
                    <span className="text-xs text-muted">Scrims + off.</span>
                  </div>
                  <div className="flex flex-col border-l border-line pl-3">
                    <span className="font-display text-2xl font-bold text-text-2">{ind.valeur(resumeSoloq)}</span>
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
                    className="grid h-56 gap-2"
                    style={{ gridTemplateColumns: `repeat(${barres.length}, minmax(0, 1fr))` }}
                  >
                    {barres.map((p) => {
                      const v = p.gd_15 ?? 0
                      const h = `${(Math.abs(v) / maxEcart) * 100}%`
                      return (
                        <div
                          key={p.match_id}
                          className="flex h-56 flex-col"
                          title={`${p.champion} vs ${p.opp_champion ?? '?'} : ${fmt(v, 0, true)} or`}
                        >
                          <div className="flex h-1/2 items-end">
                            {v > 0 && <div className="w-full rounded-t bg-accent" style={{ height: h }} />}
                          </div>
                          <div className="flex h-1/2 items-start border-t border-line-strong">
                            {v < 0 && <div className="w-full rounded-b bg-warn" style={{ height: h }} />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-muted">
                    <span>plus ancienne</span>
                    <span>plus récente</span>
                  </div>
                </>
              )}
            </Card>

            {/* Pool de champions */}
            <Card titre="Pool de champions" className="min-w-0 flex-[1_1_340px]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted">
                      <th className="px-1.5 py-2 font-medium">Champion</th>
                      <th className="px-1.5 py-2 font-medium">Parties</th>
                      <th className="px-1.5 py-2 font-medium">WR</th>
                      <th className="px-1.5 py-2 font-medium">KDA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pool.map((c) => (
                      <tr key={c.champion} className="border-t border-line">
                        <td className="px-1.5 py-2.5 font-semibold">{c.champion}</td>
                        <td className="px-1.5 py-2.5">{c.parties}</td>
                        <td className="px-1.5 py-2.5">{fmtPct(c.winrate)}</td>
                        <td className="px-1.5 py-2.5 text-text-2">{fmt(c.kda, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Dernières parties */}
          <Card titre="Dernières parties">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium">Champion</th>
                    <th className="px-2 py-2 font-medium">Résultat</th>
                    <th className="px-2 py-2 font-medium">KDA</th>
                    <th className="px-2 py-2 font-medium">Écart CS 15</th>
                    <th className="px-2 py-2 font-medium">Écart or 15</th>
                    <th className="px-2 py-2 font-medium">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  {dernieres.map((p) => (
                    <tr key={p.match_id} className="border-t border-line">
                      <td className="px-2 py-3 text-muted">
                        {new Date(p.played_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td className="px-2 py-3">{LIBELLE_SOURCE[p.source]}</td>
                      <td className="px-2 py-3">
                        <span className="font-semibold">{p.champion}</span>
                        <span className="text-muted"> vs {p.opp_champion ?? '?'}</span>
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={`rounded-md px-2.5 py-1 text-xs font-bold text-bg ${p.win ? 'bg-accent' : 'bg-warn'}`}
                        >
                          {p.win ? 'Victoire' : 'Défaite'}
                        </span>
                      </td>
                      <td className="px-2 py-3">
                        {p.kills}/{p.deaths}/{p.assists}
                      </td>
                      <td className="px-2 py-3">{fmt(p.csd_15, 0, true)}</td>
                      <td className="px-2 py-3 font-semibold">{fmt(p.gd_15, 0, true)}</td>
                      <td className="px-2 py-3 text-muted">
                        {Math.floor(p.duration_s / 60)}:{String(p.duration_s % 60).padStart(2, '0')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
