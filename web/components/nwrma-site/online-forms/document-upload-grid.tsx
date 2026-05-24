'use client'

import { REQUIRED_DOCUMENTS } from '@/lib/borehole-licensing-documents'
import type { DocumentSlotId } from '@/lib/borehole-licensing-documents'
import { DocumentSlotFileInput } from '@/components/nwrma-site/online-forms/doc-upload-slot-input'

export type DocumentFilesState = Record<DocumentSlotId, File[]>

export function DocumentUploadGrid({
  files,
  onChange,
}: {
  files: DocumentFilesState
  onChange: (files: DocumentFilesState) => void
}) {
  const setSlot = (slotId: DocumentSlotId, slotFiles: File[]) => {
    onChange({ ...files, [slotId]: slotFiles })
  }

  return (
    <div className="nwrma-doc-upload-grid">
      {REQUIRED_DOCUMENTS.map((doc) => (
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
