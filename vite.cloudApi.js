import { loadEnv } from 'vite'
import {
  handleAuthEnvCheck,
  handleAuthRegister,
  handleAuthStatus,
  handleLookupId,
  handleMigrateEmail,
  handleResetPassword,
} from './server/auth.js'
import { getSupabaseEnvIssue } from './server/supabaseEnv.js'
import { handleClassifyMemoRequest } from './server/classifyMemo.js'
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

      const envIssue = getSupabaseEnvIssue()
      if (envIssue) {
        console.warn(`[cloud-api] ${envIssue}`)
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        try {
          if (req.url?.startsWith('/api/auth/env-check') && req.method === 'GET') {
            const result = await handleAuthEnvCheck()
            sendJson(res, result.status, result.body)
            return
          }

          if (req.url?.startsWith('/api/auth/migrate-email') && req.method === 'POST') {
            const result = await handleMigrateEmail(req.headers.authorization)
            sendJson(res, result.status, result.body)
            return
          }

          if (req.url?.startsWith('/api/auth/status') && req.method === 'POST') {
            const body = await readBody(req)
            const result = await handleAuthStatus(body)
            sendJson(res, result.status, result.body)
            return
          }

          if (req.url?.startsWith('/api/auth/register') && req.method === 'POST') {
            const body = await readBody(req)
            const result = await handleAuthRegister(body)
            sendJson(res, result.status, result.body)
            return
          }

          if (req.url?.startsWith('/api/auth/lookup-id') && req.method === 'POST') {
            const body = await readBody(req)
            const result = await handleLookupId(body)
            sendJson(res, result.status, result.body)
            return
          }

          if (req.url?.startsWith('/api/auth/reset-password') && req.method === 'POST') {
            const body = await readBody(req)
            const result = await handleResetPassword(body)
            sendJson(res, result.status, result.body)
            return
          }

          if (req.url?.startsWith('/api/classify-memo') && req.method === 'POST') {
            const body = await readBody(req)
            const result = await handleClassifyMemoRequest(body)
            sendJson(res, result.status, result.body)
            return
          }

          if (!req.url?.startsWith('/api/data')) return next()

          const body = req.method === 'POST' ? await readBody(req) : undefined
          const result = await handleDataRequest(req.method, req.url, body)
          sendJson(res, result.status, result.body)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'server error'
          sendJson(res, 500, { error: message })
        }
      })
    },
  }
}
