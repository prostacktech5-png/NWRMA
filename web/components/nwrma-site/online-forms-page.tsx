import { OnlineFormCard } from '@/components/nwrma-site/online-forms/OnlineFormCard'
import { ImageWithFallback } from '@/components/marketing/ui/ImageWithFallback'
import { ONLINE_FORMS } from '@/lib/nwrma-site/online-forms/registry'
import '@/styles/nwrma-site/online-forms-cards.css'

export function OnlineFormsPage() {
  return (
    <section className="nwrma-online-forms-hub">
      <div className="nwrma-online-forms-hub__inner">
        <div className="nwrma-online-forms-grid">
          {ONLINE_FORMS.map((form) => (
            <OnlineFormCard key={form.slug} form={form} />
          ))}
        </div>
        <footer className="nwrma-online-forms-hub__brand">
          <ImageWithFallback
            localSrc="/assets/uploads/2020/10/2-2.png"
            alt=""
            width={56}
            height={56}
          />
          <span>National Water Resources Management Agency</span>
        </footer>
      </div>
    </section>
  )
}
