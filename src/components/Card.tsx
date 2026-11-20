import type { ReactNode } from 'react'

type Props = {
  titre?: string
  children: ReactNode
  className?: string
}

export default function Card({ titre, children, className = '' }: Props) {
  return (
    <section
      className={`flex flex-col gap-3.5 rounded-xl border border-line bg-surface p-5 ${className}`}
    >
      {titre && <h2 className="m-0 font-display text-xl font-bold">{titre}</h2>}
      {children}
    </section>
  )
}
