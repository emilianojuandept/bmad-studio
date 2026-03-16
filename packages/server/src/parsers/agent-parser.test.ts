import { describe, it, expect } from 'vitest'

import { parseAgent } from './agent-parser.js'

const sampleAgent = `---
name: "analyst"
description: "Business Analyst"
---

You must fully embody this agent.

\`\`\`xml
<agent id="analyst.agent.yaml" name="Mary" title="Business Analyst" icon="📊" capabilities="market research, competitive analysis">
<menu>
  <item cmd="BP or fuzzy match on brainstorm" exec="skill:bmad-brainstorming">[BP] Brainstorm Project</item>
  <item cmd="MR or fuzzy match on market-research" exec="skill:bmad-market-research">[MR] Market Research</item>
</menu>
</agent>
\`\`\`
`

describe('agent-parser', () => {
  it('extracts agent attributes from XML', () => {
    const result = parseAgent('_bmad/bmm/agents/analyst.md', sampleAgent)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('analyst')
      expect(result.data.name).toBe('Mary')
      expect(result.data.filePath).toBe('_bmad/bmm/agents/analyst.md')
    }
  })

  it('extracts menu items from XML', () => {
    const result = parseAgent('analyst.md', sampleAgent)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.menu).toHaveLength(2)
      expect(result.data.menu[0].trigger).toBe('bp')
      expect(result.data.menu[0].route).toBe('skill:bmad-brainstorming')
      expect(result.data.menu[0].input).toBe('Brainstorm Project')
      expect(result.data.menu[1].trigger).toBe('mr')
      expect(result.data.menu[1].route).toBe('skill:bmad-market-research')
    }
  })

  it('falls back to frontmatter when XML is missing', () => {
    const simple = `---
name: "test-agent"
description: "A test agent"
---
Just a simple agent with no XML.
`
    const result = parseAgent('test.md', simple)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('test-agent')
      expect(result.data.name).toBe('test-agent')
      expect(result.data.role).toBe('A test agent')
      expect(result.data.menu).toHaveLength(0)
    }
  })

  it('handles malformed content gracefully', () => {
    const result = parseAgent('bad.md', '')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('')
      expect(result.data.menu).toHaveLength(0)
    }
  })
})
