import path from 'node:path'

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

function extractPersona(content: string): { identity?: string; communicationStyle?: string; principles?: string } {
  const personaMatch = content.match(/<persona>([\s\S]*?)<\/persona>/)
  if (!personaMatch) return {}

  const block = personaMatch[1]

  const getTag = (tag: string): string | undefined => {
    const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
    return m ? m[1].trim() : undefined
  }

  return {
    identity: getTag('identity'),
    communicationStyle: getTag('communication_style'),
    principles: getTag('principles'),
  }
}

function extractH1(body: string): string | undefined {
  const match = /^#\s+(.+)$/m.exec(body)
  return match ? match[1].trim() : undefined
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
    const persona = extractPersona(body)

    // v6.5 plain-markdown agents have no XML/frontmatter — fall back to H1 heading + filename
    const h1Name = extractH1(body)
    const fileBaseName = path.basename(filePath, '.md')

    const agent: Agent = {
      id: xmlAttrs.id || (frontmatter.name as string) || fileBaseName,
      name: xmlAttrs.name || (frontmatter.name as string) || h1Name || fileBaseName,
      title: xmlAttrs.title || (frontmatter.description as string) || h1Name || '',
      icon: xmlAttrs.icon,
      role: xmlAttrs.role || (frontmatter.description as string) || '',
      module: undefined,
      discussion: false,
      webskip: false,
      hasSidecar: false,
      menu: menuItems,
      skills: [],
      identity: persona.identity,
      communicationStyle: persona.communicationStyle,
      principles: persona.principles,
      filePath,
    }

    return { ok: true, data: agent }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Agent parse error: ${message}`, filePath }
  }
}
