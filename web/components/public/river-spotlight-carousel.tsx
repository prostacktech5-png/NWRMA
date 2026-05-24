'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { SIERRA_LEONE_RIVERS } from '@/lib/sierra-leone-rivers'

const ROTATE_MS = 6000
const FADE_MS = 200

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}

type RiverSpotlightSectionProps = {
  children: ReactNode
}

export function RiverSpotlightSection({ children }: RiverSpotlightSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [textVisible, setTextVisible] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  const river = SIERRA_LEONE_RIVERS[currentIndex]

  const clearAutoRotate = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const clearFadeTimeout = useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current)
      fadeTimeoutRef.current = null
    }
  }, [])

  const advanceToNext = useCallback(() => {
    clearFadeTimeout()
    if (prefersReducedMotion) {
      setCurrentIndex((prev) => (prev + 1) % SIERRA_LEONE_RIVERS.length)
      return
    }
    setTextVisible(false)
    fadeTimeoutRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % SIERRA_LEONE_RIVERS.length)
      setTextVisible(true)
      fadeTimeoutRef.current = null
    }, FADE_MS)
  }, [clearFadeTimeout, prefersReducedMotion])

  const startAutoRotate = useCallback(() => {
    clearAutoRotate()
    if (prefersReducedMotion) return
    intervalRef.current = setInterval(advanceToNext, ROTATE_MS)
  }, [advanceToNext, clearAutoRotate, prefersReducedMotion])

  useEffect(() => {
    startAutoRotate()
    return () => {
      clearAutoRotate()
      clearFadeTimeout()
    }
  }, [startAutoRotate, clearAutoRotate, clearFadeTimeout])

  const selectRiver = (index: number) => {
    if (index === currentIndex) return
    clearFadeTimeout()
    setCurrentIndex(index)
    if (!prefersReducedMotion) {
      setTextVisible(false)
      fadeTimeoutRef.current = setTimeout(() => {
        setTextVisible(true)
        fadeTimeoutRef.current = null
      }, FADE_MS)
    }
    startAutoRotate()
  }

  return (
    <>
      <div className="absolute inset-0" aria-hidden>
        {SIERRA_LEONE_RIVERS.map((r, index) => (
          <Image
            key={r.id}
            src={r.imageUrl}
            alt={r.imageAlt}
            fill
            className={`object-cover transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-60' : 'opacity-0'
            }`}
            priority={index === 0}
            sizes="100vw"
          />
        ))}
        <div className="absolute inset-0 bg-[#2a3f4f]/50" />
      </div>

      <div className="relative z-10 flex min-h-[600px] flex-col items-center justify-center px-6 py-16 text-center">
        {children}

        <div className="mt-10 w-full max-w-2xl">
          <div className="rounded-lg border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <p className="mb-3 text-xs font-medium tracking-[0.3em] text-[#1EB53A]">
              SIERRA LEONE RIVER SPOTLIGHT
            </p>
            <div
              aria-live="polite"
              aria-atomic="true"
              className={`transition-opacity duration-300 ${
                textVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <p className="text-lg font-semibold text-white">{river.name}</p>
              <p className="mt-1 text-sm text-white/80">{river.description}</p>
              <p className="mt-2 text-xs text-white/60">{river.attribution}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            {SIERRA_LEONE_RIVERS.map((r, index) => (
              <button
                key={r.id}
                type="button"
                onClick={() => selectRiver(index)}
                className={`h-2 transition-all ${
                  index === currentIndex
                    ? 'w-6 rounded-full bg-white'
                    : 'w-2 rounded-full bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`View ${r.name}`}
                aria-current={index === currentIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
