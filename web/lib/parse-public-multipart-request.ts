/**
 * Parse multipart POST bodies for public application routes.
 * Returns a Response when the body cannot be read (wrong type or truncated upload).
 */
export async function parsePublicMultipartRequest(
  req: Request
): Promise<FormData | Response> {
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    const hint = contentType
      ? `Received ${contentType.split(';')[0]?.trim() || contentType}.`
      : 'No Content-Type was sent.'
    return Response.json(
      {
        error: `Expected multipart form data. ${hint} Use the Submit application button on the form (do not refresh during upload).`,
      },
      { status: 400 }
    )
  }

  try {
    return await req.formData()
  } catch {
    return Response.json(
      {
        error:
          'Upload could not be read. Each file must be 10 MB or smaller. If you selected many files, try submitting fewer at once or split them across required sections. If the problem continues, ask NWRMA for assistance.',
      },
      { status: 400 }
    )
  }
}
