import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

export default function CollecteurPage() {
  return (
    <>
      <PageHeader surtitre="Parties perso" titre="Collecteur" />
      <EmptyState
        etape="Étape 4"
        titre="Collecteur de parties perso"
        texte="Petite app Windows à installer sur le PC d'un joueur : elle détecte la fin de chaque partie perso (scrims et officiels) et envoie les stats à la base de l'équipe. Cette page affichera son statut et les parties reçues."
      />
    </>
  )
}
