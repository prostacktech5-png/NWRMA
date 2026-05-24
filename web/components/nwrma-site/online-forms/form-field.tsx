'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Shown once at the top of multi-step application forms. */
export function FormRequiredLegend({ className }: { className?: string }) {
  return (
    <p className={cn('nwrma-form-required-legend', className)}>
      <span className="nwrma-required-asterisk" aria-hidden="true">
        *
      </span>{' '}
      Required field
    </p>
  )
}

export function FormFieldLabel({
  children,
  required = false,
  as = 'span',
  className,
  htmlFor,
}: {
  children: ReactNode
  required?: boolean
  as?: 'span' | 'label' | 'p'
  className?: string
  htmlFor?: string
}) {
  const Comp = as
  return (
    <Comp
      className={cn('nwrma-field-label', required && 'nwrma-field-label--required', className)}
      {...(htmlFor ? { htmlFor } : {})}
    >
      {children}
    </Comp>
  )
}

export function FormField({
  label,
  children,
  className,
  required = true,
}: {
  label: string
  children: ReactNode
  className?: string
  /** When true (default), shows * on the label. Set false for optional fields. */
  required?: boolean
}) {
  return (
    <label className={cn('nwrma-field', className)}>
      <FormFieldLabel required={required}>{label}</FormFieldLabel>
      {children}
    </label>
  )
}

export function FormYesNoField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: { included: 'yes' | 'no' | 'na'; reasonIfNo: string }
  onChange: (v: { included: 'yes' | 'no' | 'na'; reasonIfNo: string }) => void
  required?: boolean
}) {
  return (
    <div className="nwrma-field nwrma-field--full">
      <FormFieldLabel required={required}>{label}</FormFieldLabel>
      <select
        className="nwrma-field-input"
        value={value.included}
        onChange={(e) =>
          onChange({
            ...value,
            included: e.target.value as 'yes' | 'no' | 'na',
          })
        }
      >
        <option value="yes">Yes</option>
        <option value="no">No</option>
        <option value="na">N/A</option>
      </select>
      {value.included === 'no' ? (
        <input
          className="nwrma-field-input mt-2"
          placeholder="Reason why not / expected date"
          value={value.reasonIfNo}
          onChange={(e) => onChange({ ...value, reasonIfNo: e.target.value })}
        />
      ) : null}
    </div>
  )
}
