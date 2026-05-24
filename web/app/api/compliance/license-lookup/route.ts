import { loadOrSeedErpReferencePayload } from '@/lib/db/reference-data-persistence'
import { withComplianceApi } from '@/lib/lro-api-auth'

export async function GET(req: Request) {
  return withComplianceApi(req, 'view', async () => {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    if (q.length < 2) {
      return Response.json({ results: [] })
    }
    const payload = await loadOrSeedErpReferencePayload()
    const results = payload.licenseApplications
      .filter((app) => {
        return (
          app.reference.toLowerCase().includes(q) ||
          app.organisationName.toLowerCase().includes(q) ||
          app.applicantName.toLowerCase().includes(q)
        )
      })
      .slice(0, 20)
      .map((app) => ({
        id: app.id,
        reference: app.reference,
        organisationName: app.organisationName,
        applicantName: app.applicantName,
        status: app.status,
      }))
    return Response.json({ results })
  })
}
