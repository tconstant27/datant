import { NavLink } from 'react-router-dom'

const LIENS = [
  { to: '/', label: 'Vue équipe', end: true },
  { to: '/joueurs', label: 'Joueurs' },
  { to: '/scouting', label: 'Scouting' },
  { to: '/draft', label: 'Draft' },
  { to: '/collecteur', label: 'Collecteur' },
]

export default function Sidebar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="flex shrink-0 flex-col gap-6 border-b border-line bg-sidebar px-4 py-5 md:w-64 md:border-r md:border-b-0 md:py-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-display text-lg font-bold text-bg">
          N
        </div>
        <div className="flex flex-col">
          <span className="font-display text-base font-bold">Nexus Data</span>
          <span className="text-xs text-muted">Équipe Nexus Tour</span>
        </div>
      </div>

      <ul className="flex flex-row flex-wrap gap-1 md:flex-col">
        {LIENS.map((lien) => (
          <li key={lien.to}>
            <NavLink
              to={lien.to}
              end={lien.end}
              className={({ isActive }) =>
                `block rounded-lg px-3.5 py-3 text-sm no-underline transition-colors ${
                  isActive
                    ? 'bg-active font-semibold text-text'
                    : 'font-medium text-muted hover:bg-surface-2 hover:text-text'
                }`
              }
            >
              {lien.label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/* Statut du collecteur : sera branché sur Supabase à l'étape 4 */}
      <div className="mt-auto hidden flex-col gap-1.5 rounded-xl border border-line bg-surface-2 p-3.5 md:flex">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-2 w-2 rounded-full bg-muted" aria-hidden="true" />
          Collecteur non configuré
        </div>
        <span className="text-xs text-muted">Aucune partie perso reçue pour l'instant</span>
      </div>
    </nav>
  )
}
