import Link from 'next/link'
import type { OnlineFormEntry } from '@/lib/nwrma-site/online-forms/registry'
import { FormIcon } from '@/components/nwrma-site/online-forms/FormIcon'

export function OnlineFormCard({ form }: { form: OnlineFormEntry }) {
  return (
    <article className={`nwrma-form-card nwrma-form-card--${form.theme}`}>
      <div className="nwrma-form-card__tab" aria-hidden>
        <FormIcon name={form.icon} />
      </div>
      <div className="nwrma-form-card__body">
        <h3 className="nwrma-form-card__title">{form.title}</h3>
        <p className="nwrma-form-card__desc">{form.description}</p>
        <Link href={`/online-forms/${form.slug}`} className="nwrma-form-card__cta">
          Start application
        </Link>
      </div>
    </article>
  )
}
