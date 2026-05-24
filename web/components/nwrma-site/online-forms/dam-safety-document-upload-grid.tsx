'use client'

import {
  DAM_SAFETY_REQUIRED_DOCUMENTS,
  type DamSafetyDocumentSlotId,
} from '@/lib/dam-safety-documents'
import { DocumentSlotFileInput } from '@/components/nwrma-site/online-forms/doc-upload-slot-input'

export type DamSafetyFilesState = Record<DamSafetyDocumentSlotId, File[]>

export function DamSafetyDocumentUploadGrid({
  files,
  onChange,
}: {
  files: DamSafetyFilesState
  onChange: (files: DamSafetyFilesState) => void
}) {
  const setSlot = (slotId: DamSafetyDocumentSlotId, slotFiles: File[]) => {
    onChange({ ...files, [slotId]: slotFiles })
  }

  return (
    <div className="nwrma-doc-upload-grid">
      {DAM_SAFETY_REQUIRED_DOCUMENTS.map((doc) => (
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
