import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { getHrEmployeeById, updateHrEmployee } from '@/lib/hr-employee-store'
import {
  deleteHrProfileImage,
  hrProfileImageApiPath,
  readHrProfileImage,
  saveHrProfileImage,
} from '@/lib/hr-profile-image-store'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return new Response('Unauthorized', { status: 401 })
    if (!canHr(viewer, 'view_employees')) {
      return new Response('Forbidden', { status: 403 })
    }
    const { id } = await params
    const file = await readHrProfileImage(id)
    if (file) {
      return new Response(new Uint8Array(file.buffer), {
        headers: {
          'Content-Type': file.mimeType,
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }
    const emp = await getHrEmployeeById(id)
    const url = emp?.profileImageUrl?.trim()
    if (url && (url.startsWith('data:image/') || url.startsWith('http'))) {
      if (url.startsWith('data:image/')) {
        const m = url.match(/^data:(image\/[^;]+);base64,(.+)$/i)
        if (m) {
          const buffer = Buffer.from(m[2], 'base64')
          return new Response(buffer, {
            headers: { 'Content-Type': m[1], 'Cache-Control': 'private, max-age=3600' },
          })
        }
      }
      return Response.redirect(url, 302)
    }
    return new Response('Not found', { status: 404 })
  })
}

export async function POST(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_employees')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    const emp = await getHrEmployeeById(id)
    if (!emp) return Response.json({ error: 'Employee not found.' }, { status: 404 })

    const ct = req.headers.get('content-type') ?? ''
    if (!ct.includes('multipart/form-data')) {
      return Response.json({ error: 'Expected multipart form with a file field.' }, { status: 400 })
    }
    const fd = await req.formData()
    const file = fd.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: 'No file provided.' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    try {
      await saveHrProfileImage(id, buffer, file.type || 'image/jpeg')
    } catch (e) {
      return Response.json(
        { error: e instanceof Error ? e.message : 'Upload failed.' },
        { status: 400 }
      )
    }
    const profileImageUrl = hrProfileImageApiPath(id)
    await updateHrEmployee(id, { profileImageUrl }, viewer.id)
    return Response.json({ profileImageUrl })
  })
}

export async function DELETE(req: Request, { params }: Params) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'manage_employees')) {
      return Response.json({ error: 'Not allowed.' }, { status: 403 })
    }
    const { id } = await params
    await deleteHrProfileImage(id)
    await updateHrEmployee(id, { profileImageUrl: null }, viewer.id)
    return Response.json({ ok: true })
  })
}
