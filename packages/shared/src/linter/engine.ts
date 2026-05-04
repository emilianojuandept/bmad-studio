import type { LintRule, LintFinding, ProjectContextDocLite } from './types.js'

export function runLinter(doc: ProjectContextDocLite, rules: LintRule[]): LintFinding[] {
  const findings: LintFinding[] = []
  for (const rule of rules) {
    if (rule.check(doc)) {
      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        section: rule.section,
        message: rule.message,
        fixGuidance: rule.fixGuidance,
      })
    }
  }
  return findings
}

export function computeQualityScore(findings: LintFinding[]): number {
  const penalty = findings.reduce((acc, f) => {
    if (f.severity === 'error') return acc + 10
    if (f.severity === 'warning') return acc + 3
    return acc + 1
  }, 0)
  return Math.max(0, 100 - penalty)
}

export function scoreLabel(score: number): 'Weak' | 'Acceptable' | 'Good' | 'Strong' {
  if (score < 40) return 'Weak'
  if (score < 65) return 'Acceptable'
  if (score < 85) return 'Good'
  return 'Strong'
}
