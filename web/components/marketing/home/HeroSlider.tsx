'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { heroSlides } from '@/lib/marketing-site/news'
import './HeroSlider.css'

const LIVE = 'https://nwrma.gov.sl/wp-content/uploads'
const SLICE_COUNT = 12
const SLICE_DURATION_MS = 650
const SLICE_STAGGER_MS = 55
const AUTOPLAY_MS = 5000

const TRANSITION_TOTAL_MS = SLICE_DURATION_MS + (SLICE_COUNT - 1) * SLICE_STAGGER_MS

function slideBg(localPath: string) {
  const live = LIVE + localPath.replace('/assets/uploads', '')
  return `url(${localPath}), url(${live})`
}

function slicePanelStyle(image: string, index: number): CSSProperties {
  return {
    width: `${SLICE_COUNT * 100}%`,
    marginLeft: `${-index * 100}%`,
    backgroundImage: slideBg(image),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
}

type Slide = (typeof heroSlides)[number]

export type HeroFixedCaption = {
  title: string
  subtitle: string
  tagline: string
}

function SlideContent({ slide }: { slide: Slide }) {
  if (!slide.title && !slide.description) return null
  return (
    <div className="hero__content">
      {slide.title && (
        <h1 className="hero__title">
          {slide.title}
          {slide.subtitle && (
            <>
              <br />
              {slide.subtitle}
            </>
          )}
        </h1>
      )}
      {slide.description && <p className="hero__desc">{slide.description}</p>}
    </div>
  )
}

function FixedCaptionContent({ caption }: { caption: HeroFixedCaption }) {
  return (
    <div className="hero__content">
      <h1 className="hero__title hero__title--stacked">
        {caption.title}
        <br />
        {caption.subtitle}
        <br />
        {caption.tagline}
      </h1>
    </div>
  )
}

type HeroSliderProps = {
  /** Same images rotate; caption text stays fixed (e.g. Online Forms). */
  fixedCaption?: HeroFixedCaption
}

export function HeroSlider({ fixedCaption }: HeroSliderProps = {}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null)
  const [runAnimation, setRunAnimation] = useState(false)
  const [showIncomingText, setShowIncomingText] = useState(false)
  const animatingRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefersReducedMotion = useRef(false)

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current)
    }
  }, [])

  const finishTransition = useCallback((target: number) => {
    setActiveIndex(target)
    setIncomingIndex(null)
    setRunAnimation(false)
    setShowIncomingText(false)
    animatingRef.current = false
  }, [])

  const goTo = useCallback(
    (target: number) => {
      const count = heroSlides.length
      const next = ((target % count) + count) % count
      if (animatingRef.current || next === activeIndex) return

      if (prefersReducedMotion.current) {
        setActiveIndex(next)
        return
      }

      animatingRef.current = true
      setIncomingIndex(next)
      setRunAnimation(false)
      setShowIncomingText(false)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => setRunAnimation(true))
      })

      if (textTimeoutRef.current) clearTimeout(textTimeoutRef.current)
      textTimeoutRef.current = setTimeout(
        () => setShowIncomingText(true),
        Math.round(TRANSITION_TOTAL_MS * 0.55),
      )

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => finishTransition(next), TRANSITION_TOTAL_MS + 50)
    },
    [activeIndex, finishTransition],
  )

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!animatingRef.current) goTo(activeIndex + 1)
    }, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [activeIndex, goTo])

  const active = heroSlides[activeIndex]
  const incoming = incomingIndex !== null ? heroSlides[incomingIndex] : null

  return (
    <section className="hero" aria-label={fixedCaption ? 'Online forms banner' : 'Featured images'}>
      <div className="hero__stage">
        <div
          className={`hero__slices ${runAnimation ? 'hero__slices--animate' : ''}`}
          style={{ '--slice-count': SLICE_COUNT } as CSSProperties}
        >
          {Array.from({ length: SLICE_COUNT }, (_, i) => (
            <div
              key={i}
              className="hero__slice"
              style={{ '--slice-delay': `${i * SLICE_STAGGER_MS}ms` } as CSSProperties}
            >
              <div className="hero__slice-3d">
                {incoming && (
                  <div
                    className="hero__slice-panel hero__slice-panel--in"
                    style={slicePanelStyle(incoming.image, i)}
                    aria-hidden={!runAnimation}
                  />
                )}
                <div
                  className="hero__slice-panel hero__slice-panel--out"
                  style={slicePanelStyle(active.image, i)}
                  aria-hidden={runAnimation}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="hero__overlay" aria-hidden />

        <div
          className={`hero__content-wrap ${!fixedCaption && runAnimation ? 'hero__content-wrap--fading' : ''}`}
        >
          {fixedCaption ? (
            <FixedCaptionContent caption={fixedCaption} />
          ) : (
            <SlideContent slide={showIncomingText && incoming ? incoming : active} />
          )}
        </div>

        <button
          type="button"
          className="hero__nav hero__nav--prev"
          aria-label="Previous slide"
          onClick={() => goTo(activeIndex - 1)}
        >
          <i className="fas fa-chevron-left" />
        </button>
        <button
          type="button"
          className="hero__nav hero__nav--next"
          aria-label="Next slide"
          onClick={() => goTo(activeIndex + 1)}
        >
          <i className="fas fa-chevron-right" />
        </button>
      </div>
    </section>
  )
}
