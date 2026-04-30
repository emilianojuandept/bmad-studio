import { registerTemplate } from '../hook-template-registry.js'

registerTemplate({
  id: 'git-tag',
  label: 'Git tag',
  description: 'Creates a timestamped git tag and pushes it',
  surfaces: ['onComplete'],
  params: [
    { name: 'tagPrefix', type: 'string', label: 'Tag prefix', default: 'bmad' },
  ],
  render: ({ tagPrefix }) =>
    `git tag ${String(tagPrefix ?? 'bmad')}-$(date +%s) && git push --tags`,
})
