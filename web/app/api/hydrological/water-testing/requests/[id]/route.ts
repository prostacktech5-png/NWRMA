import { z } from 'zod'
import { tryRespondWithDbSetupHint } from '@/lib/db'
import {
  getWaterTestingRequestById,
  patchWaterTestingRequest,
} from '@/lib/db/water-testing-persistence'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canManageWaterTestingRequests } from '@/lib/water-testing-access'
import {
  notifyWaterTestingCollectionScheduled,
  notifyWaterTestingCompleted,
} from '@/lib/water-testing-notify'

const inProgressSchema = z.object({
  action: z.literal('mark_in_progress'),
  sampleCollectionScheduledAt: z.string().min(1),
  assignedToUserId: z.string().max(80).optional().nullable(),
  assignedToName: z.string().max(200).optional().nullable(),
})

const completeSchema = z.object({
  action: z.literal('complete'),
  results: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  reportNotes: z.string().max(4000).optional().nullable(),
})

const patchSchema = z.discriminatedUnion('action', [inProgressSchema, completeSchema])

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 },
      )
    }
    if (!canManageWaterTestingRequests(viewer)) {
      return Response.json({ error: 'You do not have access to water testing requests.' }, { status: 403 })
    }

    const { id } = await ctx.params
    if (!id?.trim()) {
      return Response.json({ error: 'Invalid request id.' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await getWaterTestingRequestById(id)
    if (!existing) {
      return Response.json({ error: 'Request not found.' }, { status: 404 })
    }

    let emailWarning: string | undefined
    let updated = existing

    if (parsed.data.action === 'mark_in_progress') {
      if (existing.status !== 'received') {
        return Response.json(
          { error: 'Only received requests can be marked in progress.' },
          { status: 400 },
        )
      }
      const scheduled = new Date(parsed.data.sampleCollectionScheduledAt)
      if (Number.isNaN(scheduled.getTime())) {
        return Response.json({ error: 'Invalid sampleCollectionScheduledAt.' }, { status: 400 })
      }

      const patched = await patchWaterTestingRequest(id, {
        status: 'in_progress',
        sampleCollectionScheduledAt: scheduled,
        assignedToUserId: parsed.data.assignedToUserId ?? viewer.id,
        assignedToName: parsed.data.assignedToName ?? viewer.name,
      })
      if (!patched) {
        return Response.json({ error: 'Request not found.' }, { status: 404 })
      }
      updated = patched

      try {
        await notifyWaterTestingCollectionScheduled(updated)
      } catch (e) {
        emailWarning =
          e instanceof Error
            ? e.message
            : 'Status saved but notification email could not be sent.'
      }
    } else {
      if (existing.status !== 'in_progress') {
        return Response.json(
          { error: 'Only in-progress requests can be completed.' },
          { status: 400 },
        )
      }

      const patched = await patchWaterTestingRequest(id, {
        status: 'completed',
        results: parsed.data.results as Record<string, unknown>,
        reportNotes: parsed.data.reportNotes ?? null,
        completedAt: new Date(),
      })
      if (!patched) {
        return Response.json({ error: 'Request not found.' }, { status: 404 })
      }
      updated = patched

      try {
        await notifyWaterTestingCompleted(updated)
      } catch (e) {
        emailWarning =
          e instanceof Error
            ? e.message
            : 'Results saved but notification email could not be sent.'
      }
    }

    return Response.json({
      ok: true,
      request: {
        ...updated,
        receivedAt: updated.receivedAt.toISOString(),
        completedAt: updated.completedAt?.toISOString() ?? null,
        sampleCollectionScheduledAt:
          updated.sampleCollectionScheduledAt?.toISOString() ?? null,
      },
      emailWarning,
    })
  })
}
