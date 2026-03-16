import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

const vocabulary: Record<string, string> = {
  agent:
    'An AI agent is a persona with a specific role (like PM, Architect, or Developer). Each agent has skills, menu commands, and optional customizations.',
  skill:
    'A skill is a capability that can be assigned to agents. Skills are markdown files with instructions that agents follow.',
  workflow:
    'A workflow is a sequence of steps that agents perform. Each step has inputs, an assigned agent, and deliverables.',
  module:
    'A module is a versioned collection of agents, skills, and workflows. Built-in modules (core, bmm) come with BMAD; external modules can be installed.',
  override:
    'An override customizes a built-in agent for your project. It can change the name, add menu items, or modify behavior without editing the original.',
  package:
    'A portable bundle of BMAD entities exported from one project for import into another. Includes agents, skills, workflows, and templates.',
  template:
    'A starting point for deliverables. Referenced by skills and workflows to create consistent output documents.',
}

type VocabularyHelperProps = {
  term: string
}

export function VocabularyHelper({ term }: VocabularyHelperProps) {
  const [expanded, setExpanded] = useState(false)
  const definition = vocabulary[term.toLowerCase()]

  if (!definition) return null

  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={() => setExpanded(!expanded)}
        className="ml-1 text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors"
        aria-label={`What is ${term}?`}
      >
        <HelpCircle size={14} />
      </button>
      {expanded && (
        <div className="absolute left-0 top-6 z-10 w-64 p-3 text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-lg shadow-lg">
          <p className="font-bold mb-1 capitalize">{term}</p>
          <p className="text-[var(--color-muted)]">{definition}</p>
        </div>
      )}
    </span>
  )
}
