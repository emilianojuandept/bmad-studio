import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'

type FilepathLinkProps = {
  path: string
  className?: string
  showIcon?: boolean
}

export function FilepathLink({ path, className, showIcon }: FilepathLinkProps) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs ${className ?? ''}`}>
      {showIcon && <ExternalLink size={12} className="text-[var(--color-muted)] shrink-0" />}
      <Link
        to={`/files?path=${encodeURIComponent(path)}`}
        className="font-[var(--font-mono)] text-[var(--color-accent)] hover:underline break-all"
      >
        {path}
      </Link>
    </span>
  )
}
