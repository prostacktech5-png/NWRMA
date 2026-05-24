import { z } from 'zod'
import {
  fiscalYearMatches,
  getFinanceApiStore,
  normalizeFiscalYearKey,
  parseFundsReceiptJson,
} from '@/lib/finance-api-store'

const Query = z.object({
  fiscalYear: z.string().min(2),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parsed = Query.safeParse({ fiscalYear: searchParams.get('fiscalYear') ?? '' })
  if (!parsed.success || normalizeFiscalYearKey(parsed.data.fiscalYear).length < 2) {
    return Response.json(
      { error: 'fiscalYear query is required (e.g. 2026/27)' },
      { status: 400 }
    )
  }

  const fyKey = normalizeFiscalYearKey(parsed.data.fiscalYear)
  const store = await getFinanceApiStore()
  const receiptsForFy = store.receipts.filter((r) => fiscalYearMatches(r.fiscalYear, fyKey))
  const budgetsForFy = store.budgets.filter((b) => fiscalYearMatches(b.fiscalYear, fyKey))

  const totalReceived = receiptsForFy.reduce((s, r) => s + r.amount, 0)
  const totalAllocated = budgetsForFy.reduce((s, b) => s + b.totalAmount, 0)
  const totalUtilized = budgetsForFy.reduce((s, b) => s + b.utilizedAmount, 0)

  return Response.json({
    fiscalYear: fyKey,
    receipts: receiptsForFy.map(parseFundsReceiptJson),
    totalReceived,
    totalAllocated,
    totalUtilized,
    unallocated: totalReceived - totalAllocated,
    receiptCount: receiptsForFy.length,
  })
}
