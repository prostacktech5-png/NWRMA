import type { NextFunction, Request, Response } from 'express'
import prisma from '../prisma/client.js'
import type { JwtPayload } from '../utils/jwt.js'
import { verifyAccessToken } from '../utils/jwt.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express augmentation
  namespace Express {
    interface Request {
      auth?: JwtPayload
      authUserId?: string
    }
  }
}

export async function jwtAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const hdr = req.headers.authorization
    const token =
      hdr?.startsWith('Bearer ') ? hdr.slice(7).trim() : ''

    if (!token) {
      res.status(401).json({ error: 'Missing Authorization Bearer token' })
      return
    }

    const payloadFromToken = verifyAccessToken(token)
    const dbUser = await prisma.user.findUnique({ where: { id: payloadFromToken.sub } })
    if (!dbUser) {
      res.status(401).json({ error: 'User no longer exists' })
      return
    }

    const auth: JwtPayload = {
      sub: dbUser.id,
      email: dbUser.email,
      phone: dbUser.phone,
      role: dbUser.role,
    }

    req.auth = auth
    req.authUserId = dbUser.id
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
