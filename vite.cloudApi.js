import { loadEnv } from 'vite'
import { handleDataRequest } from './server/cloudData.js'

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve(undefined)
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve(raw)
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function cloudApiDevPlugin() {
  return {
    name: 'cloud-api-dev',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      Object.assign(process.env, env)

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/data')) return next()

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        try {
          const body =
            req.method === 'POST' ? await readBody(req) : undefined
          const result = await handleDataRequest(
            req.method,
            req.url,
            body,
          )
          sendJson(res, result.status, result.body)
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'server error'
          sendJson(res, 500, { error: message })
        }
      })
    },
  }
}
