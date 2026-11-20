import { useEffect, useMemo, useRef, useState } from 'react'
import { useDDragon } from '../lib/ddragon'
import ChampionIcon from './ChampionIcon'

// Timeline compacte enregistrée par import-soloq
export type TimelineCompacte = {
  interval: number
  frames: { t: number; p: Record<string, [number | null, number | null, number, number, number]> }[]
  events: {
    t: number
    x: number | null
    y: number | null
    k: 'kill' | 'building' | 'monster'
    a?: number
    v?: number
    as?: number[]
    perd?: number
    b?: string
    l?: string
    tw?: string | null
    team?: number
    m?: string
    s?: string | null
  }[]
}

export type ParticipantCarte = { id: number; side: number; champion: string; nom: string; nous: boolean }

// Limites de la Faille de l'invocateur (coordonnées du jeu)
const MIN = { x: -120, y: -120 }
const MAX = { x: 14870, y: 14980 }
const versPct = (x: number, y: number) => ({
  left: ((x - MIN.x) / (MAX.x - MIN.x)) * 100,
  top: (1 - (y - MIN.y) / (MAX.y - MIN.y)) * 100,
})

// Temps de mort approximatif selon le niveau (en secondes, hors bonus de fin de partie)
const MORT = [10, 10, 12, 12, 14, 16, 20, 25, 28, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5]

const COULEUR = { 100: '#4DA3FF', 200: '#F5A623' } as Record<number, string>

const MONSTRES: Record<string, string> = {
  DRAGON: 'Dragon',
  BARON_NASHOR: 'Baron',
  RIFTHERALD: 'Héraut',
  HORDE: 'Larves',
  ATAKHAN: 'Atakhan',
}
const DRAGONS: Record<string, string> = {
  FIRE_DRAGON: 'Dragon infernal',
  WATER_DRAGON: 'Dragon océan',
  EARTH_DRAGON: 'Dragon montagne',
  AIR_DRAGON: 'Dragon nuage',
  HEXTECH_DRAGON: 'Dragon Hextech',
  CHEMTECH_DRAGON: 'Dragon Chemtech',
  ELDER_DRAGON: 'Dragon ancestral',
}

