import { MarketingHeader } from '@/components/marketing/layout/Header'
import { MarketingFooter } from '@/components/marketing/layout/Footer'
import { HeroSlider } from '@/components/marketing/home/HeroSlider'
import '@fortawesome/fontawesome-free/css/all.min.css'
import '@/styles/marketing/tokens.css'
import '@/styles/marketing/header.css'
import '@/styles/marketing/footer.css'
import '../nwrma-site.css'

export default function OnlineFormsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingHeader />
      <div className="canvas main-offset">
        <div className="nwrma-site nwrma-wp-integrated nwrma-app-content">
          <HeroSlider
            fixedCaption={{
              title: 'WELCOME TO THE NATIONAL WATER RESOURCES',
              subtitle: 'MANAGEMENT AGENCY (NWRMA)',
              tagline: 'ONLINE FORMS',
            }}
          />
          {children}
        </div>
        <MarketingFooter />
      </div>
    </>
  )
}
