'use client'

import { Paperclip } from 'lucide-react'
import { ApplicationCompletenessBanner } from '@/components/forms/application-completeness-banner'
import { PortalFormReviewShell } from '@/components/forms/portal-form-review-shell'
import { PortalReadonlyField } from '@/components/forms/portal-readonly-field'
import { PortalReadonlyYesNo } from '@/components/forms/portal-readonly-yes-no'
import { FormSection } from '@/components/nwrma-site/online-forms/form-section'
import { WaterRightDocumentActions } from '@/components/water-right/water-right-document-actions'
import { scanWaterRightCompleteness } from '@/lib/online-form-readonly-completeness'
import { WATER_RIGHT_REQUIRED_DOCUMENTS } from '@/lib/water-right-documents'
import {
  ACTIVITY_SECTION_KEYS,
  ACTIVITY_SECTION_LABELS,
} from '@/lib/nwrma-site/online-forms/water-right-schema'
import type { WaterRightApplication } from '@/lib/types'
import { cn } from '@/lib/utils'

export function WaterRightReadonlyForm({ application }: { application: WaterRightApplication }) {
  const form = application.extendedForm
  if (!form) return null

  const report = scanWaterRightCompleteness(application)

  return (
    <PortalFormReviewShell
      documentTitle="APPLICATION FOR WATER RIGHT PERMIT"
      reference={application.reference}
      topSlot={<ApplicationCompletenessBanner report={report} className="application-completeness-banner" />}
    >
      <FormSection title="1.0 Applicant details">
        <div className="nwrma-field-grid">
          <PortalReadonlyField label="Company / organisation" value={form.companyName} highlightIfEmpty />
            <PortalReadonlyField label="CEO / Director" value={form.ceoDirectorName} highlightIfEmpty />
            <PortalReadonlyField label="Contact person" value={form.contactPersonName} highlightIfEmpty />
            <PortalReadonlyField label="Email" value={form.email} highlightIfEmpty />
            <PortalReadonlyField label="Office phone" value={form.officePhone} />
            <PortalReadonlyField label="Mobile" value={form.mobilePhone} />
            <PortalReadonlyField label="Fax" value={form.fax} />
            <PortalReadonlyField label="Website" value={form.website} />
            <div className="sm:col-span-2">
              <PortalReadonlyField label="Mailing address" value={form.mailingAddress} />
            </div>
            <PortalReadonlyField
              label="Permit type"
              value={
                form.permitType === 'renewal'
                  ? `Renewal (${form.renewalPermitId || 'ID not provided'})`
                  : 'New permit'
              }
            />
            <PortalReadonlyField
              label="Administrative fee tier"
              value={
                form.acknowledgements.adminFeeTier === 'western_makeni_bo'
                  ? 'Western Area, Makeni or Bo Cities (SLL 1,000)'
                  : 'Provincial (SLL 20,000)'
              }
            />
            <PortalReadonlyField label="Ownership type" value={form.ownershipType} />
            {form.ownershipOther ? (
              <PortalReadonlyField label="Ownership (other)" value={form.ownershipOther} />
            ) : null}
            {form.partnersDetails ? (
              <div className="sm:col-span-2">
                <PortalReadonlyField label="Partners / shareholders" value={form.partnersDetails} />
              </div>
            ) : null}
        </div>
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
            <div className="sm:col-span-2">
              <PortalReadonlyField
                label="Purpose(s) of water use"
                value={[...form.purposes, form.purposesOther].filter(Boolean).join(', ')}
              />
            </div>
        </div>
      </FormSection>

      <FormSection title="4.0 Included documents checklist">
          <PortalReadonlyYesNo label="EIA report" {...form.includedDocuments.eiaReport} />
          <PortalReadonlyYesNo
            label="Environmental permit & schedule"
            {...form.includedDocuments.environmentalPermit}
          />
          <PortalReadonlyYesNo label="Other MDA permits" {...form.includedDocuments.otherMdaPermits} />
          <PortalReadonlyYesNo label="Site plan" {...form.includedDocuments.sitePlan} />
          <PortalReadonlyYesNo label="Water demand management plan" {...form.includedDocuments.wdmp} />
          <PortalReadonlyYesNo
            label="Business certificates"
            {...form.includedDocuments.businessCertificates}
          />
          <PortalReadonlyField
            label="Reasons if No / expected dates"
            value={form.includedDocumentsReasons}
            highlightIfEmpty
          />
      </FormSection>

      <FormSection title="5.0–8.0 Water use, discharges & project">
        <div className="nwrma-field-grid">
            <PortalReadonlyField
              label="Point of water use"
              value={`${form.usePointTown}, ${form.usePointDistrict}, ${form.usePointRegion}`}
            />
            <PortalReadonlyField label="GPS" value={form.usePointGps} />
            <PortalReadonlyField label="Activity status" value={form.activityStatus} />
            <PortalReadonlyField label="Activity commencement" value={form.activityCommencementDate} />
            <PortalReadonlyField label="Water source type" value={form.waterSourceType} />
            <PortalReadonlyField label="Water source name" value={form.waterSourceName} />
            <PortalReadonlyField label="Tributary of" value={form.tributaryOf} />
            <PortalReadonlyField label="Groundwater boreholes" value={form.groundwaterBoreholes} />
            <PortalReadonlyField label="Rate of use (m³/annum)" value={form.rateOfUseAnnual} />
            <PortalReadonlyField label="Rate of use (daily)" value={form.rateOfUseDaily} />
            <PortalReadonlyField label="Rate of use (seasonal)" value={form.rateOfUseSeasonal} />
            <PortalReadonlyField
              label="Consumption determination method"
              value={form.consumptionDeterminationMethod}
            />
            <div className="sm:col-span-2">
              <PortalReadonlyField label="Project description" value={form.projectDescription} highlightIfEmpty />
            </div>
            <PortalReadonlyField
              label="Discharge location"
              value={[form.dischargeTown, form.dischargeDistrict, form.dischargeRegion]
                .filter(Boolean)
                .join(', ')}
            />
            <PortalReadonlyField label="Discharge GPS" value={form.dischargeGps} />
            <PortalReadonlyField label="Return flow quantity" value={form.returnFlowQuantity} />
            <PortalReadonlyField
              label="Receiving water body"
              value={`${form.receivingWaterBodyType} — ${form.receivingWaterBodyName}`}
            />
            <PortalReadonlyField label="Return flow quality" value={form.returnFlowQuality} />
        </div>
      </FormSection>

      <FormSection title="8.0–9.0 Affected parties & environment">
          <PortalReadonlyField label="Communities upstream" value={form.communitiesUpstream} />
          <PortalReadonlyField label="Communities downstream" value={form.communitiesDownstream} />
          <PortalReadonlyField label="Affected parties list" value={form.affectedPartiesList} />
          <PortalReadonlyField label="Environmental impacts" value={form.environmentalImpacts} highlightIfEmpty />
          <PortalReadonlyField
            label="Pollution mitigation measures"
            value={form.pollutionMitigationMeasures}
            highlightIfEmpty
          />
          <PortalReadonlyField label="Abstraction / pump details" value={form.abstractionPumpDetails} />
      </FormSection>

      <FormSection title="Activity-specific data (sections 9–24)">
        {ACTIVITY_SECTION_KEYS.map((key) => {
          const value = form.activitySections[key]?.trim()
          const empty = !value
          return (
            <div key={key} className="mb-4">
              <span className="nwrma-field-label block mb-1">{ACTIVITY_SECTION_LABELS[key]}</span>
              <div className={cn('portal-readonly-value min-h-[4rem]', empty && 'portal-readonly-value--empty')}>
                {empty ? 'Not provided (N/A or not applicable)' : value}
              </div>
            </div>
          )
        })}
      </FormSection>

      <FormSection title="Declaration">
        <div className="nwrma-field-grid">
            <PortalReadonlyField label="Signature" value={form.declarationSignature} highlightIfEmpty />
            <PortalReadonlyField label="Print name" value={form.declarationPrintName} highlightIfEmpty />
            <PortalReadonlyField label="Date" value={form.declarationDate} highlightIfEmpty />
        </div>
      </FormSection>

      <FormSection title="Required document uploads">
        <div className="space-y-4">
            {WATER_RIGHT_REQUIRED_DOCUMENTS.map((doc) => {
              const files = application.documents?.[doc.id] ?? []
              const missing = !doc.optional && files.length === 0
              return (
                <div
                  key={doc.id}
                  className={cn(
                    'rounded-lg border p-4',
                    missing ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200 bg-gray-50/50'
                  )}
                >
                  <h4 className="font-medium text-[#0a2647]">
                    {doc.label}
                    {doc.optional ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        (optional)
                      </span>
                    ) : null}
                  </h4>
                  <p className="text-xs text-muted-foreground">{doc.description}</p>
                  {files.length === 0 ? (
                    <p
                      className={cn(
                        'mt-2 text-sm',
                        missing ? 'font-medium text-amber-800' : 'text-muted-foreground'
                      )}
                    >
                      {missing ? 'Required — no files submitted' : 'No files submitted'}
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {files.map((file, fileIndex) => (
                        <li
                          key={
                            file.id
                              ? `${doc.id}-${file.id}`
                              : `${doc.id}-${fileIndex}-${file.name}`
                          }
                          className="flex flex-col gap-2 rounded-md bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                            <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                            <span className="min-w-0 truncate" title={file.name}>
                              {file.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              ({Math.round(file.size / 1024)} KB)
                            </span>
                          </div>
                          <WaterRightDocumentActions
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
