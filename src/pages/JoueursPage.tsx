import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

export default function JoueursPage() {
  return (
    <>
      <PageHeader surtitre="Progression individuelle" titre="Joueurs" />
      <EmptyState
        etape="Étape 2"
        titre="Fiches joueurs"
        texte="Stats scrims et SoloQ côte à côte, écart d'or à 15 min sur les dernières parties, pool de champions et objectifs du coach. Prochaine page branchée, avec l'import SoloQ via l'API Riot."
      />
    </>
  )
}
