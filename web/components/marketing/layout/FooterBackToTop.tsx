'use client'

export function FooterBackToTop() {
  return (
    <button
      type="button"
      className="footer__back-to-top"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <i className="fas fa-chevron-up" aria-hidden />
    </button>
  )
}
