'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { resolvedApiUrl } from '@/lib/apiBase'
import type { ApplicationAmendFormSlug } from '@/lib/application-amendment'

export type ApplicationAmendLoadResponse = {
  ok?: boolean
  error?: string
  formSlug?: ApplicationAmendFormSlug
  applicationId?: string
  reference?: string
  reviewNote?: string | null
  form?: Record<string, unknown>
  existingDocuments?: Record<string, { id: string; name: string }[]>
}

export function useApplicationAmendment<T extends Record<string, unknown>>(params: {
  formSlug: ApplicationAmendFormSlug
  createDefaultForm: () => T
  patchForm: (form: T) => void
}) {
  const { createDefaultForm, patchForm } = params
  const patchFormRef = useRef(patchForm)
  patchFormRef.current = patchForm
  const searchParams = useSearchParams()
  const amendParam = searchParams.get('amend')?.trim() ?? ''
  const handledRef = useRef<string | null>(null)

  const [phase, setPhase] = useState<'none' | 'loading' | 'ready' | 'error'>('none')
  const [amendToken, setAmendToken] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
  const [reference, setReference] = useState('')
  const [reviewNote, setReviewNote] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const clearAmendFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.has('amend')) {
      url.searchParams.delete('amend')
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
  }, [])

  useEffect(() => {
    if (!amendParam) {
      setPhase('none')
      return
    }
    if (handledRef.current === amendParam) return
    handledRef.current = amendParam

    const run = async () => {
      setPhase('loading')
      setLoadError(null)
      try {
        const res = await fetch(
          resolvedApiUrl(
            `/api/public/application-amend?amend=${encodeURIComponent(amendParam)}`
          ),
          { cache: 'no-store' }
        )
        const data = (await res.json().catch(() => ({}))) as ApplicationAmendLoadResponse
        if (!res.ok) {
          setLoadError(data.error ?? 'Could not open your application.')
          setPhase('error')
          return
        }
        if (!data.form || !data.applicationId) {
          setLoadError('Application data is unavailable.')
          setPhase('error')
          return
        }
        setAmendToken(amendParam)
        setApplicationId(data.applicationId)
        setReference(data.reference ?? '')
        setReviewNote(data.reviewNote ?? null)
        patchFormRef.current(data.form as T)
        setPhase('ready')
      } catch {
        setLoadError('Network error. Please try again.')
        setPhase('error')
      }
    }

    void run()
  }, [amendParam])

  const canAccessWizardSteps = phase === 'ready' && !!amendToken && !!applicationId

  return {
    phase,
    amendToken,
    applicationId,
    reference,
    reviewNote,
    loadError,
    canAccessWizardSteps,
    isAmendMode: phase === 'ready' || phase === 'loading',
    clearAmendFromUrl,
    createDefaultForm,
  }
}
