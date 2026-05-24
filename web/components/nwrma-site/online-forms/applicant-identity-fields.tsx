'use client'

import { cn } from '@/lib/utils'
import { FormFieldLabel } from '@/components/nwrma-site/online-forms/form-field'

function LockedHint() {
  return (
    <span className="nwrma-applicant-locked-hint">
      From verified payment — cannot be changed
    </span>
  )
}

export function ApplicantOrganizationField({
  label = 'Name of company/organization',
  value,
  locked,
  required,
  onChange,
}: {
  label?: string
  value: string
  locked: boolean
  required?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <label className="nwrma-field">
      <FormFieldLabel required={required ?? true}>{label}</FormFieldLabel>
      <input
        className={cn('nwrma-field-input', locked && 'nwrma-field-input--locked')}
        value={value}
        readOnly={locked}
        aria-readonly={locked}
        onChange={locked ? undefined : (e) => onChange?.(e.target.value)}
      />
      {locked ? <LockedHint /> : null}
    </label>
  )
}

export function ApplicantEmailField({
  label = 'E-mail',
  value,
  locked,
  required,
  onChange,
}: {
  label?: string
  value: string
  locked: boolean
  required?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <label className="nwrma-field">
      <FormFieldLabel required={required ?? true}>{label}</FormFieldLabel>
      <input
        type="email"
        className={cn('nwrma-field-input', locked && 'nwrma-field-input--locked')}
        value={value}
        readOnly={locked}
        aria-readonly={locked}
        autoComplete="email"
        onChange={locked ? undefined : (e) => onChange?.(e.target.value)}
      />
      {locked ? <LockedHint /> : null}
    </label>
  )
}
