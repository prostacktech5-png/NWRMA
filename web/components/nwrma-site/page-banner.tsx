type PageBannerProps = {
  title: string
  /** Photo banner; omit when using `variant="online-forms"`. */
  image?: string
  /** Blue gradient hero matching live NWRMA Online Forms / Downloads pages. */
  variant?: 'default' | 'online-forms'
}

export function PageBanner({ title, image, variant = 'default' }: PageBannerProps) {
  if (variant === 'online-forms') {
    return (
      <section className="nwrma-page-banner nwrma-page-banner--online-forms" aria-label={title}>
        <span className="nwrma-page-banner__pattern" aria-hidden />
        <div className="nwrma-page-banner-inner nwrma-container px-4">
          <h1>{title}</h1>
        </div>
      </section>
    )
  }

  return (
    <section
      className="nwrma-page-banner"
      style={image ? { backgroundImage: `url(${image})` } : undefined}
      aria-label={title}
    >
      <span className="nwrma-page-banner-overlay" aria-hidden />
      <div className="nwrma-page-banner-inner nwrma-container px-4">
        <h1>{title}</h1>
      </div>
    </section>
  )
}
