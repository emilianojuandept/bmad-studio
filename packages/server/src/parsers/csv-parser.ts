import type { ParseResult } from './config-parser.js'

export type CsvRow = Record<string, string>

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current.trim())

  return fields
}

export function parseCsv(filePath: string, content: string): ParseResult<CsvRow[]> {
  try {
    const lines = content.split('\n').filter((line) => line.trim() !== '')
    if (lines.length === 0) {
      return { ok: true, data: [] }
    }

    const headers = parseCsvLine(lines[0])
    const rows: CsvRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i])
      const row: CsvRow = {}
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j] || ''
      }
      rows.push(row)
    }

    return { ok: true, data: rows }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `CSV parse error: ${message}`, filePath }
  }
}
