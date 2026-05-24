/** True if DOB falls on or after today and within `days` calendar days (same year). */
export function birthdayInNextDays(dob: Date, days: number, now = new Date()): boolean {
  const thisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + days)
  return thisYear >= start && thisYear <= end
}

export function daysUntilBirthday(dob: Date, now = new Date()): number {
  const thisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((thisYear.getTime() - start.getTime()) / 86_400_000)
}

export function isBirthdayToday(dob: Date, now = new Date()): boolean {
  return daysUntilBirthday(dob, now) === 0
}
