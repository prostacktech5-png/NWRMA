import { footerLinks, socialLinks } from '../../data/navigation'

export function Footer() {
  return (
    <footer>
      <div className="footer__top">
        <div className="container">
          <div className="footer__grid">
            <div>
              <h5>
                <span className="accent">Useful</span> links
              </h5>
              <div className="separator" />
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
            <div>
              <h5>
                <span className="accent">Contact</span> Details
              </h5>
              <div className="separator" />
              <div className="footer__contacts">
                <div className="item">29 King Herman Road, Freetown.</div>
                <div className="item">+232 30 775 898</div>
                <div className="item">
                  <a href="mailto:info@nwrma.gov.sl">info@nwrma.gov.sl</a>
                </div>
              </div>
            </div>
            <div>
              <h5>
                <span className="accent">Follow</span> Us
              </h5>
              <div className="separator" />
              <div className="footer__socials">
                {socialLinks.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                    <i className={s.icon} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">
          <p>© 2020 TM & © National Water Resources Management Agency- Sierra Leone</p>
        </div>
      </div>
    </footer>
  )
}
