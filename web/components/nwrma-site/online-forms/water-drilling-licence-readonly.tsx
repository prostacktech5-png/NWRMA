'use client'

import { Paperclip } from 'lucide-react'
import { ApplicationCompletenessBanner } from '@/components/forms/application-completeness-banner'
import { WaterDrillingLicencePdfLayout } from '@/components/nwrma-site/online-forms/water-drilling-licence-pdf-layout'
import { LicenseDocumentActions } from '@/components/borehole-licensing/license-document-actions'
import { REQUIRED_DOCUMENTS } from '@/lib/borehole-licensing-documents'
import { scanWaterDrillingCompleteness } from '@/lib/online-form-readonly-completeness'
import { FORM_INSTRUCTIONS } from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'
import type { BoreholeLicenseApplication } from '@/lib/types'
import { cn } from '@/lib/utils'

export function WaterDrillingLicenceReadonly({
  application,
}: {
  application: BoreholeLicenseApplication
}) {
  const form = application.extendedForm
  if (!form) return null

  const report = scanWaterDrillingCompleteness(application)

  return (
    <div>
      <ApplicationCompletenessBanner report={report} className="application-completeness-banner mb-4" />
      <WaterDrillingLicencePdfLayout form={form} reference={application.reference} />

      <section className="wdl-pdf__staff-section">
        <h3 className="text-base font-semibold text-[#0a2647] mb-1">Staff review — submitted uploads</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Annex files and business particulars from the public portal (not shown on the blank PDF).
        </p>
        <p className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          <strong>NOTE:</strong> {FORM_INSTRUCTIONS.cvNote}
        </p>
        <div className="space-y-4">
          {REQUIRED_DOCUMENTS.map((doc) => {
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
                        <LicenseDocumentActions
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
      </section>
    </div>
  )
}
