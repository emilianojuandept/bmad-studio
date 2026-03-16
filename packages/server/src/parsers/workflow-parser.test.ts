import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { parseWorkflow } from './workflow-parser.js'

describe('workflow-parser', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-test-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('parses step-based workflow with steps directory', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'workflow.md'),
      `---
main_config: '{project-root}/_bmad/bmm/config.yaml'
---

# PRD Create Workflow

**Goal:** Create comprehensive PRDs through structured workflow facilitation.
`,
    )
    const stepsDir = path.join(tmpDir, 'steps')
    fs.mkdirSync(stepsDir)
    fs.writeFileSync(path.join(stepsDir, 'step-01-init.md'), '# Step 1')
    fs.writeFileSync(path.join(stepsDir, 'step-02-discovery.md'), '# Step 2')

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.name).toBe('PRD Create Workflow')
      expect(result.data.description).toBe(
        'Create comprehensive PRDs through structured workflow facilitation.',
      )
      expect(result.data.steps).toHaveLength(2)
      expect(result.data.steps[0].filePath).toBe(path.join(tmpDir, 'steps/step-01-init.md'))
      expect(result.data.steps[0].title).toBe('init')
      expect(result.data.type).toBe('step-based')
    }
  })

  it('returns error when workflow.md missing and no bmad-manifest.json', () => {
    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('workflow.md not found')
    }
  })

  it('handles workflow with no step directories', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'workflow.md'),
      `---
name: simple
---
# Simple Workflow
`,
    )

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.steps).toHaveLength(0)
      expect(result.data.type).toBe('step-based')
    }
  })

  // --- Type Classification Tests ---

  it('classifies agent-based workflow from bmad-manifest.json + agents/ + prompts/', () => {
    fs.mkdirSync(path.join(tmpDir, 'agents'))
    fs.mkdirSync(path.join(tmpDir, 'prompts'))
    fs.mkdirSync(path.join(tmpDir, 'resources'))
    fs.writeFileSync(
      path.join(tmpDir, 'bmad-manifest.json'),
      JSON.stringify({ name: 'Product Brief Preview', description: 'Creates product briefs' }),
    )
    fs.writeFileSync(
      path.join(tmpDir, 'SKILL.md'),
      `---
name: Product Brief
description: Brief creation skill
---
# Product Brief Skill
`,
    )

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('agent-based')
      expect(result.data.name).toBe('Product Brief Preview')
      expect(result.data.description).toBe('Creates product briefs')
      expect(result.data.steps).toHaveLength(0)
      expect(result.data.filePath).toBe(path.join(tmpDir, 'bmad-manifest.json'))
    }
  })

  it('classifies composite workflow from workflow.md + workflows/ subdirectory', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'workflow.md'),
      `# Router Workflow

**Goal:** Routes to sub-workflows based on user choice.
`,
    )
    fs.writeFileSync(path.join(tmpDir, 'instructions.md'), '# Instructions')
    fs.mkdirSync(path.join(tmpDir, 'workflows'))
    fs.writeFileSync(path.join(tmpDir, 'workflows', 'sub-workflow-a.md'), '# Sub A')

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('composite')
    }
  })

  it('step-based takes precedence over composite when both steps/ and workflows/ exist', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Ambiguous Workflow\n')
    fs.mkdirSync(path.join(tmpDir, 'steps'))
    fs.writeFileSync(path.join(tmpDir, 'steps', 'step-01-init.md'), '# Step 1')
    fs.mkdirSync(path.join(tmpDir, 'workflows'))

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('step-based')
      expect(result.data.steps).toHaveLength(1)
    }
  })

  // --- Phase Extraction Tests ---

  it('extracts phase from parent directory matching {N}-{name}/ pattern', () => {
    const phaseDir = path.join(tmpDir, '2-plan-workflows')
    const wfDir = path.join(phaseDir, 'create-prd')
    fs.mkdirSync(phaseDir, { recursive: true })
    fs.mkdirSync(wfDir)
    fs.writeFileSync(path.join(wfDir, 'workflow.md'), '# Create PRD\n')

    const result = parseWorkflow(wfDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.phase).toBe('2-plan-workflows')
    }
  })

  it('does not set phase for non-numbered parent directories', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# No Phase Workflow\n')

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.phase).toBeUndefined()
    }
  })

  // --- Dynamic Step Directory Scanning Tests ---

  it('discovers steps from multiple step directories including custom names', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Multi-Step Workflow\n')

    // Primary steps
    fs.mkdirSync(path.join(tmpDir, 'steps'))
    fs.writeFileSync(path.join(tmpDir, 'steps', 'step-01-init.md'), '# Step 1')

    // Variant directories
    fs.mkdirSync(path.join(tmpDir, 'steps-c'))
    fs.writeFileSync(path.join(tmpDir, 'steps-c', 'step-01-continue.md'), '# Continue')

    fs.mkdirSync(path.join(tmpDir, 'steps-e'))
    fs.writeFileSync(path.join(tmpDir, 'steps-e', 'step-01-edit.md'), '# Edit')

    // Custom step directory
    fs.mkdirSync(path.join(tmpDir, 'steps-v'))
    fs.writeFileSync(path.join(tmpDir, 'steps-v', 'step-01-validate.md'), '# Validate')

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.steps).toHaveLength(4)

      // Primary steps have no variantSet
      const primaryStep = result.data.steps.find((s) => s.filePath.includes('steps/step-01'))
      expect(primaryStep?.variantSet).toBeUndefined()

      // Variant directories have variantSet set
      const cStep = result.data.steps.find((s) => s.filePath.includes('steps-c/'))
      expect(cStep?.variantSet).toBe('steps-c')

      const eStep = result.data.steps.find((s) => s.filePath.includes('steps-e/'))
      expect(eStep?.variantSet).toBe('steps-e')

      const vStep = result.data.steps.find((s) => s.filePath.includes('steps-v/'))
      expect(vStep?.variantSet).toBe('steps-v')
    }
  })

  it('discovers custom-named step directories ending with -steps', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Custom Steps Workflow\n')
    fs.mkdirSync(path.join(tmpDir, 'domain-steps'))
    fs.writeFileSync(path.join(tmpDir, 'domain-steps', 'step-01-domain.md'), '# Domain Step')

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.steps).toHaveLength(1)
      expect(result.data.steps[0].variantSet).toBe('domain-steps')
    }
  })

  // --- Variant Step Detection Tests ---

  it('detects variant steps from filename pattern step-{NN}{letter}-', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Variant Workflow\n')
    fs.mkdirSync(path.join(tmpDir, 'steps'))
    fs.writeFileSync(path.join(tmpDir, 'steps', 'step-01-init.md'), '# Primary')
    fs.writeFileSync(path.join(tmpDir, 'steps', 'step-01b-continue.md'), '# Variant')
    fs.writeFileSync(path.join(tmpDir, 'steps', 'step-02-next.md'), '# Primary 2')

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const primary = result.data.steps.find((s) => s.title === 'init')
      expect(primary?.isVariant).toBe(false)

      const variant = result.data.steps.find((s) => s.title === 'continue')
      expect(variant?.isVariant).toBe(true)

      const primary2 = result.data.steps.find((s) => s.title === 'next')
      expect(primary2?.isVariant).toBe(false)
    }
  })

  // --- Agent-based fallback ---

  it('falls back to agent-based parsing when only bmad-manifest.json exists', () => {
    fs.mkdirSync(path.join(tmpDir, 'agents'))
    fs.mkdirSync(path.join(tmpDir, 'prompts'))
    fs.writeFileSync(
      path.join(tmpDir, 'bmad-manifest.json'),
      JSON.stringify({ name: 'Test Agent Workflow' }),
    )

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.type).toBe('agent-based')
      expect(result.data.name).toBe('Test Agent Workflow')
    }
  })

  // --- Template Discovery Tests ---

  it('discovers *.template.md files as workflow templates', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Template Workflow\n')
    fs.writeFileSync(path.join(tmpDir, 'research.template.md'), '# Research Template')
    fs.writeFileSync(path.join(tmpDir, 'product-brief.template.md'), '# Brief Template')
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Not a template')

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.templates).toHaveLength(2)
      expect(result.data.templates![0].name).toBe('product-brief')
      expect(result.data.templates![1].name).toBe('research')
      expect(result.data.templates![0].filePath).toBe(
        path.join(tmpDir, 'product-brief.template.md'),
      )
    }
  })

  // --- Sub-Workflow Discovery Tests ---

  it('discovers sub-workflows from workflows/ subdirectory', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Composite Workflow\n')
    fs.writeFileSync(path.join(tmpDir, 'instructions.md'), '# Instructions')
    fs.mkdirSync(path.join(tmpDir, 'workflows'))
    fs.writeFileSync(path.join(tmpDir, 'workflows', 'sub-create.md'), '# Sub Create')
    fs.writeFileSync(path.join(tmpDir, 'workflows', 'sub-validate.md'), '# Sub Validate')

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.subWorkflows).toHaveLength(2)
      expect(result.data.subWorkflows![0].name).toBe('sub-create')
      expect(result.data.subWorkflows![1].name).toBe('sub-validate')
    }
  })

  // --- Supporting Files Discovery Tests ---

  it('discovers supporting directories (agents, prompts, resources, data)', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Supported Workflow\n')
    fs.mkdirSync(path.join(tmpDir, 'steps'))
    fs.writeFileSync(path.join(tmpDir, 'steps', 'step-01-init.md'), '# Step')
    fs.mkdirSync(path.join(tmpDir, 'data'))
    fs.mkdirSync(path.join(tmpDir, 'resources'))

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.supportingFiles).toHaveLength(2)
      expect(result.data.supportingFiles).toContain(path.join(tmpDir, 'data'))
      expect(result.data.supportingFiles).toContain(path.join(tmpDir, 'resources'))
    }
  })

  // --- Step Description Extraction Tests ---

  it('extracts step description from ## STEP GOAL section', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Goal Workflow\n')
    fs.mkdirSync(path.join(tmpDir, 'steps'))
    fs.writeFileSync(
      path.join(tmpDir, 'steps', 'step-01-init.md'),
      `---
name: step-01-init
---

# Step 1: Initialize

## STEP GOAL:

Validate outputs using the workflow checklist and record findings.

## MANDATORY EXECUTION RULES:
`,
    )

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.steps[0].description).toBe(
        'Validate outputs using the workflow checklist and record findings.',
      )
    }
  })

  it('extracts step description from frontmatter when no STEP GOAL section', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# FM Workflow\n')
    fs.mkdirSync(path.join(tmpDir, 'steps'))
    fs.writeFileSync(
      path.join(tmpDir, 'steps', 'step-01-init.md'),
      `---
name: step-01-init
description: 'Initialize the workflow context'
---

# Step 1: Init
`,
    )

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.steps[0].description).toBe('Initialize the workflow context')
    }
  })

  it('extracts step description from first paragraph as fallback', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Fallback Workflow\n')
    fs.mkdirSync(path.join(tmpDir, 'steps'))
    fs.writeFileSync(
      path.join(tmpDir, 'steps', 'step-01-init.md'),
      `# Step 1

This step initializes the project context for further processing.

More details here.
`,
    )

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.steps[0].description).toBe(
        'This step initializes the project context for further processing.',
      )
    }
  })

  it('returns empty description when step file has no discernible content', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Empty Step Workflow\n')
    fs.mkdirSync(path.join(tmpDir, 'steps'))
    fs.writeFileSync(path.join(tmpDir, 'steps', 'step-01-init.md'), '')

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.steps[0].description).toBe('')
    }
  })

  // --- Empty arrays for missing content ---

  it('returns empty arrays when no templates, sub-workflows, or supporting files exist', () => {
    fs.writeFileSync(path.join(tmpDir, 'workflow.md'), '# Simple Workflow\n')

    const result = parseWorkflow(tmpDir)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.templates).toEqual([])
      expect(result.data.subWorkflows).toEqual([])
      expect(result.data.supportingFiles).toEqual([])
    }
  })
})
