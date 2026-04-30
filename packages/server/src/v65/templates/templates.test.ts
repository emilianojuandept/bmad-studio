import { describe, it, expect, beforeAll } from 'vitest'

import { HOOK_TEMPLATES, getTemplate } from '../hook-template-registry.js'

// Side-effect imports register the templates under test
import './raw-shell.js'
import './slack-post.js'
import './git-tag.js'

describe('hook templates 1-3 (Story 35.6)', () => {
  beforeAll(() => {
    expect(HOOK_TEMPLATES.size).toBeGreaterThanOrEqual(3)
  })

  it('raw-shell renders the command verbatim', () => {
    const t = getTemplate('raw-shell')
    expect(t).toBeDefined()
    expect(t!.surfaces).toEqual(['activationStepsPrepend', 'activationStepsAppend', 'onComplete'])
    expect(t!.render({ command: 'npm run lint' })).toBe('npm run lint')
  })

  it('slack-post renders a curl command with webhook env var and message', () => {
    const t = getTemplate('slack-post')
    expect(t).toBeDefined()
    const rendered = t!.render({ webhookEnvVar: 'SLACK_WEBHOOK', message: 'Hello team' })
    expect(rendered).toBe(
      `curl -s -X POST $SLACK_WEBHOOK -H 'Content-type: application/json' -d '{"text":"Hello team"}'`,
    )
  })

  it('slack-post escapes single quotes inside message', () => {
    const t = getTemplate('slack-post')
    const rendered = t!.render({
      webhookEnvVar: 'SLACK_WEBHOOK',
      message: "It's done",
    })
    expect(rendered).toContain("It\\'s done")
  })

  it('git-tag renders with prefix and date placeholder', () => {
    const t = getTemplate('git-tag')
    expect(t).toBeDefined()
    expect(t!.render({ tagPrefix: 'release' })).toBe('git tag release-$(date +%s) && git push --tags')
  })
})
