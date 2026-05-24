'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Breadcrumbs } from '@/components/nwrma-site/breadcrumbs'
import { emptyDocumentSlots } from '@/lib/borehole-licensing-documents'
import {
  createDefaultWaterDrillingForm,
  FEE_SCHEDULE,
  FORM_INSTRUCTIONS,
  LICENCE_CATEGORIES,
  waterDrillingLicenceFormSchema,
  type WaterDrillingLicenceFormPayload,
} from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'
import {
  apiValidationErrorMessage,
  validateAllStepsBeforeSubmit,
  waterDrillingPathToStep,
  type ApiValidationBody,
} from '@/lib/nwrma-site/online-forms/form-validation-errors'
import { resolveDeclarationDate } from '@/lib/nwrma-site/online-forms/declaration'
import {
  postPublicApplication,
  publicUploadTooLargeMessage,
  totalUploadBytes,
} from '@/lib/nwrma-site/online-forms/submit-public-application'
import { ApplicantDetailsDialog } from '@/components/nwrma-site/online-forms/ApplicantDetailsDialog'
import {
  ApplicantEmailField,
  ApplicantOrganizationField,
} from '@/components/nwrma-site/online-forms/applicant-identity-fields'
import { DrillingLicenceInstructions } from '@/components/nwrma-site/online-forms/form-instructions-step'
import { FormSection } from '@/components/nwrma-site/online-forms/form-section'
import { usePaymentIntakeGate } from '@/components/nwrma-site/online-forms/use-payment-intake-gate'
import {
  PaymentIntakeRejectedPanel,
  PaymentIntakeResumePanel,
  PaymentIntakeWaitingPanel,
} from '@/components/nwrma-site/online-forms/payment-intake-status-panel'
import { EquipmentTable } from '@/components/nwrma-site/online-forms/equipment-table'
import { PersonnelTable } from '@/components/nwrma-site/online-forms/personnel-table'
import {
  DocumentUploadGrid,
  type DocumentFilesState,
} from '@/components/nwrma-site/online-forms/document-upload-grid'
import { REQUIRED_DOCUMENT_SLOTS } from '@/lib/borehole-licensing-documents'
import {
  FormField as Field,
  FormFieldLabel,
  FormRequiredLegend,
} from '@/components/nwrma-site/online-forms/form-field'
import { VerifiedFinanceReceiptFields } from '@/components/nwrma-site/online-forms/verified-finance-receipt-fields'

const STEPS = [
  'Instructions',
  'Company',
  'Directors & bankers',
  'Equipment',
  'Personnel & projects',
  'Documents',
  'Declaration',
  'Review & submit',
] as const

