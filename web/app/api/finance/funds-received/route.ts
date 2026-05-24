import { z } from 'zod'
import {
  commitFinanceApiStore,
  getFinanceApiStore,
  normalizeFiscalYearKey,
  parseFundsReceiptJson,
} from '@/lib/finance-api-store'

const Body = z.object({
  fiscalYear: z.string().min(2),
  amount: z.number().positive(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const parsed = Body.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 })
  }
  if (normalizeFiscalYearKey(parsed.data.fiscalYear).length < 2) {
    return Response.json({ error: 'fiscalYear is invalid' }, { status: 400 })
  }
  if (!Number.isFinite(parsed.data.amount) || parsed.data.amount <= 0) {
    return Response.json({ error: 'amount must be a positive number' }, { status: 400 })
  }

  const store = await getFinanceApiStore()
  const row = {
    id: store.nextReceiptId++,
    fiscalYear: parsed.data.fiscalYear.trim(),
    amount: parsed.data.amount,
    reference: parsed.data.reference?.trim() ? parsed.data.reference.trim() : null,
    notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
    source: parsed.data.source?.trim() ? parsed.data.source.trim() : 'manual',
    recordedAt: new Date(),
  }
  store.receipts.unshift(row)
  await commitFinanceApiStore(store)
  return Response.json(parseFundsReceiptJson(row), { status: 201 })
}
