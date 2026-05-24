'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type ApplicantGateFields,
  BANK_RECEIPT_ACCEPT,
  validateApplicantGateFields,
} from '@/lib/nwrma-site/online-forms/applicant-gate'
import { FormFieldLabel, FormRequiredLegend } from '@/components/nwrma-site/online-forms/form-field'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formTitle: string
  initialValues: ApplicantGateFields
  onSubmit: (fields: ApplicantGateFields, bankReceipt: File) => void | Promise<void>
  submitting?: boolean
}

export function ApplicantDetailsDialog({
  open,
  onOpenChange,
  formTitle,
  initialValues,
  onSubmit,
  submitting = false,
}: Props) {
  const [fields, setFields] = useState<ApplicantGateFields>(initialValues)
  const [bankReceipt, setBankReceipt] = useState<File | null>(null)
  const [receiptName, setReceiptName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setFields(initialValues)
      setBankReceipt(null)
      setReceiptName('')
      setError(null)
    }
  }, [open, initialValues])

  const patch = (partial: Partial<ApplicantGateFields>) => {
    setFields((prev) => ({ ...prev, ...partial }))
    setError(null)
  }

  const handleSubmit = async () => {
    const err = validateApplicantGateFields(fields, bankReceipt)
    if (err) {
      setError(err)
      return
    }
    await onSubmit(fields, bankReceipt!)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="nwrma-applicant-dialog sm:max-w-md"
        showCloseButton
      >
        <form
          className="nwrma-applicant-dialog__form"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <div className="nwrma-applicant-dialog__body">
            <DialogHeader className="nwrma-applicant-dialog__header">
              <DialogTitle className="nwrma-applicant-dialog__title">{formTitle}</DialogTitle>
              <DialogDescription className="nwrma-applicant-dialog__desc">
                Please provide your organization details and upload proof of fee payment before
                continuing.
              </DialogDescription>
            </DialogHeader>

            <div className="nwrma-applicant-dialog__fields">
              <FormRequiredLegend />
              {error ? (
                <p className="nwrma-form-error" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="nwrma-field">
                <FormFieldLabel as="label" htmlFor="gate-organization" required>
                  Name of Organization
                </FormFieldLabel>
                <input
                  id="gate-organization"
                  className="nwrma-field-input"
                  value={fields.organizationName}
                  onChange={(e) => patch({ organizationName: e.target.value })}
                  autoComplete="organization"
                />
              </div>

              <div className="nwrma-field">
                <FormFieldLabel as="label" htmlFor="gate-email" required>
                  Email
                </FormFieldLabel>
                <input
                  id="gate-email"
                  type="email"
                  className="nwrma-field-input"
                  value={fields.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  autoComplete="email"
                />
              </div>

              <div className="nwrma-field">
                <FormFieldLabel as="label" htmlFor="gate-phone" required>
                  Phone number
                </FormFieldLabel>
                <input
                  id="gate-phone"
                  type="tel"
                  className="nwrma-field-input"
                  value={fields.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  autoComplete="tel"
                />
              </div>

              <div className="nwrma-field">
                <FormFieldLabel as="label" htmlFor="gate-person" required>
                  Name of the person
                </FormFieldLabel>
                <input
                  id="gate-person"
                  className="nwrma-field-input"
                  value={fields.contactPersonName}
                  onChange={(e) => patch({ contactPersonName: e.target.value })}
                  autoComplete="name"
                />
              </div>

              <div className="nwrma-field nwrma-field--receipt">
                <FormFieldLabel as="label" htmlFor="gate-receipt" required>
                  Upload your bank receipt
                </FormFieldLabel>
                <div className="nwrma-file-picker">
                  <input
                    id="gate-receipt"
                    type="file"
                    className="nwrma-file-picker-input"
                    accept={BANK_RECEIPT_ACCEPT}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      setBankReceipt(file)
                      setReceiptName(file?.name ?? '')
                      setError(null)
                      e.target.value = ''
                    }}
                  />
                  <label htmlFor="gate-receipt" className="nwrma-btn-secondary nwrma-file-picker-btn">
                    Choose file
                  </label>
                </div>
                {receiptName ? (
                  <span className="nwrma-applicant-dialog__file-name">{receiptName}</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="nwrma-applicant-dialog__footer" role="group" aria-label="Form actions">
            <button
              type="button"
              className="nwrma-applicant-dialog__btn nwrma-applicant-dialog__btn--cancel"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="nwrma-applicant-dialog__btn nwrma-applicant-dialog__btn--submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
