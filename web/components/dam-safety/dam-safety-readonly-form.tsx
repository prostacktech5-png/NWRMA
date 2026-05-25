'use client'

import { Paperclip } from 'lucide-react'
import { DamSafetyDocumentActions } from '@/components/dam-safety/dam-safety-document-actions'
import { PortalFormReviewShell } from '@/components/forms/portal-form-review-shell'
import { PortalReadonlyField } from '@/components/forms/portal-readonly-field'
import { PortalReadonlyYesNo } from '@/components/forms/portal-readonly-yes-no'
import { FormSection } from '@/components/nwrma-site/online-forms/form-section'
import { DAM_SAFETY_REQUIRED_DOCUMENTS } from '@/lib/dam-safety-documents'
import {
  ACTIVITY_SECTION_KEYS,
  ACTIVITY_SECTION_LABELS,
} from '@/lib/nwrma-site/online-forms/dam-safety-schema'
import type { DamSafetyApplication } from '@/lib/types'
import { cn } from '@/lib/utils'

export function DamSafetyReadonlyForm({ application }: { application: DamSafetyApplication }) {
  const form = application.extendedForm
  if (!form) return null

  return (
    <PortalFormReviewShell
      documentTitle="APPLICATION FOR DAM SAFETY LICENCE"
      reference={application.reference}
    >
      <FormSection title="1.0 Applicant details">
        <div className="nwrma-field-grid">
          <PortalReadonlyField label="Name of company/organization" value={form.companyName} />
          <PortalReadonlyField label="Name of CEO/Director" value={form.ceoDirectorName} />
          <PortalReadonlyField label="Name of contact person(s)" value={form.contactPersonName} />
          <PortalReadonlyField label="Mailing address" value={form.mailingAddress} className="nwrma-field--full" />
          <PortalReadonlyField label="Telephone (Office)" value={form.officePhone} />
          <PortalReadonlyField label="Mobile" value={form.mobilePhone} />
          <PortalReadonlyField label="Fax" value={form.fax} />
          <PortalReadonlyField label="E-mail" value={form.email} />
          <PortalReadonlyField label="Website" value={form.website} />
          <PortalReadonlyField
            label="Licence type"
            value={form.licenceType === 'renewal' ? `Renewal — ${form.renewalLicenceId || '—'}` : 'New'}
          />
        </div>
        <h4 className="mt-6 font-semibold text-[#1a5c4a]">1.1 Ownership information</h4>
        <PortalReadonlyField label="Ownership type" value={form.ownershipType} />
        <PortalReadonlyField label="Partners / other details" value={form.partnersDetails} className="nwrma-field--full" />
        <PortalReadonlyField label="Ownership (other)" value={form.ownershipOther} className="nwrma-field--full" />
      </FormSection>

      <FormSection title="2.0–3.0 Location & purpose of water use">
        <div className="nwrma-field-grid">
          <PortalReadonlyField label="Town" value={form.town} />
          <PortalReadonlyField label="District" value={form.district} />
          <PortalReadonlyField label="Region" value={form.region} />
          <PortalReadonlyField
            label="Water use category"
            value={form.waterUseCategory === 'consumptive' ? 'Consumptive' : 'Non-consumptive'}
          />
          <PortalReadonlyField
            label="Purpose(s) of water use"
            value={[...form.purposes, form.purposesOther].filter(Boolean).join(', ')}
            className="nwrma-field--full"
          />
        </div>
      </FormSection>

      <FormSection title="4.0 Included documents checklist">
        <PortalReadonlyYesNo label="Environmental Impact Assessment Report" {...form.includedDocuments.eiaReport} />
        <PortalReadonlyYesNo label="Environmental Permit & Schedule" {...form.includedDocuments.environmentalPermit} />
        <PortalReadonlyYesNo label="Other relevant permits from MDAs" {...form.includedDocuments.otherMdaPermits} />
        <PortalReadonlyYesNo label="Site Plan" {...form.includedDocuments.sitePlan} />
        <PortalReadonlyYesNo label="Water Demand Management Plan" {...form.includedDocuments.wdmp} />
        <PortalReadonlyYesNo label="Business Certificates" {...form.includedDocuments.businessCertificates} />
        <PortalReadonlyField
          label="If any answer is No, state reasons and expected dates"
          value={form.includedDocumentsReasons}
          className="nwrma-field--full mt-4"
        />
      </FormSection>

      <FormSection title="5.0 Data on the (proposed) dam use">
        <div className="nwrma-field-grid">
          <PortalReadonlyField label="Dam location — Town" value={form.damLocationTown} />
          <PortalReadonlyField label="District" value={form.damLocationDistrict} />
          <PortalReadonlyField label="Region" value={form.damLocationRegion} />
          <PortalReadonlyField label="GPS coordinates" value={form.damGpsCoordinates} className="nwrma-field--full" />
          <PortalReadonlyField label="Current status of dam" value={form.damStatus} />
          <PortalReadonlyField label="Date of commencement (if in operation)" value={form.activityCommencementDate} />
          <PortalReadonlyField label="Type of water source" value={form.waterSourceType} />
          <PortalReadonlyField label="Name of water source" value={form.waterSourceName} />
          <PortalReadonlyField label="Tributary of" value={form.tributaryOf} />
          <PortalReadonlyField
            label="Storage types (tailings, hydrocarbon, etc.)"
            value={form.storageTypes}
            className="nwrma-field--full"
          />
          <PortalReadonlyField label="Communities upstream" value={form.communitiesUpstream} className="nwrma-field--full" />
          <PortalReadonlyField label="Communities downstream" value={form.communitiesDownstream} className="nwrma-field--full" />
          <PortalReadonlyField label="Water users upstream" value={form.waterUsersUpstream} className="nwrma-field--full" />
          <PortalReadonlyField label="Water users downstream" value={form.waterUsersDownstream} className="nwrma-field--full" />
          <PortalReadonlyField label="Class of dam" value={form.damClass} />
          <PortalReadonlyField label="Material of dam" value={form.damMaterial} />
          <PortalReadonlyField label="Function of dam" value={form.damFunction} />
          <PortalReadonlyField label="Types of dams" value={form.damTypes} />
          <PortalReadonlyField label="Class of dam being applied for" value={form.damClassAppliedFor} />
          <PortalReadonlyField label="Actual capacity (if in progress)" value={form.actualCapacity} />
          <PortalReadonlyField label="Rate of use — Daily" value={form.rateOfUseDaily} />
          <PortalReadonlyField label="Rate of use — Seasonal/monthly" value={form.rateOfUseSeasonal} />
          <PortalReadonlyField
            label="Method of determining consumption"
            value={form.consumptionDeterminationMethod}
            className="nwrma-field--full"
          />
        </div>
      </FormSection>

      <FormSection title="6.0–8.0 Discharges, project & affected parties">
        <div className="nwrma-field-grid">
          <PortalReadonlyField label="Discharge — Town" value={form.dischargeTown} />
          <PortalReadonlyField label="District" value={form.dischargeDistrict} />
          <PortalReadonlyField label="Region" value={form.dischargeRegion} />
          <PortalReadonlyField label="Discharge GPS" value={form.dischargeGps} />
          <PortalReadonlyField label="Return flow quantity (m³/day)" value={form.returnFlowQuantity} />
          <PortalReadonlyField label="Receiving water body type" value={form.receivingWaterBodyType} />
          <PortalReadonlyField label="Receiving water body name" value={form.receivingWaterBodyName} />
          <PortalReadonlyField label="Quality of return flow" value={form.returnFlowQuality} className="nwrma-field--full" />
          <PortalReadonlyField
            label="Water quality assessment method"
            value={form.waterQualityAssessmentMethod}
            className="nwrma-field--full"
          />
          <PortalReadonlyField
            label="Water quality testing institution(s)"
            value={form.waterQualityTestingInstitutions}
            className="nwrma-field--full"
          />
          <PortalReadonlyField label="Projected use from" value={form.projectedUseFrom} />
          <PortalReadonlyField label="Projected use to" value={form.projectedUseTo} />
        </div>
        <PortalReadonlyField label="7.0 Project description" value={form.projectDescription} className="mt-4 nwrma-field--full" />
        <PortalReadonlyField label="Date of acquisition of interest" value={form.acquisitionDate} className="mt-4" />
        <PortalReadonlyField label="Beneficiaries" value={form.beneficiaries} className="nwrma-field--full" />
        <PortalReadonlyField label="Other major users" value={form.otherMajorUsers} className="nwrma-field--full" />
      </FormSection>

      <FormSection title="8.0–9.0 Affected parties & environment">
        <PortalReadonlyField label="Affected parties list (attach list)" value={form.affectedPartiesList} className="nwrma-field--full" />
        <PortalReadonlyField label="Affected by proposed use — Upstream" value={form.affectedByUseUpstream} className="nwrma-field--full" />
        <PortalReadonlyField label="Affected by proposed use — Downstream" value={form.affectedByUseDownstream} className="nwrma-field--full" />
        <PortalReadonlyField
          label="Affected by subsequent discharges — Downstream"
          value={form.affectedByDischargeDownstream}
          className="nwrma-field--full"
        />
        <PortalReadonlyField label="Major environmental impacts" value={form.environmentalImpacts} className="nwrma-field--full" />
        <PortalReadonlyField
          label="Measures to avoid pollution, flooding or adverse effects"
          value={form.pollutionMitigationMeasures}
          className="nwrma-field--full"
        />
        <PortalReadonlyField
          label="9.0 Abstraction — pump details"
          value={form.abstractionPumpDetails}
          className="nwrma-field--full"
        />
      </FormSection>

      <FormSection title="Activity-specific data (sections 9–24)">
        <p className="nwrma-muted text-sm mb-4">
          Sections relevant to selected purposes. Empty sections are highlighted — confirm N/A with
          applicant where needed.
        </p>
        {ACTIVITY_SECTION_KEYS.map((key) => {
          const value = form.activitySections[key]?.trim()
          const empty = !value
          return (
            <div key={key} className="mb-4">
              <span className="nwrma-field-label block mb-1">{ACTIVITY_SECTION_LABELS[key]}</span>
              <div
                className={cn(
                  'portal-readonly-value min-h-[4rem]',
                  empty && 'portal-readonly-value--empty'
                )}
              >
                {empty ? 'Not provided (N/A or not applicable)' : value}
              </div>
            </div>
          )
        })}
      </FormSection>

      <FormSection title="Declaration">
        <div className="nwrma-field-grid">
          <PortalReadonlyField label="Signature" value={form.declarationSignature} />
          <PortalReadonlyField label="Print name" value={form.declarationPrintName} />
          <PortalReadonlyField label="Date" value={form.declarationDate} />
        </div>
      </FormSection>

      <FormSection title="Required document uploads">
        <div className="space-y-4">
          {DAM_SAFETY_REQUIRED_DOCUMENTS.map((doc) => {
            const files = application.documents?.[doc.id] ?? []
            const missing = !doc.optional && files.length === 0
            return (
              <div
                key={doc.id}
                className={cn(
                  'rounded border p-3',
                  missing ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50'
                )}
              >
                <p className="text-sm font-semibold">{doc.label}</p>
                <p className="text-xs text-muted-foreground">{doc.description}</p>
                {files.length === 0 ? (
                  <p className={cn('mt-2 text-sm', missing ? 'text-amber-800 font-medium' : 'text-muted-foreground')}>
                    {missing ? 'Required — no files submitted' : 'No files submitted'}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {files.map((file, fileIndex) => (
                      <li
                        key={file.id ? `${doc.id}-${file.id}` : `${doc.id}-${fileIndex}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded bg-white px-2 py-1.5 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate" title={file.name}>
                            {file.name}
                          </span>
                        </span>
                        <DamSafetyDocumentActions
                          applicationId={application.id}
                          fileId={file.id ?? `${doc.id}-${fileIndex}-${file.name}`}
                          fileName={file.name}
                          hasStorage={Boolean(file.storageKey)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      </FormSection>

      {application.reviewNote ? (
        <FormSection title="Staff review notes">
          <PortalReadonlyField label="Notes" value={application.reviewNote} className="nwrma-field--full" highlightIfEmpty={false} />
        </FormSection>
      ) : null}
    </PortalFormReviewShell>
  )
}
