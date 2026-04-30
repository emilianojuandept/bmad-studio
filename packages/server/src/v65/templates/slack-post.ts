import { registerTemplate } from '../hook-template-registry.js'

registerTemplate({
  id: 'slack-post',
  label: 'Slack post',
  description: 'Posts a message to Slack via incoming webhook',
  surfaces: ['onComplete'],
  params: [
    {
      name: 'webhookEnvVar',
      type: 'string',
      label: 'Webhook env var',
      default: 'SLACK_WEBHOOK',
    },
    { name: 'message', type: 'string', label: 'Message', required: true },
  ],
  render: ({ webhookEnvVar, message }) => {
    const env = String(webhookEnvVar ?? 'SLACK_WEBHOOK')
    const escaped = String(message).replace(/'/g, "\\'")
    return `curl -s -X POST $${env} -H 'Content-type: application/json' -d '{"text":"${escaped}"}'`
  },
})
