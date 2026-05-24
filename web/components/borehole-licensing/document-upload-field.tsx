'use client'

import { useCallback, useId, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DEFAULT_ACCEPT = 'image/*,.pdf'

type DocumentUploadFieldProps = {
  id: string
  label: string
  description: string
  accept?: string
  multiple?: boolean
  files: File[]
  onFilesChange: (files: File[]) => void
}

function mergeFiles(existing: File[], incoming: FileList | File[]): File[] {
  const next = [...existing]
  const add = Array.from(incoming)
  for (const file of add) {
    const duplicate = next.some(
      (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
    )
    if (!duplicate) next.push(file)
  }
  return next
}

export function DocumentUploadField({
  id,
  label,
  description,
  accept = DEFAULT_ACCEPT,
  multiple = true,
  files,
  onFilesChange,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const labelId = useId()
  const descId = useId()
  const listId = useId()

  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      onFilesChange(mergeFiles(files, e.target.files))
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) {
      onFilesChange(mergeFiles(files, e.dataTransfer.files))
    }
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 id={labelId} className="font-medium text-[#0a2647]">
          {label}
        </h4>
        <p id={descId} className="mt-0.5 text-xs text-gray-500">
          {description}
        </p>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={handleInputChange}
        aria-labelledby={labelId}
        aria-describedby={descId}
      />

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openPicker()
          }
        }}
        onClick={openPicker}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragOver(false)
        }}
        onDrop={handleDrop}
        className={cn(
          'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center bg-gray-50 transition-colors',
          dragOver ? 'border-[#0072C6] bg-[#0072C6]/5' : 'border-gray-300'
        )}
        aria-labelledby={labelId}
        aria-describedby={descId}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          Drag and drop files here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500">PDF, JPG, PNG — multiple files allowed</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={(e) => {
            e.stopPropagation()
            openPicker()
          }}
        >
          Browse Files
        </Button>
      </div>

      {files.length > 0 && (
        <div id={listId} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-gray-700">
              {files.length} file{files.length === 1 ? '' : 's'} attached
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-gray-500 hover:text-red-600"
              onClick={() => onFilesChange([])}
            >
              Clear all
            </Button>
          </div>
          <ul className="space-y-1.5" aria-label={`Files for ${label}`}>
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                className="flex items-center justify-between gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-sm text-gray-700"
              >
                <span className="min-w-0 truncate" title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
