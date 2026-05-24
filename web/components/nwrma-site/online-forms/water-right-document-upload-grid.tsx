'use client'

import {
  WATER_RIGHT_REQUIRED_DOCUMENTS,
  type WaterRightDocumentSlotId,
} from '@/lib/water-right-documents'
import { DocumentSlotFileInput } from '@/components/nwrma-site/online-forms/doc-upload-slot-input'

export type WaterRightFilesState = Record<WaterRightDocumentSlotId, File[]>

export function WaterRightDocumentUploadGrid({
  files,
  onChange,
}: {
  files: WaterRightFilesState
  onChange: (files: WaterRightFilesState) => void
}) {
  const setSlot = (slotId: WaterRightDocumentSlotId, slotFiles: File[]) => {
    onChange({ ...files, [slotId]: slotFiles })
  }

  return (
    <div className="nwrma-doc-upload-grid">
      {WATER_RIGHT_REQUIRED_DOCUMENTS.map((doc) => (
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
