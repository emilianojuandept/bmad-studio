import { Search } from 'lucide-react'

type EntityPageHeaderProps = {
  title: string
  count: number
  modules: string[]
  moduleCounts?: Record<string, number>
  activeModule: string
  onModuleChange: (module: string) => void
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filteredCount?: number
  actions?: React.ReactNode
}

export function EntityPageHeader({
  title,
  count,
  modules,
  moduleCounts,
  activeModule,
  onModuleChange,
  search,
  onSearchChange,
  searchPlaceholder,
  filteredCount,
  actions,
}: EntityPageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Main row: title, module tabs, search, actions */}
      <div className="flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-extrabold shrink-0">
          {title} ({count})
        </h1>

        {modules.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => onModuleChange('all')}
              className={`px-3 py-1.5 text-sm rounded-md min-h-[36px] transition-colors ${
                activeModule === 'all'
                  ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] font-bold'
                  : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`}
            >
              All
            </button>
            {modules.map((mod) => (
              <button
                key={mod}
                onClick={() => onModuleChange(mod)}
                className={`px-3 py-1.5 text-sm rounded-md min-h-[36px] transition-colors ${
                  activeModule === mod
                    ? 'bg-[var(--color-surface-raised)] text-[var(--color-text)] font-bold'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {mod}
                {moduleCounts && moduleCounts[mod] !== undefined && (
                  <span className="ml-1 text-xs opacity-60">({moduleCounts[mod]})</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 ml-auto shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
            />
            <input
              type="text"
              placeholder={searchPlaceholder ?? `Search ${title.toLowerCase()}...`}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-sm rounded-md bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-accent)] w-64"
            />
          </div>
          {actions}
        </div>
      </div>

      {/* Filtered results count */}
      {filteredCount !== undefined && filteredCount !== count && (
        <p className="text-xs text-[var(--color-muted)] mt-3">
          Showing {filteredCount} of {count} {title.toLowerCase()}
        </p>
      )}
    </div>
  )
}
