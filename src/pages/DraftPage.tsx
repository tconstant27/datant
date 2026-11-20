import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'

export default function DraftPage() {
  return (
    <>
      <PageHeader surtitre="Préparation de match" titre="Draft" />
      <EmptyState
        etape="Étape 5"
        titre="Préparation draft"
        texte="Plateau de draft côté bleu ou rouge, bans suggérés avec leur justification, nos comfort picks et leurs picks probables."
      />
    </>
  )
}
