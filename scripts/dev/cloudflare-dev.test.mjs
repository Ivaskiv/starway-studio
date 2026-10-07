import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCloudflareDevChildEnv,
  classifyCloudflareProcessExit,
  startRuntimeAfterTunnelReady,
} from './cloudflare-dev.mjs'

test('cloudflared exit after readiness shuts down the local runtime', () => {
  assert.equal(
    classifyCloudflareProcessExit({ stopping: false, readyPublished: true }),
    'shutdown',
  )
})

test('starts the backend runtime only after the new tunnel URL is written', async () => {
  const publicUrl = 'https://new-tunnel.trycloudflare.com'
  const calls = []

  await startRuntimeAfterTunnelReady({
    startTunnelFn: () => calls.push('tunnel'),
    waitForTunnelUrlFn: async () => {
      calls.push(`url:${publicUrl}`)
      return publicUrl
    },
    updateLocalEnvFn: async (url) => calls.push(`env:${url}`),
    startDevFn: (url) => calls.push(`runtime:${url}`),
  })

  assert.deepEqual(calls, [
    'tunnel',
    `url:${publicUrl}`,
    `env:${publicUrl}`,
    `runtime:${publicUrl}`,
  ])

  const childEnv = buildCloudflareDevChildEnv(publicUrl, {})
  assert.equal(childEnv.TELEGRAM_PUBLIC_FRONTEND_URL, publicUrl)
})
