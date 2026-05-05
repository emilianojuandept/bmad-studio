import type { LintRule, ProjectContextDocLite } from '../types.js'

function section(doc: ProjectContextDocLite, key: string) {
  return doc.sections.find((s) => s.key === key)
}

function bodyLength(doc: ProjectContextDocLite, key: string): number {
  return (section(doc, key)?.body ?? '').replace(/\s+/g, ' ').trim().length
}

function hasPlaceholder(text: string): boolean {
  return /todo|tbd|placeholder|add here|coming soon|fill in|your .* here/i.test(text)
}

export const PC_RULES: LintRule[] = [
  // ── Presence checks ────────────────────────────────────────────────────────
  {
    id: 'PC-001',
    severity: 'error',
    section: 'purpose',
    message: 'Project Overview section is missing.',
    fixGuidance: 'Add a ## Project Overview section describing what the project is, who owns it, and its current status.',
    check: (doc) => !section(doc, 'purpose')?.present,
  },
  {
    id: 'PC-002',
    severity: 'error',
    section: 'tech-stack',
    message: 'Technology Stack section is missing.',
    fixGuidance: 'Add a ## Technology Stack section listing backend, frontend, and key library versions.',
    check: (doc) => !section(doc, 'tech-stack')?.present,
  },
  {
    id: 'PC-003',
    severity: 'warning',
    section: 'architecture',
    message: 'Architecture Overview section is missing.',
    fixGuidance: 'Add a ## Architecture Overview section explaining the high-level structure, key components, and data flow.',
    check: (doc) => !section(doc, 'architecture')?.present,
  },
  {
    id: 'PC-004',
    severity: 'warning',
    section: 'conventions',
    message: 'Conventions section is missing.',
    fixGuidance: 'Add a ## Conventions section with subsections for Naming, File Organization, and any domain-specific patterns.',
    check: (doc) => !section(doc, 'conventions')?.present,
  },
  {
    id: 'PC-005',
    severity: 'info',
    section: 'anti-patterns',
    message: 'Anti-patterns section is missing.',
    fixGuidance: 'Add a ## Anti-patterns section listing common mistakes AI agents should avoid in this codebase.',
    check: (doc) => !section(doc, 'anti-patterns')?.present,
  },
  {
    id: 'PC-006',
    severity: 'info',
    section: 'known-issues',
    message: 'Known Issues section is missing.',
    fixGuidance: 'Add a ## Known Issues section documenting technical debt, active bugs, or workarounds agents need to be aware of.',
    check: (doc) => !section(doc, 'known-issues')?.present,
  },
  {
    id: 'PC-007',
    severity: 'info',
    section: 'adr-index',
    message: 'ADR Index section is missing.',
    fixGuidance: 'Add a ## ADR Index section listing key architecture decisions and their locations.',
    check: (doc) => !section(doc, 'adr-index')?.present,
  },

  // ── Content quality ─────────────────────────────────────────────────────────
  {
    id: 'PC-010',
    severity: 'error',
    message: 'Document is very short (under 300 characters). Agents will lack the context they need.',
    fixGuidance: 'Expand the document with at least a Project Overview, Technology Stack, and one or more Conventions.',
    check: (doc) => doc.raw.replace(/\s+/g, ' ').trim().length < 300,
  },
  {
    id: 'PC-011',
    severity: 'warning',
    section: 'purpose',
    message: 'Project Overview is too brief (under 100 characters).',
    fixGuidance: 'Expand the Project Overview to include the project\'s purpose, key stakeholders, and current status.',
    check: (doc) => (section(doc, 'purpose')?.present ?? false) && bodyLength(doc, 'purpose') < 100,
  },
  {
    id: 'PC-012',
    severity: 'warning',
    section: 'tech-stack',
    message: 'Technology Stack is too brief (under 80 characters).',
    fixGuidance: 'List specific frameworks, libraries, and versions. Include at least the primary language, framework, and database/storage.',
    check: (doc) => (section(doc, 'tech-stack')?.present ?? false) && bodyLength(doc, 'tech-stack') < 80,
  },
  {
    id: 'PC-013',
    severity: 'warning',
    message: 'One or more sections contain placeholder text (TODO, TBD, etc.).',
    fixGuidance: 'Replace all placeholder text with real project content before sharing with agents.',
    check: (doc) => doc.sections.some((s) => s.present && hasPlaceholder(s.body)),
  },
  {
    id: 'PC-014',
    severity: 'info',
    section: 'conventions',
    message: 'Conventions section has no subsections. Consider breaking it into Naming, File Organization, etc.',
    fixGuidance: 'Use ### headings inside Conventions to separate naming conventions, file organization, testing patterns, etc.',
    check: (doc) => {
      const s = section(doc, 'conventions')
      return (s?.present ?? false) && (!s?.subsections || s.subsections.length === 0)
    },
  },
  {
    id: 'PC-015',
    severity: 'info',
    section: 'tech-stack',
    message: 'Technology Stack doesn\'t mention a version number anywhere.',
    fixGuidance: 'Include version numbers (e.g. "Node.js v20+", "React 18") so agents know exactly what APIs are available.',
    check: (doc) => {
      const body = section(doc, 'tech-stack')?.body ?? ''
      return (section(doc, 'tech-stack')?.present ?? false) && !/v?\d+\.\d+/.test(body)
    },
  },
  {
    id: 'PC-016',
    severity: 'warning',
    section: 'architecture',
    message: 'Architecture Overview section is very short (under 150 characters).',
    fixGuidance: 'Describe the major subsystems, how they communicate, and any important constraints (e.g. "no database, file-system only").',
    check: (doc) => (section(doc, 'architecture')?.present ?? false) && bodyLength(doc, 'architecture') < 150,
  },
  {
    id: 'PC-017',
    severity: 'info',
    message: 'Document has no custom sections. Consider adding an Operational Context or External Dependencies section.',
    fixGuidance: 'Custom sections (any ## heading not in the canonical list) are preserved and surfaced to agents. Use them for project-specific context.',
    check: (doc) => doc.customSections.length === 0 && doc.sections.filter((s) => s.present).length < 4,
  },
]
