import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

export default function ScoutingPage() {
  return (
    <>
      <PageHeader surtitre="Préparation de match" titre="Scouting" />
      <EmptyState
        etape="Étape 5"
        titre="Scouting adversaire"
        texte="Entre les Riot ID des 5 adversaires pour voir leurs champions SoloQ, leur forme du moment, nos parties contre eux et tes notes VOD."
      />
    </>
  )
}
