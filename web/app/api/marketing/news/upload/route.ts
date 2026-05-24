import { withMarketingNewsAdminApi } from '@/lib/marketing-news-api-auth'
import { saveMarketingNewsImage } from '@/lib/marketing-news-image-store'

export async function POST(req: Request) {
  return withMarketingNewsAdminApi(req, async () => {
    let form: FormData
    try {
      form = await req.formData()
    } catch {
      return Response.json({ error: 'Invalid form data.' }, { status: 400 })
    }
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: 'Image file is required.' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    try {
      const url = await saveMarketingNewsImage(buffer, file.type || 'image/jpeg')
      return Response.json({ url })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.'
      return Response.json({ error: message }, { status: 400 })
    }
  })
}
