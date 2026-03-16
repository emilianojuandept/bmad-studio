import { useLocation, Link } from 'react-router-dom'

const routeLabels: Record<string, string> = {
  agents: 'Agents',
  teams: 'Teams',
  skills: 'Skills',
  workflows: 'Workflows',
  outputs: 'Outputs',
  connections: 'Connections',
  workspace: 'Workspace',
  modules: 'Modules',
  packages: 'Packages',
  files: 'Files',
  settings: 'Settings',
}

export function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[var(--color-muted)]">
      <ol className="flex items-center gap-1">
        <li>
          <Link to="/" className="hover:text-[var(--color-text)] transition-colors">
            Home
          </Link>
        </li>
        {segments.map((segment, i) => {
          const path = '/' + segments.slice(0, i + 1).join('/')
          const label = routeLabels[segment] || segment
          const isLast = i === segments.length - 1

          return (
            <li key={path} className="flex items-center gap-1">
              <span className="text-[var(--color-border-subtle)]">/</span>
              {isLast ? (
                <span className="text-[var(--color-text)]">{label}</span>
              ) : (
                <Link to={path} className="hover:text-[var(--color-text)] transition-colors">
                  {label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
