/**
 * DriftConvertFlow — placeholder added in Story 36.3 to keep the sidebar
 * import graph stable. Story 36.5 fills in the diff fetch + customize-editor
 * navigation. Renders nothing until expanded in 36.5.
 */

export type DriftConvertFlowProps = {
  token: string | null
  onClose: () => void
}

export function DriftConvertFlow({ token, onClose: _onClose }: DriftConvertFlowProps) {
  if (!token) return null
  return null
}
