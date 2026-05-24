/** Date stored on submit when the applicant does not enter one on the form. */
export function resolveDeclarationDate(value: string | undefined): string {
  const trimmed = value?.trim() ?? ''
  if (trimmed) return trimmed
  return new Date().toISOString().slice(0, 10)
}
