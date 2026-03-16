import path from 'node:path'

import type { FastifyInstance } from 'fastify'
import type { ValidationResult, ValidationIssue } from '@bmad-studio/shared'
import type { Workflow, WorkflowStep } from '@bmad-studio/shared'

const STEP_NUM_RE = /^step-(\d+)([a-z])?-/

function checkDuplicateStepNumbers(workflow: Workflow, issues: ValidationIssue[]) {
  // Skip agent-based workflows (no steps)
  if (workflow.type === 'agent-based' || workflow.steps.length === 0) return

  // Group steps by variantSet (each directory checked independently)
  const groups = new Map<string, WorkflowStep[]>()
  for (const step of workflow.steps) {
    const key = step.variantSet ?? 'steps'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(step)
  }

  for (const [dir, steps] of groups) {
    // Track base numbers for steps WITHOUT letter suffix only
    const seen = new Map<string, string>() // number → filename

    for (const step of steps) {
      const filename = path.basename(step.filePath)
      const match = STEP_NUM_RE.exec(filename)
      if (!match) continue

      const baseNum = match[1]
      const hasSuffix = match[2] !== undefined

      // Only flag duplicates for steps without a letter suffix
      if (hasSuffix) continue

      if (seen.has(baseNum)) {
        issues.push({
          severity: 'warning',
          code: 'DUPLICATE_STEP_NUMBER',
          message: `Workflow "${workflow.name}" has duplicate step number ${baseNum} in ${dir}: ${seen.get(baseNum)}, ${filename}`,
          entityType: 'workflow',
          entityId: workflow.id,
        })
      } else {
        seen.set(baseNum, filename)
      }
    }
  }
}

function validateEntities(app: FastifyInstance): ValidationResult {
  if (!('fileStore' in app)) {
    return { valid: true, issues: [] }
  }

  const index = app.fileStore.getIndex()
  const issues: ValidationIssue[] = []

  // Check workflow agent references
  for (const workflow of index.workflows) {
    for (const step of workflow.steps) {
      if (step.agent) {
        const agentExists = index.agents.some((a) => a.id === step.agent || a.name === step.agent)
        if (!agentExists) {
          issues.push({
            severity: 'warning',
            code: 'MISSING_AGENT_REF',
            message: `Workflow "${workflow.name}" step references agent "${step.agent}" which was not found`,
            entityType: 'workflow',
            entityId: workflow.id,
          })
        }
      }
    }

    // Check duplicate step numbers
    checkDuplicateStepNumbers(workflow, issues)
  }

  // Check team agent references
  for (const team of index.teams) {
    for (const agentId of team.agentIds) {
      const agentExists = index.agents.some((a) => a.id === agentId || a.name === agentId)
      if (!agentExists) {
        issues.push({
          severity: 'warning',
          code: 'MISSING_TEAM_AGENT_REF',
          message: `Team "${team.name}" references agent "${agentId}" which was not found`,
          entityType: 'team',
          entityId: team.id,
        })
      }
    }
  }

  // Report parse errors as validation issues
  for (const error of index.errors) {
    issues.push({
      severity: 'error',
      code: 'PARSE_ERROR',
      message: error.error,
      field: error.filePath,
    })
  }

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
  }
}

export async function validationPlugin(app: FastifyInstance) {
  app.get('/api/validation', async () => {
    return validateEntities(app)
  })
}
