import { useMemo, useState } from 'react'
import { X, Plus } from 'lucide-react'

type CsvViewerProps = {
  content: string
  filePath?: string
  editable?: boolean
  onChange?: (newContent: string) => void
}

function parseCsv(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw.split('\n').filter((l) => l.trim())
  if (lines.length === 0) return { headers: [], rows: [] }

  const parse = (line: string): string[] => {
    const cells: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    cells.push(current.trim())
    return cells
  }

  const headers = parse(lines[0])
  const rows = lines.slice(1).map(parse)
  return { headers, rows }
}

function serializeCsv(headers: string[], rows: string[][]): string {
  const escape = (cell: string) =>
    cell.includes(',') || cell.includes('"') || cell.includes('\n')
      ? `"${cell.replace(/"/g, '""')}"`
      : cell
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
}

export function CsvViewer({ content, editable, onChange }: CsvViewerProps) {
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const { headers, rows } = useMemo(() => parseCsv(content), [content])

  // Edit state — initialised once on mount from parsed rows.
  // Not re-driven by `content` to avoid clobbering in-progress edits on every keystroke.
  const [editRows, setEditRows] = useState<string[][]>(() => parseCsv(content).rows)

  const sorted = useMemo(() => {
    if (sortCol === null) return rows
    return [...rows].sort((a, b) => {
      const av = a[sortCol] ?? ''
      const bv = b[sortCol] ?? ''
      return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [rows, sortCol, sortAsc])

  const handleSort = (col: number) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc)
    } else {
      setSortCol(col)
      setSortAsc(true)
    }
  }

  const handleCellChange = (ri: number, ci: number, value: string) => {
    const next = editRows.map((row, r) =>
      r === ri ? row.map((cell, c) => (c === ci ? value : cell)) : row,
    )
    setEditRows(next)
    onChange?.(serializeCsv(headers, next))
  }

  const handleDeleteRow = (ri: number) => {
    const next = editRows.filter((_, r) => r !== ri)
    setEditRows(next)
    onChange?.(serializeCsv(headers, next))
  }

  const handleAddRow = () => {
    const blank = Array(headers.length).fill('')
    const next = [...editRows, blank]
    setEditRows(next)
    onChange?.(serializeCsv(headers, next))
  }

  if (headers.length === 0) {
    return (
      <div className="p-4 text-sm text-[var(--color-muted)]">
        Empty or unparseable CSV content.
      </div>
    )
  }

  // ── Editable mode ──────────────────────────────────────────────────────────
  if (editable) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--color-surface-raised)]">
                {/* delete-row column header — spacer */}
                <th className="w-6 px-1 py-2 border-b border-[var(--color-border-subtle)]" />
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-bold text-xs uppercase tracking-wider text-[var(--color-muted)] border-b border-[var(--color-border-subtle)] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {editRows.map((row, ri) => (
                <tr
                  key={ri}
                  className={
                    ri % 2 === 0
                      ? 'bg-[var(--color-bg)]'
                      : 'bg-[var(--color-surface-raised)]'
                  }
                >
                  <td className="px-1 py-1 border-b border-[var(--color-border-subtle)]">
                    <button
                      onClick={() => handleDeleteRow(ri)}
                      className="text-[var(--color-muted)] hover:text-[var(--color-error)] transition-colors"
                      aria-label={`Delete row ${ri + 1}`}
                    >
                      <X size={12} />
                    </button>
                  </td>
                  {headers.map((_, ci) => (
                    <td key={ci} className="px-1 py-1 border-b border-[var(--color-border-subtle)]">
                      <input
                        value={row[ci] ?? ''}
                        onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-transparent border border-transparent focus:border-[var(--color-accent)] rounded outline-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-[var(--color-border-subtle)] flex items-center gap-3">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
          >
            <Plus size={12} />
            Add Row
          </button>
          <span className="text-xs text-[var(--color-muted)]">
            {editRows.length} rows × {headers.length} columns
          </span>
        </div>
      </div>
    )
  }

  // ── Read-only mode (unchanged) ─────────────────────────────────────────────
  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-[var(--color-surface-raised)]">
            {headers.map((h, i) => (
              <th
                key={i}
                onClick={() => handleSort(i)}
                className="px-3 py-2 text-left font-bold text-xs uppercase tracking-wider text-[var(--color-muted)] border-b border-[var(--color-border-subtle)] cursor-pointer hover:text-[var(--color-text)] select-none whitespace-nowrap"
              >
                {h}
                {sortCol === i && (
                  <span className="ml-1">{sortAsc ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, ri) => (
            <tr
              key={ri}
              className={
                ri % 2 === 0
                  ? 'bg-[var(--color-bg)]'
                  : 'bg-[var(--color-surface-raised)]'
              }
            >
              {headers.map((_, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 border-b border-[var(--color-border-subtle)] whitespace-nowrap max-w-xs truncate"
                  title={row[ci] ?? ''}
                >
                  {row[ci] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 text-xs text-[var(--color-muted)] border-t border-[var(--color-border-subtle)]">
        {rows.length} rows × {headers.length} columns
      </div>
    </div>
  )
}
