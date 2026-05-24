import { tryRespondWithDbSetupHint } from '@/lib/db'
import { resolveDemoViewerFromRequest } from '@/lib/demo-viewer-server'
import { canHr } from '@/lib/hr-access-policy'
import { birthdayInNextDays, daysUntilBirthday, isBirthdayToday } from '@/lib/hr-birthday-utils'
import { hrEmployeeToJson, listHrEmployees } from '@/lib/hr-employee-store'
import { importHrEmployeesFromErpIfEmpty } from '@/lib/hr-migrate-from-erp'

export async function GET(req: Request) {
  return tryRespondWithDbSetupHint(async () => {
    const viewer = await resolveDemoViewerFromRequest(req)
    if (!viewer) return Response.json({ error: 'Authentication required.' }, { status: 401 })
    if (!canHr(viewer, 'view_employees')) {
      return Response.json({ error: 'HR access required.' }, { status: 403 })
    }
    await importHrEmployeesFromErpIfEmpty()
    const url = new URL(req.url)
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? '30')))
    const employees = await listHrEmployees()
    const now = new Date()
    const upcoming = employees
      .filter((e) => e.dateOfBirth && birthdayInNextDays(e.dateOfBirth, days, now))
      .map((e) => {
        const dob = e.dateOfBirth!
        return {
          ...hrEmployeeToJson(e),
          daysUntil: daysUntilBirthday(dob, now),
          isToday: isBirthdayToday(dob, now),
        }
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)

    return Response.json({
      birthdays: upcoming,
      smtpConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER),
    })
  })
}
