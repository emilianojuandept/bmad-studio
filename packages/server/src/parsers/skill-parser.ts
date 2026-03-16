import matter from 'gray-matter'

import type { Skill } from '@bmad-studio/shared'

import type { ParseResult } from './config-parser.js'

export function parseSkill(filePath: string, content: string): ParseResult<Skill> {
  try {
    const { data: frontmatter, content: body } = matter(content)

    const skill: Skill = {
      id: (frontmatter.name as string) || '',
      name: (frontmatter.name as string) || '',
      description: (frontmatter.description as string) || '',
      bestFor: frontmatter.best_for as string[] | undefined,
      content: body.trim(),
      filePath,
      module: undefined,
    }

    return { ok: true, data: skill }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `Skill parse error: ${message}`, filePath }
  }
}
