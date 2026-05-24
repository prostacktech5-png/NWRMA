import cors from 'cors'
import express from 'express'
import { ALLOWED_ORIGINS, HOST, NODE_ENV_NON_PRODUCTION, PORT } from './config.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { authRouter } from './routes/auth.js'
import { registerOfflineSyncRoutes } from './routes/offline-sync.js'
import { reportsRouter } from './routes/reports.js'

const app = express()

app.use(
  cors({
    origin:
      NODE_ENV_NON_PRODUCTION
        ? true
        : (
            origin,
            cb: (err: Error | null, allow?: boolean) => void,
          ): void => {
            if (!origin) {
              cb(null, true)
              return
            }
            cb(
              ALLOWED_ORIGINS.includes(origin) ? null : new Error(`CORS blocked for ${origin}`),
              ALLOWED_ORIGINS.includes(origin),
            )
          },
    credentials: true,
  })
)
app.use(express.json({ limit: '15mb' }))

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/auth', authRouter)

registerOfflineSyncRoutes(app)
app.use('/reports', reportsRouter)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, HOST, () => {
  console.info(`NWRMA API listening on http://${HOST}:${PORT}`)
})
