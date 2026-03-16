import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  actions?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, actions }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={48} className="text-[var(--color-muted)] mb-4" strokeWidth={1.5} />
      <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">{title}</h2>
      <p className="text-sm text-[var(--color-muted)] max-w-md mb-6">{description}</p>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  )
}
