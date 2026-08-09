import http from 'node:http'
import { request as httpRequest } from 'node:http'

const GATEWAY_PORT = 8080
const BACKEND_HOST = '127.0.0.1'
const BACKEND_PORT = 3001
const FRONTEND_HOST = '127.0.0.1'
const FRONTEND_PORT = 5173

const server = http.createServer((req, res) => {
  const url = req.url ?? '/'

  const isBackendRequest =
    url.startsWith('/api/') ||
    url === '/api' ||
    url.startsWith('/socket.io/')

  const targetPort = isBackendRequest
    ? BACKEND_PORT
    : FRONTEND_PORT

  const targetHost = isBackendRequest
    ? BACKEND_HOST
    : FRONTEND_HOST

  const proxyReq = httpRequest(
    {
      hostname: targetHost,
      port: targetPort,
      path: url,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${targetHost}:${targetPort}`,
      },
    },
    proxyRes => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )

  proxyReq.on('error', error => {
    console.error('[DEV_GATEWAY]', {
      url,
      target: `${targetHost}:${targetPort}`,
      error: error.message,
    })

    if (!res.headersSent) {
      res.writeHead(502, {
        'content-type': 'application/json',
      })
    }

    res.end(
      JSON.stringify({
        error: 'dev_gateway_target_unavailable',
        target: `${targetHost}:${targetPort}`,
      })
    )
  })

  req.pipe(proxyReq)
})

server.listen(GATEWAY_PORT, '127.0.0.1', () => {
  console.log(
    `[DEV_GATEWAY] http://127.0.0.1:${GATEWAY_PORT} → /api/*:${BACKEND_PORT}, web:${FRONTEND_PORT}`
  )
})
