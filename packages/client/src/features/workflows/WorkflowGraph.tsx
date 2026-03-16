import { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { Workflow } from '@bmad-studio/shared'

type StepNodeData = {
  label: string
  description: string
  agent?: string
  index: number
}

function StepNode({ data }: NodeProps<Node<StepNodeData>>) {
  return (
    <div className="px-4 py-3 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] shadow-sm min-w-[180px] max-w-[240px]">
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-accent)]" />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-[var(--color-accent)] font-[var(--font-mono)]">
          {data.index + 1}
        </span>
        <span className="text-sm font-bold text-[var(--color-text)] truncate">{data.label}</span>
      </div>
      {data.description && (
        <p className="text-xs text-[var(--color-muted)] line-clamp-2">{data.description}</p>
      )}
      {data.agent && (
        <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg)] border border-[var(--color-border-subtle)] text-[var(--color-muted)]">
          {data.agent}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-accent)]" />
    </div>
  )
}

const nodeTypes = { step: StepNode }

type WorkflowGraphProps = {
  workflow: Workflow
  onStepClick?: (stepIndex: number) => void
}

export function WorkflowGraph({ workflow, onStepClick }: WorkflowGraphProps) {
  const { nodes, edges } = useMemo(() => {
    const VERTICAL_GAP = 120
    const X_POS = 250

    const graphNodes: Node<StepNodeData>[] = workflow.steps.map((step, i) => ({
      id: `step-${i}`,
      type: 'step',
      position: { x: X_POS, y: i * VERTICAL_GAP },
      data: {
        label: step.title,
        description: step.description,
        agent: step.agent,
        index: i,
      },
    }))

    const graphEdges: Edge[] = workflow.steps.slice(0, -1).map((_, i) => ({
      id: `edge-${i}`,
      source: `step-${i}`,
      target: `step-${i + 1}`,
      animated: true,
      style: { stroke: 'var(--color-accent)', strokeWidth: 2 },
    }))

    return { nodes: graphNodes, edges: graphEdges }
  }, [workflow.steps])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const index = parseInt(node.id.replace('step-', ''), 10)
      onStepClick?.(index)
    },
    [onStepClick],
  )

  return (
    <div className="h-[500px] rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="var(--color-border-subtle)" />
        <Controls
          showInteractive={false}
          className="!bg-[var(--color-surface-raised)] !border-[var(--color-border-subtle)] !shadow-md [&>button]:!bg-[var(--color-surface-raised)] [&>button]:!border-[var(--color-border-subtle)] [&>button]:!text-[var(--color-text)]"
        />
      </ReactFlow>
    </div>
  )
}
