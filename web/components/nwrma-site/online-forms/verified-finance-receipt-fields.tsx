'use client'

import { FormFieldLabel } from '@/components/nwrma-site/online-forms/form-field'
import { FormSection } from '@/components/nwrma-site/online-forms/form-section'

/**
 * Read-only NWRMA finance receipt fields shown after payment is validated (email resume link).
 */
export function VerifiedFinanceReceiptFields({
  receiptNumber,
  verifiedDate,
  intakeReference,
}: {
  receiptNumber: string
  verifiedDate?: string | null
  intakeReference?: string
}) {
  const receipt = receiptNumber.trim()
  if (!receipt) return null

  return (
    <FormSection title="NWRMA fee payment (verified)">
      <p className="nwrma-muted text-sm mb-4">
        Your bank receipt was verified by NWRMA Finance. Use the official receipt number below on
        this application — it is also on the PDF attached to your approval email.
      </p>
      <div className="nwrma-field-grid nwrma-office-use">
        {intakeReference ? (
          <label className="nwrma-field">
            <FormFieldLabel>Payment intake reference</FormFieldLabel>
            <input
              className="nwrma-field-input nwrma-field-input--locked"
              readOnly
              aria-readonly
              value={intakeReference}
            />
          </label>
        ) : null}
        <label className="nwrma-field">
          <FormFieldLabel>Receipt No.</FormFieldLabel>
          <input
            className="nwrma-field-input nwrma-field-input--locked"
            readOnly
            aria-readonly
            value={receipt}
          />
        </label>
        {verifiedDate ? (
          <label className="nwrma-field">
            <FormFieldLabel>Date received</FormFieldLabel>
            <input
              className="nwrma-field-input nwrma-field-input--locked"
              readOnly
              aria-readonly
              value={verifiedDate}
            />
          </label>
        ) : null}
        <label className="nwrma-field">
          <FormFieldLabel required={false}>Fee received</FormFieldLabel>
          <input
            className="nwrma-field-input nwrma-field-input--locked"
            readOnly
            aria-readonly
            value="Verified — administrative fee"
          />
        </label>
      </div>
    </FormSection>
  )
}
