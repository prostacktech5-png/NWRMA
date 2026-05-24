import type { Express } from 'express'
import { z } from 'zod'
import {
  persistFieldReport,
  reportBodySchema,
} from '../domain/field-report.js'
import { jwtAuthMiddleware } from '../middleware/jwt-auth.js'
import { validateBody } from '../middleware/validate.js'

const syncPayloadSchema = z.object({
  reports: z.array(reportBodySchema),
})

export interface SyncRouteResponseBody {
  ok: boolean
  applied: number
  failures: number
  errors: { index: number; message: string }[]
}

export function registerOfflineSyncRoutes(app: Express) {
  app.post(
    '/sync/offline-data',
    jwtAuthMiddleware,
    validateBody(syncPayloadSchema),
    async (req, res): Promise<void> => {
      const body = (
        req as typeof req & { validatedBody: z.infer<typeof syncPayloadSchema> }
      ).validatedBody
      const userId = req.authUserId!
      let applied = 0
      const errors: { index: number; message: string }[] = []

      for (let i = 0; i < body.reports.length; i++) {
        try {
          await persistFieldReport(userId, body.reports[i])
          applied += 1
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Persist failed'
          errors.push({ index: i, message: msg })
        }
      }

      const payload: SyncRouteResponseBody = {
        ok: errors.length === 0,
        applied,
        failures: errors.length,
        errors,
      }
      const status =
        applied === 0 && body.reports.length > 0 && errors.length === body.reports.length
          ? 400
          : errors.length === 0
            ? 200
            : 207
      res.status(status).json(payload)
    }
  )
}
