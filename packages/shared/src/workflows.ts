export type WorkflowType = 'step-based' | 'agent-based' | 'composite'

export type WorkflowTemplate = {
  filePath: string
  name: string
}

export type WorkflowSubWorkflow = {
  filePath: string
  name: string
}

export type WorkflowStep = {
  filePath: string
  title: string
  description: string
  agent?: string
  inputs?: string[]
  outputs?: string[]
  isVariant?: boolean
  variantSet?: string
}

export type Workflow = {
  id: string
  name: string
  description: string
  entryPoint: string
  steps: WorkflowStep[]
  filePath: string
  module?: string
  type?: WorkflowType
  phase?: string
  templates?: WorkflowTemplate[]
  subWorkflows?: WorkflowSubWorkflow[]
  supportingFiles?: string[]
}

export type WorkflowListItem = {
  id: string
  name: string
  description: string
  module?: string
  stepCount: number
  type?: WorkflowType
  phase?: string
}
