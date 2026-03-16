import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { parseTeam } from './team-parser.js'

describe('team-parser', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'team-parser-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('parses team YAML with bundle metadata and agents list', () => {
    const teamFile = path.join(tmpDir, 'team-fullstack.yaml')
    fs.writeFileSync(
      teamFile,
      `bundle:
  name: Team Fullstack
  icon: "🚀"
  description: Full stack development team
agents:
  - analyst
  - architect
  - dev
party: "./default-party.csv"
`,
    )

    // Create party CSV
    fs.writeFileSync(
      path.join(tmpDir, 'default-party.csv'),
      `name,displayName,title,icon,role,communicationStyle,identity,principles,module,path
"analyst","Mary","Business Analyst","📊","BA","Analytical","Senior analyst","Evidence-based","bmm","agents/analyst.md"
"architect","Winston","Architect","🏗️","Arch","Pragmatic","Senior architect","Simple solutions","bmm","agents/architect.md"
"dev","Amelia","Developer","💻","Dev","Succinct","Senior dev","Tests first","bmm","agents/dev.md"
`,
    )

    const result = parseTeam(teamFile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('team-fullstack')
      expect(result.data.name).toBe('Team Fullstack')
      expect(result.data.icon).toBe('🚀')
      expect(result.data.description).toBe('Full stack development team')
      expect(result.data.agentIds).toEqual(['analyst', 'architect', 'dev'])
      expect(result.data.members).toHaveLength(3)
      expect(result.data.members[0].agentId).toBe('analyst')
      expect(result.data.members[0].displayName).toBe('Mary')
      expect(result.data.members[0].title).toBe('Business Analyst')
      expect(result.data.members[0].icon).toBe('📊')
      expect(result.data.members[0].module).toBe('bmm')
      expect(result.data.partyFile).toBe('./default-party.csv')
    }
  })

  it('handles unresolved agents (in agentIds but not in party CSV)', () => {
    const teamFile = path.join(tmpDir, 'team-mixed.yaml')
    fs.writeFileSync(
      teamFile,
      `bundle:
  name: Mixed Team
  icon: "🔧"
  description: Team with some missing party entries
agents:
  - analyst
  - missing-agent
  - dev
party: "./party.csv"
`,
    )

    fs.writeFileSync(
      path.join(tmpDir, 'party.csv'),
      `name,displayName,title,icon,role,communicationStyle,identity,principles,module,path
"analyst","Mary","BA","📊","BA","Analytical","Senior","Evidence","bmm",""
"dev","Amelia","Dev","💻","Dev","Succinct","Senior","Tests","bmm",""
`,
    )

    const result = parseTeam(teamFile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.agentIds).toHaveLength(3)
      expect(result.data.agentIds).toContain('missing-agent')
      // Only 2 members resolved (missing-agent not in CSV)
      expect(result.data.members).toHaveLength(2)
      expect(result.data.members.map((m) => m.agentId)).not.toContain('missing-agent')
    }
  })

  it('handles malformed YAML gracefully', () => {
    const teamFile = path.join(tmpDir, 'bad-team.yaml')
    fs.writeFileSync(teamFile, '{{invalid yaml content!!')

    const result = parseTeam(teamFile)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Team parse error')
    }
  })

  it('handles missing bundle section', () => {
    const teamFile = path.join(tmpDir, 'no-bundle.yaml')
    fs.writeFileSync(teamFile, 'agents:\n  - analyst\n')

    const result = parseTeam(teamFile)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('missing bundle')
    }
  })

  it('handles missing party CSV file', () => {
    const teamFile = path.join(tmpDir, 'team-no-party.yaml')
    fs.writeFileSync(
      teamFile,
      `bundle:
  name: No Party Team
  icon: "❌"
  description: Team without party CSV
agents:
  - analyst
party: "./nonexistent.csv"
`,
    )

    const result = parseTeam(teamFile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.agentIds).toEqual(['analyst'])
      expect(result.data.members).toHaveLength(0)
    }
  })

  it('derives team ID from filename', () => {
    const teamFile = path.join(tmpDir, 'my-custom-team.yaml')
    fs.writeFileSync(
      teamFile,
      `bundle:
  name: Custom Team
agents: []
`,
    )

    const result = parseTeam(teamFile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('my-custom-team')
    }
  })

  it('handles party CSV with quoted fields containing commas', () => {
    const teamFile = path.join(tmpDir, 'team-quotes.yaml')
    fs.writeFileSync(
      teamFile,
      `bundle:
  name: Quoted Team
agents:
  - analyst
party: "./quoted.csv"
`,
    )

    fs.writeFileSync(
      path.join(tmpDir, 'quoted.csv'),
      `name,displayName,title,icon,role,communicationStyle,identity,principles,module,path
"analyst","Mary","Business Analyst","📊","Strategic Business Analyst + Requirements Expert","Treats analysis like a treasure hunt, excited by every clue","Senior analyst with deep expertise in market research, competitive analysis, and requirements elicitation.","Every business challenge has root causes. Ground findings in verifiable evidence.","bmm","agents/analyst.md"
`,
    )

    const result = parseTeam(teamFile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.members).toHaveLength(1)
      expect(result.data.members[0].communicationStyle).toContain('treasure hunt')
      expect(result.data.members[0].identity).toContain('market research')
    }
  })
})
