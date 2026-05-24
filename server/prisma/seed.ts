import bcrypt from 'bcryptjs'
import prisma from '../src/prisma/client.js'

async function main() {
  const email = (
    process.env.SEED_WEB_ADMIN_EMAIL ?? 'admin@nwrma.gov.sl'
  ).toLowerCase().trim()
  const password = process.env.SEED_WEB_ADMIN_PASSWORD ?? 'admin123'
  const phone = process.env.SEED_MOBILE_OFFICER_PHONE ?? '+232770000001'
  const mobilePassword =
    process.env.SEED_MOBILE_OFFICER_PASSWORD ?? 'demo123'

  const passwordHashAdmin = await bcrypt.hash(password, 10)
  const passwordHashMobile = await bcrypt.hash(mobilePassword, 10)

  await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: passwordHashAdmin,
      fullName: 'Dashboard Administrator',
      role: 'admin',
      department: null,
      email,
    },
    create: {
      email,
      passwordHash: passwordHashAdmin,
      fullName: 'Dashboard Administrator',
      role: 'admin',
      department: null,
    },
  })

  await prisma.user.upsert({
    where: { phone },
    update: {
      passwordHash: passwordHashMobile,
      fullName: 'Demo Field Officer',
      role: 'staff',
      department: 'hydrological',
      phone,
    },
    create: {
      phone,
      passwordHash: passwordHashMobile,
      fullName: 'Demo Field Officer',
      role: 'staff',
      department: 'hydrological',
    },
  })

  console.info('Seed OK: dashboard admin (%s), mobile officer (%s)', email, phone)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
