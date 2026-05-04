export type Severity = 'error' | 'warning' | 'info'

export type ParsedSectionLite = {
  key: string
  heading: string
  body: string
  present: boolean
  subsections?: ParsedSectionLite[]
}

export type ProjectContextDocLite = {
  sections: ParsedSectionLite[]
  customSections: ParsedSectionLite[]
  raw: string
}

export type LintRule = {
  id: string
  severity: Severity
  section?: string
  message: string
  fixGuidance?: string
  check: (doc: ProjectContextDocLite) => boolean
}

export type LintFinding = {
  ruleId: string
  severity: Severity
  section?: string
  message: string
  fixGuidance?: string
}
