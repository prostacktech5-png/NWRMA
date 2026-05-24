'use client'

import { useState, type FormEvent } from 'react'
import './contact-page.css'

const MAP_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d16709.55304814489!2d-13.24388077083225!3d8.483088075422533!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xf04c3a448331d19%3A0x7bb1e271adc63ded!2sTower%20Hill%2C%20Freetown%2C%20Sierra%20Leone!5e1!3m2!1sen!2sus!4v1581593182020!5m2!1sen!2sus'

const CONTACT_ITEMS = [
  {
    icon: 'fas fa-map-marker-alt',
    label: 'Address',
    content: (
      <>
        The National Water Resources Management Agency, 29 King Herman Road, Freetown, Sierra Leone
      </>
    ),
  },
  {
    icon: 'fas fa-phone',
    label: 'Phone',
    content: (
      <>
        <a href="tel:+23275597184">+23275597184</a>
        {' / '}
        <a href="tel:+23230775898">+23230775898</a>
      </>
    ),
  },
  {
    icon: 'fas fa-fax',
    label: 'Fax',
    content: 'N/A',
  },
  {
    icon: 'far fa-envelope',
    label: 'Email',
    content: (
      <a href="mailto:info@nwrma.gov.sl" className="contact-page__email-link">
        info@nwrma.gov.sl
      </a>
    ),
  },
] as const

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const message = String(data.get('message') ?? '').trim()

    const subject = encodeURIComponent(`NWRMA website contact from ${name || 'visitor'}`)
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`,
    )
    window.location.href = `mailto:info@nwrma.gov.sl?subject=${subject}&body=${body}`
    setSubmitted(true)
    form.reset()
  }

  return (
    <section className="contact-page">
      <div className="contact-page__inner">
        <h1 className="contact-page__title">Contact</h1>

        <div className="contact-page__grid">
          <div className="contact-page__form-col">
            <p className="contact-page__intro">
              <strong>Thank you for your interest in the National Water Resources Management Agency.</strong>
              <br />
              To contact us please reach us via:
            </p>

            <form className="contact-page__form" onSubmit={handleSubmit} noValidate>
              <label className="contact-page__field">
                <span className="visually-hidden">Name</span>
                <input type="text" name="name" placeholder="Name" autoComplete="name" required />
              </label>
              <label className="contact-page__field">
                <span className="visually-hidden">Email</span>
                <input type="email" name="email" placeholder="Email" autoComplete="email" required />
              </label>
              <label className="contact-page__field">
                <span className="visually-hidden">Message</span>
                <textarea name="message" placeholder="Message" rows={6} required />
              </label>
              <button type="submit" className="contact-page__submit">
                Submit
              </button>
              {submitted && (
                <p className="contact-page__notice" role="status">
                  Your email app should open to send the message to NWRMA. If it did not open, email{' '}
                  <a href="mailto:info@nwrma.gov.sl">info@nwrma.gov.sl</a> directly.
                </p>
              )}
            </form>
          </div>

          <div className="contact-page__info-col">
            <ul className="contact-page__list">
              {CONTACT_ITEMS.map((item) => (
                <li key={item.label} className="contact-page__item">
                  <span className="contact-page__icon" aria-hidden>
                    <i className={item.icon} />
                  </span>
                  <span className="contact-page__item-text">{item.content}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="contact-page__map-wrap">
          <iframe
            title="NWRMA location — Tower Hill, Freetown, Sierra Leone"
            src={MAP_EMBED}
            className="contact-page__map"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  )
}
