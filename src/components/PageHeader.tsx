import type { ReactNode } from 'react'

type Props = {
  surtitre?: string
  titre: string
  actions?: ReactNode
}

export default function PageHeader({ surtitre, titre, actions }: Props) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        {surtitre && (
          <span className="text-xs tracking-widest text-muted uppercase">{surtitre}</span>
        )}
        <h1 className="m-0 font-display text-3xl font-bold">{titre}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  )
}
