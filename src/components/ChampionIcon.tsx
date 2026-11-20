import { useDDragon } from '../lib/ddragon'

type Props = {
  champion: string
  taille?: number
  className?: string
}

/** Icône carrée d'un champion, avec son nom en texte alternatif. */
export default function ChampionIcon({ champion, taille = 32, className = '' }: Props) {
  const dd = useDDragon()
  const src = dd.icone(champion)
  const style = { width: taille, height: taille }
  if (!src) {
    return <span style={style} className={`inline-block shrink-0 rounded-md bg-active ${className}`} aria-hidden="true" />
  }
  return (
    <img
      src={src}
      alt={dd.nom(champion)}
      title={dd.nom(champion)}
      width={taille}
      height={taille}
      loading="lazy"
      style={style}
      className={`shrink-0 rounded-md border border-line-strong object-cover ${className}`}
    />
  )
}
