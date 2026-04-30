import { registerTemplate } from '../hook-template-registry.js'

registerTemplate({
  id: 'raw-shell',
  label: 'Raw shell command',
  description: 'Runs an arbitrary shell command',
  surfaces: ['activationStepsPrepend', 'activationStepsAppend', 'onComplete'],
  params: [
    { name: 'command', type: 'string', label: 'Command', required: true },
  ],
  render: ({ command }) => String(command),
})
