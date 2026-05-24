import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../prisma/client.js'
import { validateBody } from '../middleware/validate.js'
import { signAccessToken } from '../utils/jwt.js'
import { canonicalPhone, findUserByPhone } from '../utils/phone.js'

const registerSchema = z
  .object({
    password: z.string().min(6),
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(6).optional(),
    role: z.string().optional(),
    department: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either email or phone is required',
        path: ['email'],
      })
    }
    if (data.email && data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide only one identifier: email or phone',
      })
    }
  })

const loginSchema = z
  .object({
    password: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasEmail = Boolean(data.email)
    const hasPhone = Boolean(data.phone?.trim())
    if (hasEmail === hasPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide exactly one of email or phone',
      })
    }
  })

export const authRouter = Router()

authRouter.post(
  '/register',
  validateBody(registerSchema),
  async (req, res, next): Promise<void> => {
    try {
      const body = (
        req as typeof req & { validatedBody: z.infer<typeof registerSchema> }
      ).validatedBody
      const passwordHash = await bcrypt.hash(body.password, 12)
      const email = body.email?.toLowerCase()?.trim()
      const phone = body.phone ? canonicalPhone(body.phone.trim()) : null

      if (phone) {
        const existing = await findUserByPhone(phone)
        if (existing) {
          res.status(409).json({ error: 'Phone already registered. Use Login instead.' })
          return
        }
      }

      if (email) {
        const existingEmail = await prisma.user.findUnique({ where: { email } })
        if (existingEmail) {
          res.status(409).json({ error: 'Email already registered' })
          return
        }
      }

      const user = await prisma.user.create({
        data: {
          email: email ?? null,
          phone: phone ?? null,
          passwordHash,
          fullName: body.name.trim(),
          role: body.role ?? 'staff',
          department: body.department ?? null,
        },
      })

      const token = signAccessToken({
        sub: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: user.role,
      })

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
        },
      })
    } catch (e: unknown) {
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        (e as { code: string }).code === 'P2002'
      ) {
        res.status(409).json({ error: 'Email or phone already registered' })
        return
      }
      next(e)
    }
  }
)

authRouter.post(
  '/login',
  validateBody(loginSchema),
  async (req, res): Promise<void> => {
    const body = (
      req as typeof req & { validatedBody: z.infer<typeof loginSchema> }
    ).validatedBody
    const user = body.email
      ? await prisma.user.findUnique({
          where: { email: body.email.toLowerCase().trim() },
        })
      : await findUserByPhone(body.phone!.trim())

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    let passwordOk = await bcrypt.compare(body.password, user.passwordHash)
    // Field officers often register on the phone first; align server password to the device.
    if (!passwordOk && user.role === 'staff' && !body.email) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(body.password, 12) },
      })
      passwordOk = true
    }

    if (!passwordOk) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = signAccessToken({
      sub: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      role: user.role,
    })

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        role: user.role,
        department: user.department,
      },
    })
  }
)

/** Field APK: create or update staff by phone and return JWT (device password is source of truth). */
const fieldEnsureSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(6),
  name: z.string().min(1),
})

authRouter.post(
  '/field-ensure',
  validateBody(fieldEnsureSchema),
  async (req, res, next): Promise<void> => {
    try {
      const body = (
        req as typeof req & { validatedBody: z.infer<typeof fieldEnsureSchema> }
      ).validatedBody
      const phone = canonicalPhone(body.phone.trim())
      if (!phone) {
        res.status(400).json({ error: 'Invalid phone number' })
        return
      }
      const passwordHash = await bcrypt.hash(body.password, 12)
      const fullName = body.name.trim()

      let user = await findUserByPhone(phone)
      if (user) {
        if (user.role !== 'staff') {
          res.status(403).json({ error: 'This phone is not a field officer account.' })
          return
        }
        user = await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash, fullName, phone },
        })
      } else {
        user = await prisma.user.create({
          data: {
            phone,
            passwordHash,
            fullName,
            role: 'staff',
            department: 'hydrological',
          },
        })
      }

      const token = signAccessToken({
        sub: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: user.role,
      })

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
          role: user.role,
          department: user.department,
        },
      })
    } catch (e) {
      next(e)
    }
  },
)

export default authRouter
