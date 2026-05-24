'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Breadcrumbs } from '@/components/nwrma-site/breadcrumbs'
import { emptyEffluentDischargeDocumentFiles } from '@/lib/effluent-discharge-documents'
import { EFFLUENT_DISCHARGE_REQUIRED_SLOTS } from '@/lib/effluent-discharge-documents'
import {
  ACTIVITY_SECTION_KEYS,
  ACTIVITY_SECTION_LABELS,
  createDefaultEffluentDischargeForm,
  effluentDischargeFormSchema,
  WATER_USE_PURPOSES,
  EFFLUENT_GENERATED_TYPES,
  type EffluentDischargeFormPayload,
} from '@/lib/nwrma-site/online-forms/effluent-discharge-schema'
import {
  apiValidationErrorMessage,
  effluentDischargePathToStep,
  firstZodErrorMessage,
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
import { PermitApplicationInstructions } from '@/components/nwrma-site/online-forms/form-instructions-step'
import { FormSection } from '@/components/nwrma-site/online-forms/form-section'
import { appendOptionalDocumentFiles } from '@/lib/nwrma-site/online-forms/applicant-gate'
import { usePaymentIntakeGate } from '@/components/nwrma-site/online-forms/use-payment-intake-gate'
import {
  FormPaymentGateMessages,
  FormPaymentGateWizardStep,
} from '@/components/nwrma-site/online-forms/form-payment-gate-shell'
import {
  EffluentDischargeDocumentUploadGrid,
  type EffluentDischargeFilesState,
} from '@/components/nwrma-site/online-forms/effluent-discharge-document-upload-grid'
import {
  FormField as Field,
  FormFieldLabel,
  FormRequiredLegend,
  FormYesNoField as YesNoField,
} from '@/components/nwrma-site/online-forms/form-field'
import { VerifiedFinanceReceiptFields } from '@/components/nwrma-site/online-forms/verified-finance-receipt-fields'

const STEPS = [
  'Instructions',
  'Applicant',
  'Location & purposes',
  'Effluent types',
  'Included docs checklist',
  'Water use data',
  'Discharges & project',
  'Affected parties',
  'Activity-specific',
  'Upload documents',
  'Declaration',
  'Review',
] as const

export function EffluentDischargeForm({ title, pdfPath }: { title: string; pdfPath?: string }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<EffluentDischargeFormPayload>(createDefaultEffluentDischargeForm)
  const [documents, setDocuments] = useState<EffluentDischargeFilesState>(emptyEffluentDischargeDocumentFiles())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successRef, setSuccessRef] = useState<string | null>(null)
  const patch = (partial: Partial<EffluentDischargeFormPayload>) => {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  const paymentGate = usePaymentIntakeGate({
    formSlug: 'effluent-discharge',
    form,
    patchForm: patch,
    acknowledgements: form.acknowledgements,
  })

  useEffect(() => {
    if (paymentGate.canAccessWizardSteps && paymentGate.cameFromPaymentResume) {
      setStep(1)
    }
  }, [paymentGate.canAccessWizardSteps, paymentGate.cameFromPaymentResume])

  const togglePurpose = (purpose: string) => {
    setForm((prev) => {
      const has = prev.purposes.includes(purpose)
      return {
        ...prev,
        purposes: has ? prev.purposes.filter((p) => p !== purpose) : [...prev.purposes, purpose],
      }
    })
  }

  const toggleEffluentType = (type: string) => {
    setForm((prev) => {
      const has = prev.effluentGeneratedTypes.includes(type)
      return {
        ...prev,
        effluentGeneratedTypes: has
          ? prev.effluentGeneratedTypes.filter((t) => t !== type)
          : [...prev.effluentGeneratedTypes, type],
      }
    })
  }

  const validateStep = (index: number): string | null => {
    if (index === 0 && (!form.acknowledgements.readInstructions || !form.acknowledgements.feesUnderstood)) {
      return 'Please confirm you have read the instructions and fee information.'
    }
    if (index === 1) {
      if (!form.companyName.trim()) return 'Company name is required.'
      if (!form.ceoDirectorName.trim()) return 'Name of CEO/Director is required.'
      if (!form.contactPersonName.trim()) return 'Contact person name is required.'
      if (!form.mailingAddress.trim()) return 'Mailing address is required.'
      if (!form.officePhone.trim()) return 'Telephone (office) is required.'
      if (!form.mobilePhone.trim()) return 'Mobile phone is required.'
      if (!form.email.trim()) return 'Email is required.'
      const emailCheck = effluentDischargeFormSchema.shape.email.safeParse(form.email.trim())
      if (!emailCheck.success) return 'Enter a valid email address.'
    }
    if (index === 2) {
      if (!form.town.trim()) return 'Town is required.'
      if (!form.district.trim()) return 'District is required.'
      if (!form.region.trim()) return 'Region is required.'
      if (form.purposes.length === 0) {
        return 'Select at least one purpose/type of water use that generates effluent.'
      }
    }
    if (index === 3 && form.effluentGeneratedTypes.length === 0) {
      return 'Select at least one type of effluent generated.'
    }
    if (index === 5) {
      if (!form.usePointTown.trim()) return 'Point of water use — Town is required.'
      if (!form.usePointDistrict.trim()) return 'Point of water use — District is required.'
      if (!form.usePointRegion.trim()) return 'Point of water use — Region is required.'
      if (!form.usePointGps.trim()) return 'GPS coordinates are required.'
      if (!form.activityStatus.trim()) return 'Current status of activity is required.'
      if (!form.waterSourceType.trim()) return 'Type of water source is required.'
    }
    if (index === 6 && !form.projectDescription.trim()) {
      return 'Project description is required.'
    }
    if (index === 7) {
      if (!form.environmentalImpacts.trim()) return 'Major environmental impacts is required.'
      if (!form.pollutionMitigationMeasures.trim()) {
        return 'Measures to avoid pollution, flooding or adverse effects are required.'
      }
    }
    if (index === 9) {
      for (const slot of EFFLUENT_DISCHARGE_REQUIRED_SLOTS) {
        if (!documents[slot.id]?.length) return `Please upload: ${slot.label}`
      }
    }
    if (index === 10) {
      if (!form.declarationSignature.trim()) return 'Declaration signature is required.'
      if (!form.declarationPrintName.trim()) return 'Declaration print name is required.'
    }
    return null
  }

  const applicationPayload = () => ({
    ...form,
    declarationDate: resolveDeclarationDate(form.declarationDate),
  })

  const validateBeforeSubmit = (): { message: string; step: number } | null => {
    for (let i = 0; i <= 10; i++) {
      const stepErr = validateStep(i)
      if (stepErr) return { message: stepErr, step: i }
    }
    const parsed = effluentDischargeFormSchema.safeParse(applicationPayload())
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return {
        message: firstZodErrorMessage(parsed.error),
        step: issue ? effluentDischargePathToStep(issue.path) : 11,
      }
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
    if (!paymentGate.canAccessWizardSteps) {
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
    const validation = validateBeforeSubmit()
    if (validation) {
      setError(validation.message)
      setStep(validation.step)
      return
    }
    const payload = applicationPayload()
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
      for (const slot of EFFLUENT_DISCHARGE_REQUIRED_SLOTS) {
        for (const file of documents[slot.id] ?? []) {
          body.append(`doc_${slot.id}`, file)
        }
      }
      appendOptionalDocumentFiles(
        body,
        documents,
        EFFLUENT_DISCHARGE_REQUIRED_SLOTS.map((s) => s.id)
      )
      const res = await postPublicApplication('/api/public/effluent-discharge-applications', body)
      const data = (await res.json()) as ApiValidationBody & { reference?: string }
      if (!res.ok) {
        setError(apiValidationErrorMessage(data))
        const firstField = Object.keys(data.details?.fieldErrors ?? {})[0]
        if (firstField) {
          setStep(effluentDischargePathToStep([firstField]))
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
              Your Effluent Discharge application has been received. Reference:{' '}
              <strong>{successRef}</strong>
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
            items={[{ label: 'Online Forms', href: '/online-forms' }, { label: title }]}
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
          <FormPaymentGateMessages gate={paymentGate} applicantEmail={form.email} />

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={0}>
            <PermitApplicationInstructions
              variant="effluent-discharge"
              acknowledgements={form.acknowledgements}
              onAcknowledgementsChange={(a) =>
                patch({ acknowledgements: { ...form.acknowledgements, ...a } })
              }
            />
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={1}>
            <FormSection title="1.0 Applicant details">
              <div className="nwrma-field-grid">
                <ApplicantOrganizationField
                  value={form.companyName}
                  locked={paymentGate.lockApplicantIdentity}
                  onChange={(companyName) => patch({ companyName })}
                />
                <Field label="Name of CEO/Director">
                  <input className="nwrma-field-input" value={form.ceoDirectorName} onChange={(e) => patch({ ceoDirectorName: e.target.value })} />
                </Field>
                <Field label="Name of contact person(s)">
                  <input className="nwrma-field-input" value={form.contactPersonName} onChange={(e) => patch({ contactPersonName: e.target.value })} />
                </Field>
                <Field label="Mailing address" className="nwrma-field--full">
                  <textarea className="nwrma-field-input" rows={2} value={form.mailingAddress} onChange={(e) => patch({ mailingAddress: e.target.value })} />
                </Field>
                <Field label="Telephone (Office)">
                  <input className="nwrma-field-input" value={form.officePhone} onChange={(e) => patch({ officePhone: e.target.value })} />
                </Field>
                <Field label="Mobile">
                  <input className="nwrma-field-input" value={form.mobilePhone} onChange={(e) => patch({ mobilePhone: e.target.value })} />
                </Field>
                <Field required={false} label="Fax">
                  <input className="nwrma-field-input" value={form.fax} onChange={(e) => patch({ fax: e.target.value })} />
                </Field>
                <ApplicantEmailField
                  value={form.email}
                  locked={paymentGate.lockApplicantIdentity}
                  onChange={(email) => patch({ email })}
                />
                <Field required={false} label="Website">
                  <input className="nwrma-field-input" value={form.website} onChange={(e) => patch({ website: e.target.value })} />
                </Field>
                <Field label="Permit type">
                  <select className="nwrma-field-input" value={form.permitType} onChange={(e) => patch({ permitType: e.target.value as 'new' | 'renewal' })}>
                    <option value="new">New</option>
                    <option value="renewal">Renewal</option>
                  </select>
                </Field>
                {form.permitType === 'renewal' ? (
                  <Field required={false} label="Permit ID number (renewal)">
                    <input className="nwrma-field-input" value={form.renewalPermitId} onChange={(e) => patch({ renewalPermitId: e.target.value })} />
                  </Field>
                ) : null}
              </div>
              <h4 className="mt-6 font-semibold">1.1 Ownership information</h4>
              <Field label="Ownership type">
                <select className="nwrma-field-input" value={form.ownershipType} onChange={(e) => patch({ ownershipType: e.target.value })}>
                  <option>Cooperation</option>
                  <option>Partnership</option>
                  <option>Joint Venture</option>
                  <option>Sole Proprietorship</option>
                  <option>Others</option>
                </select>
              </Field>
              {form.ownershipType === 'Partnership' || form.ownershipType === 'Others' ? (
                <Field required={false} label="Partners / other details" className="nwrma-field--full">
                  <textarea className="nwrma-field-input" rows={3} value={form.partnersDetails} onChange={(e) => patch({ partnersDetails: e.target.value })} />
                </Field>
              ) : null}
            </FormSection>
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={2}>
            <FormSection title="2.0–3.0 Location & purpose of water use">
              <div className="nwrma-field-grid">
                <Field label="Town">
                  <input className="nwrma-field-input" value={form.town} onChange={(e) => patch({ town: e.target.value })} />
                </Field>
                <Field label="District">
                  <input className="nwrma-field-input" value={form.district} onChange={(e) => patch({ district: e.target.value })} />
                </Field>
                <Field label="Region">
                  <input className="nwrma-field-input" value={form.region} onChange={(e) => patch({ region: e.target.value })} />
                </Field>
                <Field label="Water use category">
                  <select className="nwrma-field-input" value={form.waterUseCategory} onChange={(e) => patch({ waterUseCategory: e.target.value as 'consumptive' | 'non-consumptive' })}>
                    <option value="consumptive">Consumptive</option>
                    <option value="non-consumptive">Non-consumptive</option>
                  </select>
                </Field>
              </div>
              <FormFieldLabel required as="p" className="mt-4">
                Purpose/type of water use to generate effluent (select all that apply)
              </FormFieldLabel>
              <div className="nwrma-purpose-grid">
                {WATER_USE_PURPOSES.map((p) => (
                  <label key={p} className="nwrma-checkbox">
                    <input type="checkbox" checked={form.purposes.includes(p)} onChange={() => togglePurpose(p)} />
                    {p}
                  </label>
                ))}
              </div>
              <Field required={false} label="Others (specify)" className="mt-4 nwrma-field--full">
                <input className="nwrma-field-input" value={form.purposesOther} onChange={(e) => patch({ purposesOther: e.target.value })} />
              </Field>
            </FormSection>
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={3}>
            <FormSection title="4.0 Type of effluent generated">
              <FormFieldLabel required as="p">
                Select all types of effluent that apply
              </FormFieldLabel>
              <div className="nwrma-purpose-grid">
                {EFFLUENT_GENERATED_TYPES.map((t) => (
                  <label key={t} className="nwrma-checkbox">
                    <input
                      type="checkbox"
                      checked={form.effluentGeneratedTypes.includes(t)}
                      onChange={() => toggleEffluentType(t)}
                    />
                    {t}
                  </label>
                ))}
              </div>
              <Field required={false} label="Others (specify)" className="mt-4 nwrma-field--full">
                <input
                  className="nwrma-field-input"
                  value={form.effluentGeneratedTypesOther}
                  onChange={(e) => patch({ effluentGeneratedTypesOther: e.target.value })}
                />
              </Field>
            </FormSection>
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={4}>
            <FormSection title="4.0 Included documents checklist">
              <YesNoField label="Environmental Impact Assessment Report" value={form.includedDocuments.eiaReport} onChange={(v) => patch({ includedDocuments: { ...form.includedDocuments, eiaReport: v } })} />
              <YesNoField label="Environmental Permit & Schedule" value={form.includedDocuments.environmentalPermit} onChange={(v) => patch({ includedDocuments: { ...form.includedDocuments, environmentalPermit: v } })} />
              <YesNoField label="Other relevant permits from MDAs" value={form.includedDocuments.otherMdaPermits} onChange={(v) => patch({ includedDocuments: { ...form.includedDocuments, otherMdaPermits: v } })} />
              <YesNoField label="Site Plan" value={form.includedDocuments.sitePlan} onChange={(v) => patch({ includedDocuments: { ...form.includedDocuments, sitePlan: v } })} />
              <YesNoField label="Water Demand Management Plan" value={form.includedDocuments.wdmp} onChange={(v) => patch({ includedDocuments: { ...form.includedDocuments, wdmp: v } })} />
              <YesNoField label="Business Certificates" value={form.includedDocuments.businessCertificates} onChange={(v) => patch({ includedDocuments: { ...form.includedDocuments, businessCertificates: v } })} />
              <Field required={false} label="If any answer is No, state reasons and expected dates" className="nwrma-field--full mt-4">
                <textarea className="nwrma-field-input" rows={4} value={form.includedDocumentsReasons} onChange={(e) => patch({ includedDocumentsReasons: e.target.value })} />
              </Field>
            </FormSection>
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={5}>
            <FormSection title="5.0 Data on the (proposed) water use">
              <div className="nwrma-field-grid">
                <Field label="Point of water use — Town"><input className="nwrma-field-input" value={form.usePointTown} onChange={(e) => patch({ usePointTown: e.target.value })} /></Field>
                <Field label="District"><input className="nwrma-field-input" value={form.usePointDistrict} onChange={(e) => patch({ usePointDistrict: e.target.value })} /></Field>
                <Field label="Region"><input className="nwrma-field-input" value={form.usePointRegion} onChange={(e) => patch({ usePointRegion: e.target.value })} /></Field>
                <Field label="GPS coordinates" className="nwrma-field--full"><input className="nwrma-field-input" value={form.usePointGps} onChange={(e) => patch({ usePointGps: e.target.value })} /></Field>
                <Field label="Current status of activity"><input className="nwrma-field-input" value={form.activityStatus} onChange={(e) => patch({ activityStatus: e.target.value })} placeholder="Construction / Operational" /></Field>
                <Field required={false} label="Date of commencement (if in operation)"><input type="date" className="nwrma-field-input" value={form.activityCommencementDate} onChange={(e) => patch({ activityCommencementDate: e.target.value })} /></Field>
                <Field label="Type of water source"><input className="nwrma-field-input" value={form.waterSourceType} onChange={(e) => patch({ waterSourceType: e.target.value })} /></Field>
                <Field required={false} label="Name of water source"><input className="nwrma-field-input" value={form.waterSourceName} onChange={(e) => patch({ waterSourceName: e.target.value })} /></Field>
                <Field required={false} label="Tributary of"><input className="nwrma-field-input" value={form.tributaryOf} onChange={(e) => patch({ tributaryOf: e.target.value })} /></Field>
                <Field required={false} label="Groundwater boreholes (number & GPS)" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={2} value={form.groundwaterBoreholes} onChange={(e) => patch({ groundwaterBoreholes: e.target.value })} /></Field>
                <Field required={false} label="Rate of use applied for (m³/annum)"><input className="nwrma-field-input" value={form.rateOfUseAnnual} onChange={(e) => patch({ rateOfUseAnnual: e.target.value })} /></Field>
                <Field required={false} label="Actual rate of use (m³/day, if in progress)"><input className="nwrma-field-input" value={form.rateOfUseDaily} onChange={(e) => patch({ rateOfUseDaily: e.target.value })} /></Field>
                <Field required={false} label="Rate of use — Seasonal/monthly"><input className="nwrma-field-input" value={form.rateOfUseSeasonal} onChange={(e) => patch({ rateOfUseSeasonal: e.target.value })} /></Field>
                <Field required={false} label="Method of determining consumption/rate of use" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={2} value={form.consumptionDeterminationMethod} onChange={(e) => patch({ consumptionDeterminationMethod: e.target.value })} /></Field>
              </div>
            </FormSection>
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={6}>
            <FormSection title="6.0–8.0 Discharges, project & affected parties">
              <div className="nwrma-field-grid">
                <Field required={false} label="Discharge — Town"><input className="nwrma-field-input" value={form.dischargeTown} onChange={(e) => patch({ dischargeTown: e.target.value })} /></Field>
                <Field required={false} label="District"><input className="nwrma-field-input" value={form.dischargeDistrict} onChange={(e) => patch({ dischargeDistrict: e.target.value })} /></Field>
                <Field required={false} label="Region"><input className="nwrma-field-input" value={form.dischargeRegion} onChange={(e) => patch({ dischargeRegion: e.target.value })} /></Field>
                <Field required={false} label="Discharge GPS"><input className="nwrma-field-input" value={form.dischargeGps} onChange={(e) => patch({ dischargeGps: e.target.value })} /></Field>
                <Field required={false} label="Return flow quantity (m³/day)"><input className="nwrma-field-input" value={form.returnFlowQuantity} onChange={(e) => patch({ returnFlowQuantity: e.target.value })} /></Field>
                <Field required={false} label="Receiving water body type"><input className="nwrma-field-input" value={form.receivingWaterBodyType} onChange={(e) => patch({ receivingWaterBodyType: e.target.value })} /></Field>
                <Field required={false} label="Receiving water body name"><input className="nwrma-field-input" value={form.receivingWaterBodyName} onChange={(e) => patch({ receivingWaterBodyName: e.target.value })} /></Field>
                <Field required={false} label="Quality of return flow" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={2} value={form.returnFlowQuality} onChange={(e) => patch({ returnFlowQuality: e.target.value })} /></Field>
                <Field required={false} label="Water quality assessment method" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={2} value={form.waterQualityAssessmentMethod} onChange={(e) => patch({ waterQualityAssessmentMethod: e.target.value })} /></Field>
                <Field required={false} label="Water quality testing institution(s)" className="nwrma-field--full"><input className="nwrma-field-input" value={form.waterQualityTestingInstitutions} onChange={(e) => patch({ waterQualityTestingInstitutions: e.target.value })} /></Field>
                <Field required={false} label="Projected use from"><input type="date" className="nwrma-field-input" value={form.projectedUseFrom} onChange={(e) => patch({ projectedUseFrom: e.target.value })} /></Field>
                <Field required={false} label="Projected use to"><input type="date" className="nwrma-field-input" value={form.projectedUseTo} onChange={(e) => patch({ projectedUseTo: e.target.value })} /></Field>
              </div>
              <Field label="7.0 Project description" className="mt-4 nwrma-field--full">
                <textarea className="nwrma-field-input" rows={6} value={form.projectDescription} onChange={(e) => patch({ projectDescription: e.target.value })} />
              </Field>
              <Field required={false} label="Date of acquisition of interest" className="mt-4"><input type="date" className="nwrma-field-input" value={form.acquisitionDate} onChange={(e) => patch({ acquisitionDate: e.target.value })} /></Field>
              <Field required={false} label="Beneficiaries" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={2} value={form.beneficiaries} onChange={(e) => patch({ beneficiaries: e.target.value })} /></Field>
              <Field required={false} label="Other major users" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={2} value={form.otherMajorUsers} onChange={(e) => patch({ otherMajorUsers: e.target.value })} /></Field>
            </FormSection>
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={7}>
            <FormSection title="8.0–9.0 Affected parties & environment">
              <Field required={false} label="Affected parties list (attach list)" className="nwrma-field--full">
                <textarea className="nwrma-field-input" rows={3} value={form.affectedPartiesList} onChange={(e) => patch({ affectedPartiesList: e.target.value })} />
              </Field>
              <Field required={false} label="Affected by proposed use — Upstream" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={2} value={form.affectedByUseUpstream} onChange={(e) => patch({ affectedByUseUpstream: e.target.value })} /></Field>
              <Field required={false} label="Affected by proposed use — Downstream" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={2} value={form.affectedByUseDownstream} onChange={(e) => patch({ affectedByUseDownstream: e.target.value })} /></Field>
              <Field required={false} label="Affected by subsequent discharges — Downstream" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={2} value={form.affectedByDischargeDownstream} onChange={(e) => patch({ affectedByDischargeDownstream: e.target.value })} /></Field>
              <Field label="Major environmental impacts" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={4} value={form.environmentalImpacts} onChange={(e) => patch({ environmentalImpacts: e.target.value })} /></Field>
              <Field label="Measures to avoid pollution, flooding or adverse effects" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={4} value={form.pollutionMitigationMeasures} onChange={(e) => patch({ pollutionMitigationMeasures: e.target.value })} /></Field>
              <Field required={false} label="9.0 Abstraction — pump details" className="nwrma-field--full"><textarea className="nwrma-field-input" rows={4} value={form.abstractionPumpDetails} onChange={(e) => patch({ abstractionPumpDetails: e.target.value })} placeholder="Names/models of pumps, capacity, hours per day, rate m³/hr, etc." /></Field>
            </FormSection>
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={8}>
            <FormSection title="Activity-specific data (sections 9–24)">
              <p className="nwrma-muted text-sm mb-4">Complete sections relevant to your selected purposes. Mark N/A where not applicable.</p>
              {ACTIVITY_SECTION_KEYS.map((key) => (
                <Field
                  key={key}
                  required={false}
                  label={ACTIVITY_SECTION_LABELS[key]}
                  className="nwrma-field--full mb-4"
                >
                  <textarea
                    className="nwrma-field-input"
                    rows={4}
                    value={form.activitySections[key] ?? ''}
                    onChange={(e) =>
                      patch({
                        activitySections: { ...form.activitySections, [key]: e.target.value },
                      })
                    }
                  />
                </Field>
              ))}
            </FormSection>
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={9}>
            <FormSection title="Required document uploads">
              <EffluentDischargeDocumentUploadGrid files={documents} onChange={setDocuments} />
            </FormSection>
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={10}>
            <>
              <FormSection title="Declaration">
                <p>The information contained in this application is true to the best of my knowledge, information and belief.</p>
                <div className="nwrma-field-grid">
                  <Field label="Signature"><input className="nwrma-field-input" value={form.declarationSignature} onChange={(e) => patch({ declarationSignature: e.target.value })} /></Field>
                  <Field label="Print name"><input className="nwrma-field-input" value={form.declarationPrintName} onChange={(e) => patch({ declarationPrintName: e.target.value })} /></Field>
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
          </FormPaymentGateWizardStep>

          <FormPaymentGateWizardStep gate={paymentGate} step={step} targetStep={11}>
            <FormSection title="Review & submit">
              <ul className="nwrma-review-summary">
                <li><strong>Company:</strong> {form.companyName}</li>
                <li><strong>Contact:</strong> {form.contactPersonName} — {form.email}</li>
                <li><strong>Location:</strong> {form.town}, {form.district}</li>
                <li><strong>Purposes:</strong> {form.purposes.join(', ') || '—'}</li>
                <li><strong>Documents:</strong> {EFFLUENT_DISCHARGE_REQUIRED_SLOTS.filter((s) => documents[s.id]?.length).length} of {EFFLUENT_DISCHARGE_REQUIRED_SLOTS.length} required</li>
              </ul>
            </FormSection>
          </FormPaymentGateWizardStep>

          {paymentGate.showFormNav ? (
          <div className="nwrma-form-nav">
            {step > 0 && paymentGate.canAccessWizardSteps ? (
              <button type="button" className="nwrma-btn-secondary" onClick={goBack} disabled={submitting}>Back</button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="nwrma-btn-primary" onClick={goNext}>Continue</button>
            ) : (
              <button type="button" className="nwrma-btn-primary" onClick={() => void submit()} disabled={submitting}>
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
