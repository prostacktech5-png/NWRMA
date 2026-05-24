'use client'

const ACCEPT =
  '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function mergeDocumentFiles(existing: File[], incoming: File[]): File[] {
  const seen = new Set(existing.map(fileKey))
  const merged = [...existing]
  for (const file of incoming) {
    const key = fileKey(file)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(file)
  }
  return merged
}

export function DocumentSlotFileInput({
  inputId,
  files,
  onChange,
}: {
  inputId: string
  files: File[]
  onChange: (files: File[]) => void
}) {
  return (
    <>
      <div className="nwrma-file-picker">
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          multiple
          className="nwrma-file-picker-input"
          onChange={(e) => {
            const picked = e.target.files ? Array.from(e.target.files) : []
            if (picked.length) onChange(mergeDocumentFiles(files, picked))
            e.target.value = ''
          }}
        />
        <label htmlFor={inputId} className="nwrma-btn-secondary nwrma-file-picker-btn">
          Choose files
        </label>
      </div>
      {files.length > 0 ? (
        <ul className="nwrma-doc-upload-files">
          {files.map((f, i) => (
            <li key={`${fileKey(f)}-${i}`} className="nwrma-doc-upload-file-row">
              <span className="nwrma-doc-upload-file-name">{f.name}</span>
              <button
                type="button"
                className="nwrma-doc-upload-remove"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}
