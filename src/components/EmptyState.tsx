type Props = {
  titre: string
  texte: string
  etape: string
}

/** Bloc affiché tant qu'une page n'est pas encore branchée aux données. */
export default function EmptyState({ titre, texte, etape }: Props) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong bg-surface p-8">
      <span className="rounded-md bg-active px-2.5 py-1 text-xs font-semibold text-accent-soft">
        {etape}
      </span>
      <h2 className="m-0 font-display text-xl font-bold">{titre}</h2>
      <p className="m-0 max-w-2xl text-sm leading-relaxed text-muted">{texte}</p>
    </div>
  )
}
