import { tryRespondWithDbSetupHint } from '@/lib/db'
import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { canAccessBankReceiptValidationDeskAsync } from '@/lib/bank-receipt-validation-desk'
import { findPaymentIntake } from '@/lib/online-form-payment-intake'
import { readPaymentIntakeReceipt } from '@/lib/online-form-payment-intake-file-store'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) {
      return Response.json(
        { error: 'Send X-Acting-User-Id to identify the ERP user (demo auth).' },
        { status: 401 }
      )
    }
    if (!(await canAccessBankReceiptValidationDeskAsync(viewer))) {
      return Response.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { id } = await ctx.params
    const payload = await loadOrSeedErpReferencePayload()
    const intake = findPaymentIntake(payload, id)
    if (!intake?.receiptFile.storageKey) {
      return Response.json({ error: 'Receipt not found.' }, { status: 404 })
    }

    const url = new URL(req.url)
    const disposition = url.searchParams.get('disposition') === 'inline' ? 'inline' : 'attachment'

    try {
      const { buffer, mimeType } = await readPaymentIntakeReceipt(intake.receiptFile.storageKey)
      const safeName = intake.receiptFile.name.replace(/[^\w.\-()+ ]+/g, '_')
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': intake.receiptFile.mimeType || mimeType,
          'Content-Disposition': `${disposition}; filename="${safeName}"`,
          'Content-Length': String(buffer.length),
        },
      })
    } catch {
      return Response.json({ error: 'Could not read receipt file.' }, { status: 500 })
    }
  })
}
