import type { Severity } from './errors.js'

export type ValidationIssue = {
  severity: Severity
  code: string
  message: string
  entityType?: string
  entityId?: string
  field?: string
}

export type ValidationResult = {
  valid: boolean
  issues: ValidationIssue[]
}
