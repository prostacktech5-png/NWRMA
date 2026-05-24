import { tryRespondWithDbSetupHint } from '@/lib/db'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import {
  bankReceiptValidationMetrics,
  buildBankReceiptValidationQueue,
  canAccessBankReceiptValidationDeskAsync,
} from '@/lib/bank-receipt-validation-desk'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 }
      )
    }
    if (!(await canAccessBankReceiptValidationDeskAsync(viewer))) {
      return Response.json(
        { error: 'Only Finance staff or administrators can access the bank receipt validation desk.' },
        { status: 403 }
      )
    }

    const payload = await loadOrSeedErpReferencePayload({ syncRegistry: false })
    const items = buildBankReceiptValidationQueue(payload)
    return Response.json({ items, metrics: bankReceiptValidationMetrics(items) })
  })
}