export function WaterDrillingLicenceForm({
  title,
  pdfPath,
}: {
  title: string
  pdfPath?: string
}) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WaterDrillingLicenceFormPayload>(createDefaultWaterDrillingForm)
  const [documents, setDocuments] = useState<DocumentFilesState>(emptyDocumentSlots())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successRef, setSuccessRef] = useState<string | null>(null)
  const patch = (partial: Partial<WaterDrillingLicenceFormPayload>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const paymentGate = usePaymentIntakeGate({
    formSlug: 'water-drilling-licence',
    form,
    patchForm: patch,
    acknowledgements: form.acknowledgements,
  })

  useEffect(() => {
    if (paymentGate.canAccessWizardSteps && paymentGate.cameFromPaymentResume) {
      setStep(1)
    }
  }, [paymentGate.canAccessWizardSteps, paymentGate.cameFromPaymentResume])

  const validateStep = (index: number): string | null => {
    if (index === 0) {
      if (!form.acknowledgements.readInstructions || !form.acknowledgements.feesUnderstood) {
        return 'Please confirm you have read the instructions and fee information.'
      }
    }
    if (index === 1) {
      if (!form.companyName.trim()) return 'Company name is required.'
      if (!form.address.trim()) return 'Address is required.'
      if (!form.phone.trim()) return 'Telephone is required.'
      if (!form.email.trim()) return 'Company email is required.'
      const companyEmail = waterDrillingLicenceFormSchema.shape.email.safeParse(form.email.trim())
      if (!companyEmail.success) return 'Enter a valid company email address.'
      if (!form.contactName.trim()) return 'Contact person name is required.'
      if (!form.contactEmail.trim()) return 'Contact email is required.'
      const contactEmail = waterDrillingLicenceFormSchema.shape.contactEmail.safeParse(
        form.contactEmail.trim()
      )
      if (!contactEmail.success) return 'Enter a valid contact email address.'
      if (!form.contactPhone.trim()) return 'Contact phone is required.'
      if (!form.district.trim()) return 'Primary operating district is required.'
    }
    if (index === 2) {
      if (!form.regNumber.trim()) return 'Registered company number is required.'
      if (!form.bankers.trim()) return 'Bankers name and address is required.'
      const hasDirector = form.directors.some(
        (d) => d.fullName.trim() && d.citizenship.trim()
      )
      if (!hasDirector) {
        return 'Enter at least one director with full name and citizenship.'
      }
    }
    if (index === 4) {
      if (!form.projectsLast5Years.trim()) {
        return 'List of projects in the last 5 years is required.'
      }
      if (!form.referee1.name.trim() || !form.referee1.address.trim()) {
        return 'Referee 1 name and address are required.'
      }
      if (!form.referee2.name.trim() || !form.referee2.address.trim()) {
        return 'Referee 2 name and address are required.'
      }
    }
    if (index === 5) {
      for (const slot of REQUIRED_DOCUMENT_SLOTS) {
        if (!documents[slot.id]?.length) return `Please upload: ${slot.label}`
      }
    }
    if (index === 6) {
      if (!form.declarationSignature.trim()) return 'Declaration signature is required.'
    }
    return null
  }

  const goNext = () => {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    if (step === 0 && paymentGate.phase === 'fresh') {
      setError(null)
      paymentGate.setApplicantGateOpen(true)
      return
    }
    if (step === 0 && !paymentGate.canAccessWizardSteps) {
      setError('Payment must be verified by Finance before you can continue.')
      return
    }
    if (step > 0 && !paymentGate.canAccessWizardSteps) {
      setError('Payment must be verified by Finance before you can continue.')
      return
    }
    setError(null)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const goBack = () => {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  const submit = async () => {
    if (!paymentGate.intakeId || !paymentGate.resumeToken) {
      setError('Validated payment intake is required.')
      return
    }
    const payload = {
      ...form,
      declarationDate: resolveDeclarationDate(form.declarationDate),
    }
    const validation = validateAllStepsBeforeSubmit({
      maxStepInclusive: 6,
      validateStep,
      schema: waterDrillingLicenceFormSchema,
      form: payload,
      pathToStep: waterDrillingPathToStep,
    })
    if (validation) {
      setError(validation.message)
      setStep(validation.step)
      return
    }
    const uploadBytes = totalUploadBytes(documents)
    const tooLarge = publicUploadTooLargeMessage(uploadBytes)
    if (tooLarge) {
      setError(tooLarge)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('application', JSON.stringify(payload))
      body.append('intakeId', paymentGate.intakeId)
      body.append('resumeToken', paymentGate.resumeToken)
      for (const slot of REQUIRED_DOCUMENT_SLOTS) {
        for (const file of documents[slot.id] ?? []) {
          body.append(`doc_${slot.id}`, file)
        }
      }
      for (const [slotId, files] of Object.entries(documents)) {
        if (REQUIRED_DOCUMENT_SLOTS.some((s) => s.id === slotId)) continue
        for (const file of files) {
          body.append(`doc_${slotId}`, file)
        }
      }

      const res = await postPublicApplication('/api/public/borehole-license-applications', body)
      const data = (await res.json()) as ApiValidationBody & { reference?: string }
      if (!res.ok) {
        setError(apiValidationErrorMessage(data))
        const firstField = Object.keys(data.details?.fieldErrors ?? {})[0]
        if (firstField) {
          setStep(waterDrillingPathToStep([firstField]))
        }
        return
      }
      setSuccessRef(data.reference ?? '—')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (successRef) {
    return (
      <>
        <div className="nwrma-page-body">
          <div className="nwrma-container px-4 nwrma-form-success">
            <h2>Application submitted</h2>
            <p>
              Your water drilling licence application has been received. Reference:{' '}
              <strong>{successRef}</strong>
            </p>
            <p className="nwrma-muted">
              NWRMA will review your submission. You may be contacted for additional information.
            </p>
            <Link href="/online-forms" className="nwrma-btn-primary inline-block mt-4">
              Back to Online Forms
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="nwrma-page-body">
        <div className="nwrma-container px-4 nwrma-online-form-page">
          <Breadcrumbs
            items={[
              { label: 'Online Forms', href: '/online-forms' },
              { label: title },
            ]}
          />
          {pdfPath ? (
            <p className="mb-4">
              <a href={pdfPath} className="nwrma-pdf-download" download>
                Download blank PDF
              </a>
            </p>
          ) : null}

          <FormRequiredLegend />

          <nav className="nwrma-form-steps" aria-label="Form progress">
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={`nwrma-form-step${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`}
              >
                {i + 1}. {label}
              </span>
            ))}
          </nav>

          {error ? <p className="nwrma-form-error" role="alert">{error}</p> : null}
          {paymentGate.gateError ? (
            <p className="nwrma-form-error" role="alert">
              {paymentGate.gateError}
            </p>
          ) : null}

          {paymentGate.statusLoading ? (
            <p className="nwrma-muted py-8 text-center">
              {paymentGate.resumeActivating ? 'Opening your application…' : 'Loading…'}
            </p>
          ) : paymentGate.phase === 'resume_ready' ? (
            <PaymentIntakeResumePanel
              intakeReference={paymentGate.intakeReference}
              organisationName={paymentGate.organisationName}
              financeReceiptNumber={paymentGate.financeReceiptNumber}
              onContinue={paymentGate.redeemResume}
              busy={paymentGate.submittingIntake}
            />
          ) : paymentGate.phase === 'pending' ? (
            <PaymentIntakeWaitingPanel
              intakeReference={paymentGate.intakeReference}
              email={paymentGate.intakeEmail || form.email}
            />
          ) : paymentGate.phase === 'rejected' ? (
            <PaymentIntakeRejectedPanel
              intakeReference={paymentGate.intakeReference}
              validationNote={paymentGate.validationNote}
            />
          ) : null}

          {!paymentGate.statusLoading &&
          paymentGate.phase !== 'pending' &&
          paymentGate.phase !== 'rejected' &&
          paymentGate.phase !== 'resume_ready' &&
          step === 0 ? (
            <DrillingLicenceInstructions
              acknowledgements={form.acknowledgements}
              onAcknowledgementsChange={(a) =>
                patch({ acknowledgements: { ...form.acknowledgements, ...a } })
              }
            />
          ) : null}

          {!paymentGate.statusLoading &&
          paymentGate.phase !== 'pending' &&
          paymentGate.phase !== 'rejected' &&
          paymentGate.phase !== 'resume_ready' &&
          paymentGate.canAccessWizardSteps &&
          step === 1 ? (
            <FormSection title="Application for well drilling licence — company details">
              <div className="nwrma-field-grid">
                <ApplicantOrganizationField
                  label="Company name"
                  value={form.companyName}
                  locked={paymentGate.lockApplicantIdentity}
                  onChange={(companyName) => patch({ companyName })}
                />
                <Field label="P.O. Box" required={false}>
                  <input
                    className="nwrma-field-input"
                    value={form.poBox}
                    onChange={(e) => patch({ poBox: e.target.value })}
                  />
                </Field>
                <Field label="Address" className="nwrma-field--full">
                  <input
                    className="nwrma-field-input"
                    value={form.address}
                    onChange={(e) => patch({ address: e.target.value })}
                  />
                </Field>
                <Field label="Tel">
                  <input
                    className="nwrma-field-input"
                    value={form.phone}
                    onChange={(e) => patch({ phone: e.target.value })}
                  />
                </Field>
                <Field required={false} label="Fax">
                  <input
                    className="nwrma-field-input"
                    value={form.fax}
                    onChange={(e) => patch({ fax: e.target.value })}
                  />
                </Field>
                <ApplicantEmailField
                  label="E-mail"
                  value={form.email}
                  locked={paymentGate.lockApplicantIdentity}
                  onChange={(email) => patch({ email })}
                />
                <Field label="Name of contact person">
                  <input
                    className="nwrma-field-input"
                    value={form.contactName}
                    onChange={(e) => patch({ contactName: e.target.value })}
                  />
                </Field>
                <Field label="Contact email">
                  <input
                    type="email"
                    className="nwrma-field-input"
                    value={form.contactEmail}
                    onChange={(e) => patch({ contactEmail: e.target.value })}
                  />
                </Field>
                <Field label="Contact phone">
                  <input
                    className="nwrma-field-input"
                    value={form.contactPhone}
                    onChange={(e) => patch({ contactPhone: e.target.value })}
                  />
                </Field>
                <Field label="Primary operating district">
                  <input
                    className="nwrma-field-input"
                    value={form.district}
                    onChange={(e) => patch({ district: e.target.value })}
                  />
                </Field>
                <Field label="Licence category requested">
                  <select
                    className="nwrma-field-input"
                    value={form.licenceCategoryRequested}
                    onChange={(e) =>
                      patch({
                        licenceCategoryRequested: e.target
                          .value as WaterDrillingLicenceFormPayload['licenceCategoryRequested'],
                      })
                    }
                  >
                    {LICENCE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c === 'handDug' ? 'Hand dug well' : c === 'foreign' ? 'Foreign contractor' : `Class ${c}`}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </FormSection>
          ) : null}

          {!paymentGate.statusLoading &&
          paymentGate.phase !== 'pending' &&
          paymentGate.phase !== 'rejected' &&
          paymentGate.canAccessWizardSteps &&
          step === 2 ? (
            <FormSection title="Directors & bankers">
              <Field label="Registered Company No.">
                <input
                  className="nwrma-field-input"
                  value={form.regNumber}
                  onChange={(e) => patch({ regNumber: e.target.value })}
                />
              </Field>
              <p className="nwrma-muted text-sm mt-4">
                <FormFieldLabel required as="span">
                  Full name of Directors and their citizenship
                </FormFieldLabel>
                :
              </p>
              {form.directors.map((dir, i) => (
                <div className="nwrma-field-grid nwrma-director-row" key={i}>
                  <Field label="Director full name">
                    <input
                      className="nwrma-field-input"
                      value={dir.fullName}
                      onChange={(e) => {
                        const directors = [...form.directors]
                        directors[i] = { ...directors[i], fullName: e.target.value }
                        patch({ directors })
                      }}
                    />
                  </Field>
                  <Field label="Citizenship">
                    <input
                      className="nwrma-field-input"
                      value={dir.citizenship}
                      onChange={(e) => {
                        const directors = [...form.directors]
                        directors[i] = { ...directors[i], citizenship: e.target.value }
                        patch({ directors })
                      }}
                    />
                  </Field>
                </div>
              ))}
              <button
                type="button"
                className="nwrma-btn-secondary mt-2"
                onClick={() => patch({ directors: [...form.directors, { fullName: '', citizenship: '' }] })}
              >
                Add director
              </button>
              <Field label="Name and address of company's bankers" className="mt-6 nwrma-field--full">
                <textarea
                  className="nwrma-field-input"
                  rows={3}
                  value={form.bankers}
                  onChange={(e) => patch({ bankers: e.target.value })}
                />
              </Field>
            </FormSection>
          ) : null}

          {!paymentGate.statusLoading &&
          paymentGate.phase !== 'pending' &&
          paymentGate.phase !== 'rejected' &&
          paymentGate.canAccessWizardSteps &&
          step === 3 ? (
            <FormSection title="List of equipment (Annex 1)">
              <p className="nwrma-muted text-sm mb-4">
                Specify quantities available for each item. Mark N/A where not applicable.
              </p>
              <EquipmentTable
                title="Borehole drilling — CLASS A"
                rows={form.boreholeClassA}
                onChange={(boreholeClassA) => patch({ boreholeClassA })}
              />
              <EquipmentTable
                title="Borehole drilling — CLASS B"
                rows={form.boreholeClassB}
                onChange={(boreholeClassB) => patch({ boreholeClassB })}
              />
              <EquipmentTable
                title="Borehole drilling — CLASS C"
                rows={form.boreholeClassC}
                onChange={(boreholeClassC) => patch({ boreholeClassC })}
              />
              <EquipmentTable
                title="Hand dug well"
                rows={form.handDugWell}
                onChange={(handDugWell) => patch({ handDugWell })}
              />
            </FormSection>
          ) : null}

          {!paymentGate.statusLoading &&
          paymentGate.phase !== 'pending' &&
          paymentGate.phase !== 'rejected' &&
          paymentGate.canAccessWizardSteps &&
          step === 4 ? (
            <>
              <FormSection title="Key personnel (Annex 2)">
                <PersonnelTable
                  title="Borehole drilling crew"
                  rows={form.boreholePersonnel}
                  onChange={(boreholePersonnel) => patch({ boreholePersonnel })}
                />
                <PersonnelTable
                  title="Hand dug well crew"
                  rows={form.handDugPersonnel}
                  onChange={(handDugPersonnel) => patch({ handDugPersonnel })}
                />
              </FormSection>
              <FormSection title="Projects & referees">
                <Field label="List of projects carried out in the last 5 years (Annex 3)" className="nwrma-field--full">
                  <textarea
                    className="nwrma-field-input"
                    rows={5}
                    value={form.projectsLast5Years}
                    onChange={(e) => patch({ projectsLast5Years: e.target.value })}
                  />
                </Field>
                <div className="nwrma-field-grid mt-4">
                  <Field label="Referee 1 — name">
                    <input
                      className="nwrma-field-input"
                      value={form.referee1.name}
                      onChange={(e) => patch({ referee1: { ...form.referee1, name: e.target.value } })}
                    />
                  </Field>
                  <Field label="Referee 1 — address">
                    <input
                      className="nwrma-field-input"
                      value={form.referee1.address}
                      onChange={(e) => patch({ referee1: { ...form.referee1, address: e.target.value } })}
                    />
                  </Field>
                  <Field label="Referee 2 — name">
                    <input
                      className="nwrma-field-input"
                      value={form.referee2.name}
                      onChange={(e) => patch({ referee2: { ...form.referee2, name: e.target.value } })}
                    />
                  </Field>
                  <Field label="Referee 2 — address">
                    <input
                      className="nwrma-field-input"
                      value={form.referee2.address}
                      onChange={(e) => patch({ referee2: { ...form.referee2, address: e.target.value } })}
                    />
                  </Field>
                </div>
                <p className="nwrma-muted text-sm mt-4">
                  Quarterly well drilling reports (for renewal purposes only) — attach under Annex 4
                  on the documents step if applicable.
                </p>
              </FormSection>
            </>
          ) : null}

          {!paymentGate.statusLoading &&
          paymentGate.phase !== 'pending' &&
          paymentGate.phase !== 'rejected' &&
          paymentGate.canAccessWizardSteps &&
          step === 5 ? (
            <FormSection title="Required documents">
              <DocumentUploadGrid files={documents} onChange={setDocuments} />
            </FormSection>
          ) : null}

          {!paymentGate.statusLoading &&
          paymentGate.phase !== 'pending' &&
          paymentGate.phase !== 'rejected' &&
          paymentGate.canAccessWizardSteps &&
          step === 6 ? (
            <>
              <FormSection title="Licence fee schedule">
                <table className="nwrma-data-table nwrma-fee-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount (SLE)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEE_SCHEDULE.map((row) => (
                      <tr key={row.category}>
                        <td>{row.category}</td>
                        <td>{row.description}</td>
                        <td>{row.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="nwrma-muted text-sm mt-4">{FORM_INSTRUCTIONS.uniqueWellNumber}</p>
                <p className="nwrma-muted text-sm">{FORM_INSTRUCTIONS.cvNote}</p>
              </FormSection>
              <FormSection title="Declaration">
                <p>
                  I declare that the information given on this form and attachments hereto is correct
                  to the best of my knowledge and belief.
                </p>
                <div className="nwrma-field-grid">
                  <Field label="Signature (type full name)" className="nwrma-field--full">
                    <input
                      className="nwrma-field-input"
                      value={form.declarationSignature}
                      onChange={(e) => patch({ declarationSignature: e.target.value })}
                    />
                  </Field>
                </div>
              </FormSection>
              {paymentGate.financeReceiptNumber ? (
                <VerifiedFinanceReceiptFields
                  receiptNumber={paymentGate.financeReceiptNumber}
                  verifiedDate={paymentGate.feeVerifiedDate}
                  intakeReference={paymentGate.intakeReference}
                />
              ) : null}
            </>
          ) : null}

          {!paymentGate.statusLoading &&
          paymentGate.phase !== 'pending' &&
          paymentGate.phase !== 'rejected' &&
          paymentGate.canAccessWizardSteps &&
          step === 7 ? (
            <FormSection title="Review & submit">
              <p>Please review your entries before submitting to NWRMA.</p>
              <ul className="nwrma-review-summary">
                <li><strong>Company:</strong> {form.companyName}</li>
                <li><strong>Contact:</strong> {form.contactName} — {form.contactEmail}</li>
                <li><strong>Registered No.:</strong> {form.regNumber}</li>
                <li><strong>District:</strong> {form.district}</li>
                <li><strong>Licence category:</strong> {form.licenceCategoryRequested}</li>
                <li>
                  <strong>Documents uploaded:</strong>{' '}
                  {REQUIRED_DOCUMENT_SLOTS.filter((s) => documents[s.id]?.length).length} of{' '}
                  {REQUIRED_DOCUMENT_SLOTS.length} required
                </li>
              </ul>
            </FormSection>
          ) : null}

          {!paymentGate.statusLoading &&
          paymentGate.phase !== 'pending' &&
          paymentGate.phase !== 'rejected' &&
          paymentGate.phase !== 'resume_ready' ? (
          <div className="nwrma-form-nav">
            {step > 0 && paymentGate.canAccessWizardSteps ? (
              <button type="button" className="nwrma-btn-secondary" onClick={goBack} disabled={submitting}>
                Back
              </button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="nwrma-btn-primary" onClick={goNext}>
                Continue
              </button>
            ) : (
              <button
                type="button"
                className="nwrma-btn-primary"
                onClick={() => void submit()}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit application'}
              </button>
            )}
          </div>
          ) : null}
        </div>
      </div>

      <ApplicantDetailsDialog
        open={paymentGate.applicantGateOpen}
        onOpenChange={paymentGate.setApplicantGateOpen}
        formTitle={title}
        initialValues={paymentGate.applicantGateInitialValues}
        onSubmit={paymentGate.submitIntake}
        submitting={paymentGate.submittingIntake}
      />
    </>
  )
}
