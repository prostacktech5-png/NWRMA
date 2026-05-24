'use client'

import {
  EFFLUENT_DISCHARGE_REQUIRED_DOCUMENTS,
  type EffluentDischargeDocumentSlotId,
} from '@/lib/effluent-discharge-documents'
import { DocumentSlotFileInput } from '@/components/nwrma-site/online-forms/doc-upload-slot-input'

export type EffluentDischargeFilesState = Record<EffluentDischargeDocumentSlotId, File[]>

export function EffluentDischargeDocumentUploadGrid({
  files,
  onChange,
}: {
  files: EffluentDischargeFilesState
  onChange: (files: EffluentDischargeFilesState) => void
}) {
  const setSlot = (slotId: EffluentDischargeDocumentSlotId, slotFiles: File[]) => {
    onChange({ ...files, [slotId]: slotFiles })
  }

  return (
    <div className="nwrma-doc-upload-grid">
      {EFFLUENT_DISCHARGE_REQUIRED_DOCUMENTS.map((doc) => (
        <div key={doc.id} className="nwrma-doc-upload-slot">
          <label
            className={
              doc.optional ? 'nwrma-doc-upload-label' : 'nwrma-doc-upload-label nwrma-doc-upload-label--required'
            }
          >
            {doc.label}
            {doc.optional ? <span className="nwrma-muted"> (optional)</span> : null}
            <span className="nwrma-doc-upload-hint">{doc.description}</span>
          </label>
          <DocumentSlotFileInput
            inputId={`doc-upload-${doc.id}`}
            files={files[doc.id] ?? []}
            onChange={(slotFiles) => setSlot(doc.id, slotFiles)}
          />
        </div>
      ))}
    </div>
  )
}
