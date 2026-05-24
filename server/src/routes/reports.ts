import { Router } from 'express'
import {
  persistFieldReport,
  reportBodySchema,
  type ReportBodyPayload,
} from '../domain/field-report.js'
import prisma from '../prisma/client.js'
import { jwtAuthMiddleware } from '../middleware/jwt-auth.js'
import { validateBody } from '../middleware/validate.js'
import { serializeReport } from '../services/reports-serialize.js'

function canSeeAllFieldReports(role: string | undefined) {
  return role === 'admin' || role === 'dg'
}

export const reportsRouter = Router()
reportsRouter.use(jwtAuthMiddleware)

reportsRouter.post(
  '/',
  validateBody(reportBodySchema),
  async (req, res, next): Promise<void> => {
    try {
      const body = (req as typeof req & { validatedBody: ReportBodyPayload }).validatedBody
      const userId = req.authUserId!
      const saved = await persistFieldReport(userId, body)
      res.status(201).json({ report: serializeReport(saved) })
    } catch (e) {
      next(e)
    }
  }
)

reportsRouter.get('/', async (req, res): Promise<void> => {
  const bandRaw = typeof req.query.band === 'string' ? req.query.band.toLowerCase() : null
  const band =
    bandRaw === 'low' || bandRaw === 'medium' || bandRaw === 'high' ? bandRaw : null

  const userId = req.authUserId!
  const orgWide = canSeeAllFieldReports(req.auth?.role)

  const rows = await prisma.fieldReport.findMany({
    where: orgWide ? undefined : { userId },
    orderBy: { dateTime: 'desc' },
  })

  let reports = rows.map(serializeReport)
  if (band) {
    reports = reports.filter((r) => r.band === band)
  }

  const statsByBand = reports.reduce(
    (acc, r) => {
      acc[r.band] += 1
      return acc
    },
    { low: 0, medium: 0, high: 0 }
  )

  res.json({
    reports,
    statsByBand,
    total: reports.length,
  })
})

reportsRouter.get('/:id', async (req, res): Promise<void> => {
  const row = await prisma.fieldReport.findUnique({
    where: { id: req.params.id },
  })
  if (!row) {
    res.status(404).json({ error: 'Report not found' })
    return
  }
  const orgWide = canSeeAllFieldReports(req.auth?.role)
  if (req.authUserId !== row.userId && !orgWide) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  res.json({ report: serializeReport(row) })
})
