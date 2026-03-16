import matter from 'gray-matter'

import type { Agent, AgentMenuItem } from '@bmad-studio/shared'

import type { ParseResult } from './config-parser.js'

function extractAgentAttributes(content: string): Partial<Agent> {
  const agentMatch = content.match(/<agent\s+([^>]+)>/)
  if (!agentMatch) return {}

  const attrs = agentMatch[1]
  const getId = (name: string) => {
    const match = attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'))
    return match ? match[1] : undefined
  }

  return {
    id: getId('id')?.replace('.agent.yaml', '') ?? '',
    name: getId('name') ?? '',
    title: getId('title') ?? '',
    icon: getId('icon'),
    role: getId('capabilities') ?? '',
  }
}

function extractMenuItems(content: string): AgentMenuItem[] {
  const items: AgentMenuItem[] = []
  const itemRegex = /<item\s+([^>]*)>([^<]*)<\/item>/g
  let match

  while ((match = itemRegex.exec(content)) !== null) {
    const attrs = match[1]
    const label = match[2].trim()

    const cmdMatch = attrs.match(/cmd="([^"]*)"/)
    const execMatch = attrs.match(/exec="([^"]*)"/)

    const trigger = cmdMatch
      ? cmdMatch[1]
          .split(/\s+or\s+/i)[0]
          .trim()
          .toLowerCase()
      : ''

    items.push({
      trigger,
      input: label.replace(/^\[.*?\]\s*/, ''),
      route: execMatch ? execMatch[1] : '',
      action: undefined,
    })
  }

  return items
}

export function parseAgent(filePath: string, content: string): ParseResult<Agent> {
  try {
    const { data: frontmatter, content: body } = matter(content)

    const xmlAttrs = extractAgentAttributes(body)
    const menuItems = extractMenuItems(body)

    const agent: Agent = {
      id: xmlAttrs.id || (frontmatter.name as string) || '',
      name: xmlAttrs.name || (frontmatter.name as string) || '',
      title: xmlAttrs.title || (frontmatter.description as string) || '',
      icon: xmlAttrs.icon,
      role: xmlAttrs.role || (frontmatter.description as string) || '',
      module: undefined,
      discussion: false,
      webskip: false,
      hasSidecar: false,
      menu: menuItems,
      skills: [],
      filePath,
    }

    return { ok: true, data: agent }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Agent parse error: ${message}`, filePath }
  }
}
