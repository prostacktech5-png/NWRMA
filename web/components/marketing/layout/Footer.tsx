import { footerLinks, socialLinks } from '@/lib/marketing-site/navigation'
import { FooterBackToTop } from '@/components/marketing/layout/FooterBackToTop'

export function MarketingFooter() {
  return (
    <footer className="site-footer">
      <div className="footer__top">
        <div className="container">
          <div className="footer__grid">
            <div className="footer__col">
              <h5 className="footer__heading">
                <span className="accent">Useful</span> links
              </h5>
              <div className="footer__divider" />
              <ul className="footer__links">
                {footerLinks.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="footer__col">
              <h5 className="footer__heading">
                <span className="accent">Contact</span> Details
              </h5>
              <div className="footer__divider" />
              <div className="footer__contacts">
                <div className="footer__contact-item">
                  <i className="fas fa-map-marker-alt" aria-hidden />
                  <span>29 King Herman Road, Freetown.</span>
                </div>
                <div className="footer__contact-item">
                  <i className="fas fa-phone" aria-hidden />
                  <span>+232 30 775 898</span>
                </div>
                <div className="footer__contact-item">
                  <i className="fas fa-envelope" aria-hidden />
                  <a href="mailto:info@nwrma.gov.sl">info@nwrma.gov.sl</a>
                </div>
              </div>
            </div>
            <div className="footer__col">
              <h5 className="footer__heading">
                <span className="accent">Follow</span> Us
              </h5>
              <div className="footer__divider" />
              <div className="footer__socials">
                {socialLinks.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                  >
                    <i className={s.icon} aria-hidden />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="footer__bottom-area">
        <div className="footer__bottom">
          <div className="container">
            <p>© 2020 TM & © National Water Resources Management Agency- Sierra Leone</p>
          </div>
        </div>
        <FooterBackToTop />
      </div>
    </footer>
  )
}
