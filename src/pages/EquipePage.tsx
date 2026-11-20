import { useState } from 'react'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

const FILTRES = ['Tout', 'Scrims', 'Officiels', 'SoloQ'] as const
type Filtre = (typeof FILTRES)[number]

export default function EquipePage() {
  const [filtre, setFiltre] = useState<Filtre>('Scrims')

  return (
    <>
      <PageHeader
        surtitre="Vue d'ensemble"
        titre="Vue équipe"
        actions={
          <div
            role="group"
            aria-label="Type de parties"
            className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
          >
            {FILTRES.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filtre === f}
                onClick={() => setFiltre(f)}
                className={`min-h-10 cursor-pointer rounded-lg border-0 px-3.5 text-sm ${
                  filtre === f
                    ? 'bg-accent font-semibold text-bg'
                    : 'bg-transparent font-medium text-text-2 hover:text-text'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        }
      />
      <EmptyState
        etape="Étape 3"
        titre="Indicateurs d'équipe"
        texte="Winrate, écart d'or à 15 min, durée moyenne, contrôle des objectifs et dernières parties. Cette page s'affichera dès que la base contiendra des parties."
      />
    </>
  )
}
