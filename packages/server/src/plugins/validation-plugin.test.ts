import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { createApp } from '../app.js'

describe('validation-plugin', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'validation-plugin-test-'))
    fs.mkdirSync(path.join(tmpDir, '_bmad', 'bmm'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, '_bmad', 'bmm', 'config.yaml'), 'project_name: test\n')
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  function createTestApp() {
    return createApp({
      logger: false,
      serveStatic: false,
      project: {
        projectRoot: tmpDir,
        bmadVersion: '6.2.0',
        versionSupported: true,
        modules: [{ name: 'bmm', version: '6.2.0', source: 'built-in' }],
        ideDirectories: [],
      },
    })
  }

  function createWorkflowWithSteps(wfName: string, stepFiles: string[], stepDir = 'steps') {
    const wfDir = path.join(tmpDir, '_bmad', 'bmm', 'workflows', wfName)
    fs.mkdirSync(wfDir, { recursive: true })
    fs.writeFileSync(path.join(wfDir, 'workflow.md'), `# ${wfName}\n\n**Goal:** Test workflow.\n`)
    const stepsDir = path.join(wfDir, stepDir)
    fs.mkdirSync(stepsDir, { recursive: true })
    for (const file of stepFiles) {
      fs.writeFileSync(path.join(stepsDir, file), `# ${file}\n`)
    }
  }

  it('detects duplicate step numbers in steps/', async () => {
    createWorkflowWithSteps('dup-test', [
      'step-01-init.md',
      'step-01-setup.md',
      'step-02-execute.md',
    ])

    const app = await createTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/validation' })
    const result = JSON.parse(response.body)

    const dupIssues = result.issues.filter(
      (i: { code: string }) => i.code === 'DUPLICATE_STEP_NUMBER',
    )
    expect(dupIssues).toHaveLength(1)
    expect(dupIssues[0].severity).toBe('warning')
    expect(dupIssues[0].message).toContain('duplicate step number 01')
    expect(dupIssues[0].message).toContain('step-01-init.md')
    expect(dupIssues[0].message).toContain('step-01-setup.md')

    await app.close()
  })

  it('does not flag variant steps as duplicates', async () => {
    createWorkflowWithSteps('variant-test', [
      'step-01-init.md',
      'step-01b-continue.md',
      'step-02-execute.md',
    ])

    const app = await createTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/validation' })
    const result = JSON.parse(response.body)

    const dupIssues = result.issues.filter(
      (i: { code: string }) => i.code === 'DUPLICATE_STEP_NUMBER',
    )
    expect(dupIssues).toHaveLength(0)

    await app.close()
  })

  it('detects duplicates in variant step directories', async () => {
    createWorkflowWithSteps(
      'variant-dir-dup',
      ['step-01-create.md', 'step-01-validate.md'],
      'steps-c',
    )

    const app = await createTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/validation' })
    const result = JSON.parse(response.body)

    const dupIssues = result.issues.filter(
      (i: { code: string }) => i.code === 'DUPLICATE_STEP_NUMBER',
    )
    expect(dupIssues).toHaveLength(1)
    expect(dupIssues[0].message).toContain('steps-c')

    await app.close()
  })

  it('skips step validation for agent-based workflows', async () => {
    const wfDir = path.join(tmpDir, '_bmad', 'bmm', 'workflows', 'agent-wf')
    fs.mkdirSync(wfDir, { recursive: true })
    fs.mkdirSync(path.join(wfDir, 'agents'))
    fs.mkdirSync(path.join(wfDir, 'prompts'))
    fs.writeFileSync(
      path.join(wfDir, 'bmad-manifest.json'),
      JSON.stringify({ name: 'Agent Workflow' }),
    )

    const app = await createTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/validation' })
    const result = JSON.parse(response.body)

    const dupIssues = result.issues.filter(
      (i: { code: string }) => i.code === 'DUPLICATE_STEP_NUMBER',
    )
    expect(dupIssues).toHaveLength(0)

    await app.close()
  })

  it('no false positives for normal step sequences', async () => {
    createWorkflowWithSteps('normal-test', [
      'step-01-init.md',
      'step-02-plan.md',
      'step-03-execute.md',
    ])

    const app = await createTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/validation' })
    const result = JSON.parse(response.body)

    const dupIssues = result.issues.filter(
      (i: { code: string }) => i.code === 'DUPLICATE_STEP_NUMBER',
    )
    expect(dupIssues).toHaveLength(0)

    await app.close()
  })

  // --- Team Validation ---

  function createTeamWithAgents(teamName: string, agents: string[]) {
    const teamsDir = path.join(tmpDir, '_bmad', 'bmm', 'teams')
    fs.mkdirSync(teamsDir, { recursive: true })

    const yaml = [
      'bundle:',
      `  name: ${teamName}`,
      '  icon: ""',
      '  description: Test team',
      'agents:',
      ...agents.map((a) => `  - ${a}`),
      'party: ""',
    ].join('\n')

    const slug = teamName.toLowerCase().replace(/\s+/g, '-')
    fs.writeFileSync(path.join(teamsDir, `team-${slug}.yaml`), yaml)
  }

  function createAgentFile(agentId: string) {
    const agentsDir = path.join(tmpDir, '_bmad', 'bmm', 'agents')
    fs.mkdirSync(agentsDir, { recursive: true })
    fs.writeFileSync(
      path.join(agentsDir, `${agentId}.md`),
      `---\nname: "${agentId}"\n---\n\n<agent id="${agentId}" name="${agentId}" title="Test Agent" capabilities="testing">\n</agent>\n`,
    )
  }

  it('detects missing team agent references', async () => {
    createTeamWithAgents('Alpha Team', ['existing-agent', 'missing-agent'])
    createAgentFile('existing-agent')

    const app = await createTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/validation' })
    const result = JSON.parse(response.body)

    const teamIssues = result.issues.filter(
      (i: { code: string }) => i.code === 'MISSING_TEAM_AGENT_REF',
    )
    expect(teamIssues).toHaveLength(1)
    expect(teamIssues[0].severity).toBe('warning')
    expect(teamIssues[0].message).toContain('missing-agent')
    expect(teamIssues[0].entityType).toBe('team')

    await app.close()
  })

  it('no false positives for valid team agent references', async () => {
    createTeamWithAgents('Good Team', ['agent-a', 'agent-b'])
    createAgentFile('agent-a')
    createAgentFile('agent-b')

    const app = await createTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/validation' })
    const result = JSON.parse(response.body)

    const teamIssues = result.issues.filter(
      (i: { code: string }) => i.code === 'MISSING_TEAM_AGENT_REF',
    )
    expect(teamIssues).toHaveLength(0)

    await app.close()
  })

  it('reports multiple missing agents in a single team', async () => {
    createTeamWithAgents('Broken Team', ['ghost-a', 'ghost-b', 'ghost-c'])

    const app = await createTestApp()
    const response = await app.inject({ method: 'GET', url: '/api/validation' })
    const result = JSON.parse(response.body)

    const teamIssues = result.issues.filter(
      (i: { code: string }) => i.code === 'MISSING_TEAM_AGENT_REF',
    )
    expect(teamIssues).toHaveLength(3)
    expect(teamIssues.every((i: { entityType: string }) => i.entityType === 'team')).toBe(true)

    await app.close()
  })
})
