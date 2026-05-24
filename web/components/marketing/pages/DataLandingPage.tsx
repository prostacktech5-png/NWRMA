import Link from 'next/link'
import { ImageWithFallback } from '@/components/marketing/ui/ImageWithFallback'
import './data-landing.css'

const UPLOADS = '/assets/uploads/2020/02'

const DATA_CATEGORIES = [
  {
    label: 'Rainfall',
    href: '/data/rainfall',
    image: `${UPLOADS}/Screenshot_2020-02-11-bf9204_8151bdc538504df090ed282003bb11dc-webp-WEBP-Image-173-×-230-pixels.png`,
  },
  {
    label: 'Groundwater',
    href: '/data/ground-water',
    image: `${UPLOADS}/Screenshot_2020-02-11-bf9204_b679b57fb41c44e5881f160759029636-webp-WEBP-Image-173-×-230-pixels.png`,
  },
  {
    label: 'Surface Water',
    href: '/data/surface-water',
    image: `${UPLOADS}/Screenshot_2020-02-11-bf9204_0838642d37ff4216b0e61e27b3758e83-webp-WEBP-Image-173-×-230-pixels.png`,
  },
] as const

export function DataLandingPage() {
  return (
    <section className="data-landing">
      <div className="data-landing__inner">
        <h1 className="data-landing__title">Data</h1>

        <div className="data-landing__prose">
          <p>
            Hydrometric data has been collected by different organisations and through different initiatives
            at different times. Rainfall and other meteorological data has been the responsiblity of the Sierra
            Leone Meteorological Department, and rainfall records exist back to at least 1921. River flow data
            has been collected through the United Nations Development Programme and the World Health
            Organisation Onchocerciasis Control Project working with the Government of Sierra Leone. Most data
            collection ceased during the war and has only recommenced since about 2010. There has never been any
            systematic groundwater monitoring in Sierra Leone.
          </p>
          <p>
            In 2012 the Sierra Leone Water Security Project commenced, with support from the UK government
            Department for International Development and consultants Adam Smith International. The project was
            implemented by the Ministry of Water Resources and the Bumbuna Watershed Management Authority. This
            project initiated groundwater level data collection, community level rainfall monitoring and a
            limited amount of spring and stream flow gaging. The project also worked closely with organisations
            including commercial entities, NGOs and District Councils. The geographic focus of the project was
            the Rokel-Seli river basin.
          </p>
          <p>
            Metadata can be found in the three files{' '}
            <a
              href="https://fb615793-e8b4-4c13-9093-8c3cb093f037.filesusr.com/ugd/bf9204_256a8aade19349beb45c753f9832f4fb.xlsx?dn=Register%20-%20Sites.xlsx"
              target="_blank"
              rel="noopener noreferrer"
            >
              <strong>Monitoring Site Register</strong>
            </a>{' '}
            (which holds a brief summary of each monitoring site&apos;s location and ownership);{' '}
            <a
              href="https://fb615793-e8b4-4c13-9093-8c3cb093f037.filesusr.com/ugd/bf9204_f2eb1cdb25494a5cae9de366f4661ab3.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <strong>Project Site Details</strong>
            </a>{' '}
            (which holds detailed information on each of the monitoring sites established by the Water Security
            Project); and{' '}
            <a
              href="https://fb615793-e8b4-4c13-9093-8c3cb093f037.filesusr.com/ugd/bf9204_756edd6c61d04eba934a25c1e31bce18.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <strong>Shared Site Details</strong>
            </a>{' '}
            (which holds detailed information on sites managed by organisations which have shared their data with
            the Water Security Project).
          </p>
          <p>
            We hope that by sharing data in this way others will be encouraged to contact us with a view to
            uploading their data onto this website. In this way, greater knowledge of Sierra Leone&apos;s water
            resources will lead to improved management and enhanced water security.
          </p>
        </div>

        <div className="data-landing__cards-band">
          <div className="data-landing__cards">
            {DATA_CATEGORIES.map((item) => (
              <article key={item.href} className="data-landing__card">
                <Link href={item.href} className="data-landing__card-link">
                  <span className="data-landing__card-img-wrap">
                    <ImageWithFallback
                      localSrc={item.image}
                      alt=""
                      width={173}
                      height={230}
                      className="data-landing__card-img"
                    />
                  </span>
                  <span className="data-landing__card-title">{item.label}</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
