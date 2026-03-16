import fs from 'node:fs'
import path from 'node:path'

import yaml from 'js-yaml'

import type { Team, TeamMember } from '@bmad-studio/shared'

import type { ParseResult } from './config-parser.js'

type TeamYaml = {
  bundle?: {
    name?: string
    icon?: string
    description?: string
  }
  agents?: string[]
  party?: string
}

function parseCsvLine(line: string): string[] {
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

function parsePartyCsv(csvPath: string, agentIds: string[]): TeamMember[] {
  if (!fs.existsSync(csvPath)) return []

  try {
    const content = fs.readFileSync(csvPath, 'utf-8')
    const lines = content.split('\n').filter((l) => l.trim())
    if (lines.length < 2) return []

    const headers = parseCsvLine(lines[0])
    const nameIdx = headers.indexOf('name')
    if (nameIdx === -1) return []

    const getField = (row: string[], field: string): string => {
      const idx = headers.indexOf(field)
      return idx >= 0 ? (row[idx] ?? '') : ''
    }

    const agentIdSet = new Set(agentIds)
    const members: TeamMember[] = []

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i])
      const name = row[nameIdx] ?? ''
      if (!name || !agentIdSet.has(name)) continue

      members.push({
        agentId: name,
        displayName: getField(row, 'displayName'),
        title: getField(row, 'title'),
        icon: getField(row, 'icon'),
        role: getField(row, 'role'),
        communicationStyle: getField(row, 'communicationStyle'),
        identity: getField(row, 'identity'),
        principles: getField(row, 'principles'),
        module: getField(row, 'module'),
      })
    }

    return members
  } catch {
    return []
  }
}

export function parseTeam(filePath: string): ParseResult<Team> {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const data = yaml.load(content) as TeamYaml

    if (!data || !data.bundle) {
      return { ok: false, error: 'Team YAML missing bundle section', filePath }
    }

    const id = path.basename(filePath, '.yaml')
    const name = data.bundle.name ?? id
    const icon = data.bundle.icon ?? ''
    const description = data.bundle.description ?? ''
    const agentIds = data.agents ?? []
    const partyRef = data.party ?? ''

    // Resolve party CSV path relative to team YAML directory
    let members: TeamMember[] = []
    let partyFile = ''
    if (partyRef) {
      partyFile = path.resolve(path.dirname(filePath), partyRef)
      members = parsePartyCsv(partyFile, agentIds)
    }

    const team: Team = {
      id,
      name,
      icon,
      description,
      agentIds,
      members,
      partyFile: partyRef,
      filePath,
    }

    return { ok: true, data: team }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Team parse error: ${message}`, filePath }
  }
}
