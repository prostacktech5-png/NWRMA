import type { NextFunction, Request, Response } from 'express'

/** Central JSON error responder (RFC 9457-lite). */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err)
  if (err instanceof Error && err.name === 'UnauthorizedError') {
    res.status(401).json({ error: err.message || 'Unauthorized' })
    return
  }
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = Number((err as { status?: unknown }).status) || 500
    const message =
      typeof (err as { message?: unknown }).message === 'string'
        ? (err as { message: string }).message
        : 'Error'
    res.status(status).json({ error: message })
    return
  }
  const message = err instanceof Error ? err.message : 'Internal server error'
  res.status(500).json({ error: message })
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` })
}
