import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const routesSource = readFileSync(
  new URL('../../../../src/modules/zoom/api/routes.ts', import.meta.url),
  'utf8',
)
const handlerSource = readFileSync(
  new URL('../../../../src/modules/zoom/api/zoom.admin.handler.ts', import.meta.url),
  'utf8',
)

describe('commerce request cancellation route', () => {
  it('exposes the existing requester-owned commerce cancellation transition', () => {
    expect(routesSource).toContain(
      "router.delete('/commerce/requests/:id',        telegramWebAppAuth(), handleCancelCommerceRequest);",
    )
    expect(handlerSource).toContain(
      'const request = await cancelZoomCommerceRequest(req.params.id, userId)',
    )
  })

  it('keeps attendee cancellation on its existing session-booking route', () => {
    expect(routesSource).toContain(
      "router.delete('/sessions/:id/book',            authRequired, handleCancelPrivateSlotBooking);",
    )
    expect(handlerSource).toContain('const result = await cancelPrivateBooking(userId, id)')
  })
})
