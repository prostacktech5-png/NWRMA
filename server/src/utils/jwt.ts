import jwt from 'jsonwebtoken'
import { requireJwtSecret } from '../config.js'

export interface JwtPayload {
  sub: string
  email: string | null
  phone: string | null
  role: string
}

export function signAccessToken(payload: JwtPayload, expiresIn = '7d'): string {
  return jwt.sign(payload, requireJwtSecret(), { expiresIn } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, requireJwtSecret()) as jwt.JwtPayload & JwtPayload
  if (typeof decoded.sub !== 'string' || !decoded.sub) {
    throw new Error('Invalid token payload')
  }
  const role =
    typeof decoded.role === 'string' && decoded.role.trim() !== ''
      ? decoded.role.trim()
      : 'staff'
  return {
    sub: decoded.sub,
    email:
      typeof decoded.email === 'string' || decoded.email === null ? decoded.email : null,
    phone:
      typeof decoded.phone === 'string' || decoded.phone === null ? decoded.phone : null,
    role,
  }
}
