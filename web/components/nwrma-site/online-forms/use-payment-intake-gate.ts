'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { resolvedApiUrl } from '@/lib/apiBase'
import {
  applicantGateInitialValues,
  applyApplicantGate,
  BANK_RECEIPT_SLOT_ID,
  type ApplicantGateFields,
} from '@/lib/nwrma-site/online-forms/applicant-gate'
import type { OnlineFormSlug } from '@/lib/nwrma-site/online-forms/applicant-gate'
import type { OnlineFormPaymentIntakeAcknowledgements } from '@/lib/types'
import type { IntakeStatusResponse } from '@/lib/online-form-payment-intake'

const intakeStorageKey = (slug: string) => `nwrma-payment-intake-${slug}`

const sessionStorageKey = (slug: string) => `nwrma-payment-session-${slug}`

type StoredPaymentSession = { intakeId: string; sessionToken: string }

export type PaymentIntakePhase = 'fresh' | 'pending' | 'rejected' | 'validated' | 'resume_ready'

type GateFormState = {
  companyName?: string
  email?: string
  phone?: string
  mobilePhone?: string
  contactName?: string
  contactPersonName?: string
}

export function usePaymentIntakeGate<T extends GateFormState>(params: {
  formSlug: OnlineFormSlug
  form: T
  patchForm: (partial: Partial<T>) => void
  acknowledgements: OnlineFormPaymentIntakeAcknowledgements
}) {
  const { formSlug, patchForm, acknowledgements } = params
  const searchParams = useSearchParams()
  const resumeParam = searchParams.get('resume')?.trim() ?? ''

  const formRef = useRef(params.form)
  const acknowledgementsRef = useRef(acknowledgements)
  formRef.current = params.form
  acknowledgementsRef.current = acknowledgements

  const initDoneRef = useRef(false)
  const resumeHandledRef = useRef<string | null>(null)

  const [phase, setPhase] = useState<PaymentIntakePhase>('fresh')
  const [intakeId, setIntakeId] = useState<string | null>(null)
  const [resumeToken, setResumeToken] = useState<string | null>(null)
  const [intakeReference, setIntakeReference] = useState('')
  const [validationNote, setValidationNote] = useState<string | null>(null)
  const [gateError, setGateError] = useState<string | null>(null)
  const [submittingIntake, setSubmittingIntake] = useState(false)
  const [applicantGateOpen, setApplicantGateOpen] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [resumeActivating, setResumeActivating] = useState(false)
  const [pendingResumeToken, setPendingResumeToken] = useState<string | null>(null)
  const [organisationName, setOrganisationName] = useState('')
  const [intakeEmail, setIntakeEmail] = useState('')
  const [financeReceiptNumber, setFinanceReceiptNumber] = useState('')
  const [feeVerifiedDate, setFeeVerifiedDate] = useState('')
  const [cameFromPaymentResume, setCameFromPaymentResume] = useState(false)

  const clearResumeFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.has('resume')) {
      url.searchParams.delete('resume')
      window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    }
  }, [])

  const clearStoredPaymentSession = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(intakeStorageKey(formSlug))
      sessionStorage.removeItem(sessionStorageKey(formSlug))
    }
    setIntakeId(null)
    setResumeToken(null)
    setIntakeReference('')
    setValidationNote(null)
    setFinanceReceiptNumber('')
    setFeeVerifiedDate('')
    setPendingResumeToken(null)
    setCameFromPaymentResume(false)
  }, [formSlug])

  const resetForNewPayment = useCallback((message?: string | null) => {
    clearStoredPaymentSession()
    setPhase('fresh')
    setGateError(message ?? null)
  }, [clearStoredPaymentSession])

  const applyStatus = useCallback(
    (data: IntakeStatusResponse, token: string | null, opts?: { fromResume?: boolean }) => {
      if (data.requiresNewPayment) {
        resetForNewPayment(
          data.paymentBlockedMessage ??
            'Upload a new bank receipt to start another application.'
        )
        return
      }

      setIntakeReference(data.intakeReference)
      setValidationNote(data.validationNote)
      setFinanceReceiptNumber(data.financeReceiptNumber ?? '')
      setFeeVerifiedDate(data.feeVerifiedDate ?? '')
      setOrganisationName(data.organisationName)
      setIntakeEmail(data.email)
      const activeToken = data.sessionToken ?? token
      if (data.status === 'validated' && data.canContinue && activeToken) {
        setPhase('validated')
        setIntakeId(data.intakeId)
        setResumeToken(activeToken)
        if (opts?.fromResume) setCameFromPaymentResume(true)
        patchForm(
          applyApplicantGate(formSlug, formRef.current, {
            organizationName: data.organisationName,
            email: data.email,
            phone: data.phone,
            contactPersonName: data.contactPersonName,
          }) as Partial<T>
        )
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(intakeStorageKey(formSlug))
          const stored: StoredPaymentSession = {
            intakeId: data.intakeId,
            sessionToken: activeToken,
          }
          sessionStorage.setItem(sessionStorageKey(formSlug), JSON.stringify(stored))
        }
      } else if (data.status === 'rejected') {
        setPhase('rejected')
        setIntakeId(data.intakeId)
        setResumeToken(null)
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(intakeStorageKey(formSlug))
          sessionStorage.removeItem(sessionStorageKey(formSlug))
        }
      } else if (data.status === 'pending') {
        setPhase('pending')
        setIntakeId(data.intakeId)
        setResumeToken(null)
      }
    },
    [formSlug, patchForm, resetForNewPayment]
  )

  const fetchStatus = useCallback(
    async (opts: { intakeId?: string; resume?: string }) => {
      const q = opts.resume
        ? `resume=${encodeURIComponent(opts.resume)}`
        : opts.intakeId
          ? `intakeId=${encodeURIComponent(opts.intakeId)}`
          : null
      if (!q) return null

      const ctrl = new AbortController()
      const timeout = window.setTimeout(() => ctrl.abort(), 20_000)
      try {
        const res = await fetch(resolvedApiUrl(`/api/public/online-forms/payment-intake/status?${q}`), {
          signal: ctrl.signal,
          cache: 'no-store',
        })
        const data = (await res.json().catch(() => ({}))) as IntakeStatusResponse & { error?: string }
        return { res, data }
      } catch {
        return null
      } finally {
        window.clearTimeout(timeout)
      }
    },
    []
  )

  const postRedeem = useCallback(
    async (token: string) => {
      const res = await fetch(resolvedApiUrl('/api/public/online-forms/payment-intake/redeem'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: token }),
        cache: 'no-store',
      })
      const data = (await res.json().catch(() => ({}))) as IntakeStatusResponse & { error?: string }
      return { res, data }
    },
    []
  )

  const redeemResume = useCallback(async () => {
    const token = pendingResumeToken
    if (!token) return
    setSubmittingIntake(true)
    setResumeActivating(true)
    setGateError(null)
    try {
      const { res, data } = await postRedeem(token)
      if (!res.ok) {
        if (data.requiresNewPayment) {
          applyStatus(data, null)
          return
        }
        setGateError(data.error ?? 'Could not open application. Please try again.')
        return
      }
      setPendingResumeToken(null)
      applyStatus(data, null, { fromResume: true })
      clearResumeFromUrl()
    } catch {
      setGateError('Network error. Please try again.')
    } finally {
      setSubmittingIntake(false)
      setResumeActivating(false)
    }
  }, [pendingResumeToken, postRedeem, applyStatus, clearResumeFromUrl])

  const completeEmailResume = useCallback(
    async (emailToken: string) => {
      setResumeActivating(true)
      setGateError(null)
      try {
        const first = await fetchStatus({ resume: emailToken })
        if (!first) {
          setGateError('Could not verify resume link. Please try again.')
          setPhase('fresh')
          return
        }

        const { res, data } = first
        if (!res.ok) {
          if (data.requiresNewPayment) {
            applyStatus(data, null)
            return
          }
          setGateError(data.error ?? 'Could not verify resume link.')
          setPhase('fresh')
          return
        }

        if (data.needsRedeem) {
          const redeemed = await postRedeem(emailToken)
          if (!redeemed) {
            setGateError('Could not open application. Please try again.')
            return
          }
          if (!redeemed.res.ok) {
            if (redeemed.data.requiresNewPayment) {
              applyStatus(redeemed.data, null)
              return
            }
            setGateError(redeemed.data.error ?? 'Could not open application. Please try again.')
            return
          }
          applyStatus(redeemed.data, null, { fromResume: true })
          clearResumeFromUrl()
          return
        }

        if (data.status === 'validated' && data.canContinue && data.sessionToken) {
          applyStatus(data, data.sessionToken, { fromResume: true })
          clearResumeFromUrl()
          return
        }

        setGateError('Payment is not ready to continue yet.')
        setPhase('fresh')
      } finally {
        setResumeActivating(false)
      }
    },
    [fetchStatus, postRedeem, applyStatus, clearResumeFromUrl]
  )

  useEffect(() => {
    if (resumeParam) {
      if (resumeHandledRef.current === resumeParam) return
      resumeHandledRef.current = resumeParam
      initDoneRef.current = true
      setStatusLoading(true)
      void completeEmailResume(resumeParam).finally(() => setStatusLoading(false))
      return
    }

    if (initDoneRef.current) return
    initDoneRef.current = true

    const run = async () => {
      if (typeof sessionStorage !== 'undefined') {
        const sessionRaw = sessionStorage.getItem(sessionStorageKey(formSlug))
        if (sessionRaw) {
          try {
            const parsed = JSON.parse(sessionRaw) as StoredPaymentSession
            if (parsed.intakeId && parsed.sessionToken) {
              setStatusLoading(true)
              const result = await fetchStatus({ resume: parsed.sessionToken })
              setStatusLoading(false)
              if (result?.res.ok) {
                applyStatus(result.data, parsed.sessionToken)
              } else {
                resetForNewPayment(
                  result.data.error ??
                    'Your previous payment session has ended. Upload a new bank receipt to continue.'
                )
              }
              return
            }
          } catch {
            sessionStorage.removeItem(sessionStorageKey(formSlug))
          }
        }
      }

      const stored =
        typeof sessionStorage !== 'undefined'
          ? sessionStorage.getItem(intakeStorageKey(formSlug))
          : null
      if (stored) {
        setPhase('pending')
        setIntakeId(stored)
        void fetchStatus({ intakeId: stored }).then((result) => {
          if (result?.res.ok) {
            applyStatus(result.data, null)
          } else if (result) {
            resetForNewPayment(
              result.data.error ??
                'This payment intake is no longer active. Upload a new bank receipt to continue.'
            )
          }
        })
        return
      }

      setPhase('fresh')
    }

    void run()
  }, [resumeParam, formSlug, completeEmailResume, fetchStatus, applyStatus, resetForNewPayment])

  useEffect(() => {
    if (phase !== 'pending' || !intakeId) return
    const poll = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      void fetchStatus({ intakeId }).then((result) => {
        if (result?.res.ok) applyStatus(result.data, null)
      })
    }
    poll()
    const id = window.setInterval(poll, 30_000)
    return () => window.clearInterval(id)
  }, [phase, intakeId, fetchStatus, applyStatus])

  const submitIntake = async (fields: ApplicantGateFields, bankReceipt: File) => {
    setSubmittingIntake(true)
    setGateError(null)
    try {
      const body = new FormData()
      body.append('formSlug', formSlug)
      body.append('organizationName', fields.organizationName)
      body.append('email', fields.email)
      body.append('phone', fields.phone)
      body.append('contactPersonName', fields.contactPersonName)
      body.append('acknowledgements', JSON.stringify(acknowledgementsRef.current))
      body.append(`doc_${BANK_RECEIPT_SLOT_ID}`, bankReceipt)

      const res = await fetch(resolvedApiUrl('/api/public/online-forms/payment-intake'), {
        method: 'POST',
        body,
      })
      const data = (await res.json().catch(() => ({}))) as {
        intakeId?: string
        intakeReference?: string
        email?: string
        organisationName?: string
        error?: string
      }
      if (!res.ok) {
        const msg =
          data.error ??
          (res.status === 503
            ? 'The system is busy saving your receipt. Wait a few seconds and submit again.'
            : res.status === 401
              ? 'Could not submit payment (session blocked). Please try again or contact NWRMA.'
              : 'Could not submit payment details.')
        setGateError(msg)
        return
      }
      const id = data.intakeId ?? ''
      const submittedEmail = (data.email ?? fields.email).trim()
      const submittedOrg = (data.organisationName ?? fields.organizationName).trim()
      setIntakeId(id)
      setIntakeReference(data.intakeReference ?? '')
      setIntakeEmail(submittedEmail)
      setOrganisationName(submittedOrg)
      patchForm(
        applyApplicantGate(formSlug, formRef.current, {
          ...fields,
          email: submittedEmail,
          organizationName: submittedOrg,
        }) as Partial<T>
      )
      setPhase('pending')
      if (typeof sessionStorage !== 'undefined' && id) {
        sessionStorage.setItem(intakeStorageKey(formSlug), id)
      }
      setApplicantGateOpen(false)
      if (id) {
        void fetchStatus({ intakeId: id }).then((result) => {
          if (result?.res.ok) applyStatus(result.data, null)
        })
      }
    } catch {
      setGateError('Network error. Please try again.')
    } finally {
      setSubmittingIntake(false)
    }
  }

  const canAccessWizardSteps = phase === 'validated' && !!intakeId && !!resumeToken
  /** Organisation and email from verified payment intake — read-only on the application form. */
  const lockApplicantIdentity = canAccessWizardSteps
  const gateBusy = statusLoading || resumeActivating

  const showWizardStep = (currentStep: number, targetStep: number) =>
    !gateBusy &&
    phase !== 'pending' &&
    phase !== 'rejected' &&
    phase !== 'resume_ready' &&
    currentStep === targetStep &&
    (targetStep === 0 || canAccessWizardSteps)

  const showFormNav =
    !gateBusy && phase !== 'pending' && phase !== 'rejected' && phase !== 'resume_ready'

  return {
    showWizardStep,
    showFormNav,
    phase,
    intakeId,
    resumeToken,
    intakeReference,
    organisationName,
    intakeEmail,
    financeReceiptNumber,
    feeVerifiedDate,
    validationNote,
    gateError,
    submittingIntake,
    applicantGateOpen,
    setApplicantGateOpen,
    statusLoading: gateBusy,
    resumeActivating,
    canAccessWizardSteps,
    lockApplicantIdentity,
    cameFromPaymentResume,
    submitIntake,
    redeemResume,
    resetForNewPayment,
    applicantGateInitialValues: applicantGateInitialValues(formRef.current),
  }
}
