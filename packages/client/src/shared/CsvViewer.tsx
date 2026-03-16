import { useMemo, useState } from 'react'

type CsvViewerProps = {
  content: string
  filePath?: string
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

export function CsvViewer({ content }: CsvViewerProps) {
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  const { headers, rows } = useMemo(() => parseCsv(content), [content])

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

  if (headers.length === 0) {
    return (
      <div className="p-4 text-sm text-[var(--color-muted)]">
        Empty or unparseable CSV content.
      </div>
    )
  }

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