// eslint-disable-next-line react-refresh/only-export-components
export const chrono = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function MapReplay({
  timeline,
  participants,
}: {
  timeline: TimelineCompacte
  participants: ParticipantCarte[]
}) {
  const dd = useDDragon()
  const fin = timeline.frames[timeline.frames.length - 1]?.t ?? 0
  const [t, setT] = useState(0)
  const [lecture, setLecture] = useState(false)
  const [vitesse, setVitesse] = useState(30) // secondes de jeu par seconde réelle
  const precedent = useRef<number | null>(null)

  // Boucle d'animation
  useEffect(() => {
    if (!lecture) {
      precedent.current = null
      return
    }
    let id = 0
    const tick = (now: number) => {
      if (precedent.current !== null) {
        const dt = now - precedent.current
        setT((v) => {
          const suivant = v + dt * vitesse
          if (suivant >= fin) {
            setLecture(false)
            return fin
          }
          return suivant
        })
      }
      precedent.current = now
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [lecture, vitesse, fin])

  const parId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])

  // Positions interpolées entre deux relevés (une par minute)
  const positions = useMemo(() => {
    const f = timeline.frames
    let i = 0
    while (i < f.length - 2 && f[i + 1].t <= t) i++
    const a = f[i]
    const b = f[Math.min(i + 1, f.length - 1)]
    const frac = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0
    const res = new Map<number, { x: number; y: number; niveau: number }>()
    for (const p of participants) {
      const pa = a.p[String(p.id)]
      const pb = b.p[String(p.id)] ?? pa
      if (!pa || pa[0] === null || pa[1] === null) continue
      const xb = pb[0] ?? pa[0]
      const yb = pb[1] ?? pa[1]
      res.set(p.id, {
        x: pa[0] + (xb - pa[0]) * frac,
        y: pa[1] + (yb - pa[1]) * frac,
        niveau: frac < 0.5 ? pa[3] : pb[3],
      })
    }
    return res
  }, [t, timeline, participants])

  // Champions morts à l'instant t (estimation du temps de réapparition)
  const morts = useMemo(() => {
    const set = new Set<number>()
    for (const e of timeline.events) {
      if (e.k !== 'kill' || e.t > t || e.v === undefined) continue
      const niveau = positions.get(e.v)?.niveau ?? 1
      if (t - e.t < (MORT[Math.min(17, Math.max(0, niveau - 1))] ?? 30) * 1000) set.add(e.v)
    }
    return set
  }, [t, timeline, positions])

  const passes = timeline.events.filter((e) => e.t <= t)
  const recents = passes.filter((e) => t - e.t < 20000 && e.x !== null && e.y !== null)
  const fil = [...passes].reverse().slice(0, 6)

  // Écart d'or bleu - rouge à chaque minute
  const ecarts = timeline.frames.map((f) => {
    let ecart = 0
    for (const p of participants) ecart += (p.side === 100 ? 1 : -1) * (f.p[String(p.id)]?.[2] ?? 0)
    return { t: f.t, ecart }
  })
  const maxEcart = Math.max(1000, ...ecarts.map((e) => Math.abs(e.ecart)))
  const L = 600
  const H = 120
  const px = (temps: number) => (fin ? (temps / fin) * L : 0)
  const py = (ecart: number) => H / 2 - (ecart / maxEcart) * (H / 2 - 6)
  const courbe = ecarts.map((e, i) => `${i ? 'L' : 'M'}${px(e.t).toFixed(1)},${py(e.ecart).toFixed(1)}`).join(' ')
  const ecartActuel = (() => {
    const i = ecarts.findIndex((e) => e.t > t)
    if (i <= 0) return ecarts[i === 0 ? 0 : ecarts.length - 1]?.ecart ?? 0
    const a = ecarts[i - 1]
    const b = ecarts[i]
    return a.ecart + ((b.ecart - a.ecart) * (t - a.t)) / (b.t - a.t)
  })()

  const libelleEvenement = (e: (typeof timeline.events)[number]) => {
    const auteur = e.a ? parId.get(e.a) : undefined
    if (e.k === 'kill') return { auteur, cible: e.v ? parId.get(e.v) : undefined, texte: 'a tué' }
    if (e.k === 'building')
      return { auteur, texte: e.b === 'INHIBITOR_BUILDING' ? 'détruit un inhibiteur' : 'détruit une tour' }
    return {
      auteur,
      texte: `prend ${e.m === 'DRAGON' && e.s ? (DRAGONS[e.s] ?? 'un dragon') : (MONSTRES[e.m ?? ''] ?? 'un monstre')}`,
    }
  }

  return (
    <div className="flex flex-wrap gap-5">
      {/* Carte */}
      <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-3">
        <div className="relative mx-auto aspect-square w-full max-w-[640px] overflow-hidden rounded-xl border border-line-strong bg-input">
          {dd.carte && (
            <img
              src={dd.carte}
              alt="Carte de la Faille de l'invocateur"
              className="absolute inset-0 h-full w-full opacity-80"
            />
          )}
          {/* Événements récents */}
          {recents.map((e, i) => {
            const pos = versPct(e.x!, e.y!)
            const camp =
              e.k === 'kill' ? parId.get(e.a ?? 0)?.side : e.k === 'building' ? (e.perd === 100 ? 200 : 100) : e.team
            const age = (t - e.t) / 20000
            return (
              <svg
                key={`${e.t}-${i}`}
                viewBox="0 0 20 20"
                width="22"
                height="22"
                aria-hidden="true"
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${pos.left}%`, top: `${pos.top}%`, opacity: 1 - age * 0.8 }}
              >
                {e.k === 'kill' ? (
                  <path
                    d="M4 4l12 12M16 4L4 16"
                    stroke={COULEUR[camp ?? 100]}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                ) : (
                  <circle cx="10" cy="10" r="7" fill="none" stroke={COULEUR[camp ?? 100]} strokeWidth="3" />
                )}
              </svg>
            )
          })}
          {/* Champions */}
          {participants.map((p) => {
            const pos = positions.get(p.id)
            if (!pos) return null
            const { left, top } = versPct(pos.x, pos.y)
            const mort = morts.has(p.id)
            return (
              <div
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity"
                style={{ left: `${left}%`, top: `${top}%`, opacity: mort ? 0.35 : 1, zIndex: p.nous ? 3 : 2 }}
                title={`${dd.nom(p.champion)} · ${p.nom}${mort ? ' (mort)' : ''}`}
              >
                <div
                  className="rounded-full p-[2px]"
                  style={{ background: COULEUR[p.side], boxShadow: p.nous ? '0 0 0 2px #E6EDF3' : undefined }}
                >
                  <ChampionIcon
                    champion={p.champion}
                    taille={26}
                    className={`rounded-full border-0 ${mort ? 'grayscale' : ''}`}
                  />
                </div>
              </div>
            )
          })}
          <span className="absolute top-2 left-2 rounded-md bg-bg/80 px-2 py-1 font-display text-lg font-bold">
            {chrono(t)}
          </span>
        </div>

        {/* Contrôles */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (t >= fin) setT(0)
              setLecture((v) => !v)
            }}
            aria-label={lecture ? 'Pause' : 'Lecture'}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-accent text-bg"
          >
            {lecture ? (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <label className="flex min-w-[180px] flex-1 items-center gap-3 text-xs text-muted">
            <span className="sr-only">Moment de la partie</span>
            <input
              type="range"
              min={0}
              max={fin}
              step={1000}
              value={t}
              onChange={(e) => setT(Number(e.target.value))}
              className="h-11 w-full accent-[#4DA3FF]"
            />
            <span className="w-12 text-right">{chrono(fin)}</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            Vitesse
            <select
              value={vitesse}
              onChange={(e) => setVitesse(Number(e.target.value))}
              className="min-h-11 rounded-lg border border-line-strong bg-input px-2 text-sm text-text"
            >
              <option value={15}>×15</option>
              <option value={30}>×30</option>
              <option value={60}>×60</option>
              <option value={120}>×120</option>
            </select>
          </label>
        </div>
        <p className="m-0 text-xs text-muted">
          Positions relevées par Riot une fois par minute, trajets interpolés entre deux relevés. Croix : kills des 20
          dernières secondes · cercles : tours et monstres épiques. Champions grisés : morts (durée estimée).
        </p>
      </div>

      {/* Fil des événements et écart d'or */}
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <h3 className="m-0 text-sm font-semibold">Écart d'or (bleu − rouge)</h3>
            <span
              className="font-display text-lg font-bold"
              style={{ color: ecartActuel === 0 ? undefined : COULEUR[ecartActuel > 0 ? 100 : 200] }}
            >
              {ecartActuel > 0 ? '+' : ''}
              {Math.round(ecartActuel).toLocaleString('fr-FR')}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${L} ${H}`}
            className="h-28 w-full cursor-pointer rounded-lg bg-input"
            role="img"
            aria-label="Courbe de l'écart d'or entre les deux équipes ; cliquer pour aller à ce moment"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              setT(Math.round((((e.clientX - r.left) / r.width) * fin) / 1000) * 1000)
            }}
            preserveAspectRatio="none"
          >
            <line x1="0" x2={L} y1={H / 2} y2={H / 2} stroke="#2E3A48" strokeWidth="1" />
            <path d={courbe} fill="none" stroke="#C9D3DD" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <line
              x1={px(t)}
              x2={px(t)}
              y1="0"
              y2={H}
              stroke="#4DA3FF"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-sm font-semibold">Derniers événements</h3>
          {fil.length === 0 && <p className="m-0 text-xs text-muted">Rien pour l'instant : lance la lecture.</p>}
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {fil.map((e, i) => {
              const { auteur, cible, texte } = libelleEvenement(e)
              return (
                <li key={`${e.t}-${i}`} className="flex items-center gap-2 rounded-lg bg-input px-2.5 py-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setT(Math.max(0, e.t - 5000))}
                    className="w-10 cursor-pointer border-0 bg-transparent p-0 text-left text-muted hover:text-text"
                    aria-label={`Aller à ${chrono(e.t)}`}
                  >
                    {chrono(e.t)}
                  </button>
                  {auteur ? (
                    <ChampionIcon champion={auteur.champion} taille={22} />
                  ) : (
                    <span className="text-muted">Sbires</span>
                  )}
                  <span className="text-text-2">{texte}</span>
                  {cible && <ChampionIcon champion={cible.champion} taille={22} />}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
