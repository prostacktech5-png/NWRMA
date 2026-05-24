import Link from 'next/link'
import { HeroSlider } from '@/components/marketing/home/HeroSlider'
import { NewsCard } from '@/components/marketing/home/NewsCard'
import { ImageWithFallback } from '@/components/marketing/ui/ImageWithFallback'
import { buildNewsImageCandidates } from '@/lib/marketing-news-images'
import { getHomeNews } from '@/lib/marketing-site/home-news'
import { whatWeDo } from '@/lib/marketing-site/news'
import './Home.css'

export async function MarketingHome() {
  const homeNews = await getHomeNews()
  return (
    <>
      <div className="home-hero-full">
        <HeroSlider />
      </div>

      <section className="section section--about" id="about">
        <div className="shape-triangle" />
        <div className="container">
          <h4 className="text-center">
            <strong>National Water Resources Management Agency</strong> – Sierra Leone
          </h4>
          <h5 className="text-center">
            <strong>Little</strong> About Us
          </h5>
          <div className="separator" />
          <ImageWithFallback localSrc="/assets/uploads/2020/02/nw.png" alt="NWRMA" className="about-logo" width={550} height={130} />
          <p className="text-center about-text">
            The National Water Resources Management Agency (NWRMA) was established by an Act of parliament in 2017, to
            protect, manage and regulate surface and ground water resources in Sierra Leone with an overall vision of
            becoming one of the leading water resources management Agencies in West Africa. The Agency is responsible
            for granting of water rights, water resources allotment among competing users, formulation of regulatory
            measures, information/data collection and sharing on water resources, with a view also to controlling
            pollution. Trans-boundary water resource issues also fall under the mandate of the Agency.
          </p>
          <p className="text-center about-text">
            As the country&apos;s only water resources management entity, raising public awareness is key for its
            operation as this will serve as a platform to interface with raw water users and key stakeholders in the
            management of water resources in Sierra Leone.
          </p>
          <p className="text-center">
            <Link href="/about" className="btn btn--white">
              Read More
            </Link>
          </p>
        </div>
      </section>

      <section className="section section--gray">
        <div className="container">
          <h2 className="text-center fancy-heading">
            <span className="sub-head">What We Do</span>
          </h2>
          <div className="separator" />
          <div className="grid grid--4 what-we-do">
            {whatWeDo.map((item) => (
              <div key={item.title} className="what-we-do__item">
                <div className="what-we-do__icon">
                  {item.image ? (
                    <ImageWithFallback
                      localSrc={item.image}
                      sources={item.imageSources ?? buildNewsImageCandidates(item.image)}
                      alt={item.title}
                      width={225}
                      height={225}
                    />
                  ) : (
                    <div className="what-we-do__placeholder" aria-hidden />
                  )}
                </div>
                <h6 className="text-center">
                  <strong>{item.title}</strong>
                </h6>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--resources">
        <div className="section--resources__bg" />
        <div className="section--resources__overlay" />
        <div className="shape-wave" />
        <div className="container section--resources__content">
          <h5 className="text-center">
            <strong>Online</strong> Resources
          </h5>
          <p className="text-center">
            The National Water Resources Management Agency website contains an increasing number of resources that we
            are making widely available on the site. At present we have a wide range of data, national and river basin
            specific maps and publications.
          </p>
          <div className="grid grid--3 resources-grid">
            <Link href="/data" className="resource-link">
              <i className="fas fa-sliders-h resource-icon" />
              <h5>
                <strong>Data</strong>
              </h5>
            </Link>
            <Link href="/maps" className="resource-link">
              <i className="fas fa-map-marker-alt resource-icon" />
              <h5>
                <strong>Maps</strong>
              </h5>
            </Link>
            <Link href="/publications" className="resource-link">
              <i className="fas fa-book resource-icon" />
              <h5>
                <strong>Publications</strong>
              </h5>
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--news">
        <div className="section--news__bg" />
        <div className="section--news__overlay" />
        <div className="container">
          <h2 className="text-center fancy-heading">NWRMA NEWS</h2>
          <div className="separator separator--thick" />
          <h4 className="text-center">
            <span className="sub-head">
              <strong>Latest</strong> Updates!
            </span>
          </h4>
          <div className="grid grid--4 news-grid">
            {homeNews.map((item) => (
              <NewsCard key={item.path} item={item} />
            ))}
          </div>
          <p className="text-center" style={{ marginTop: '2rem' }}>
            <Link href="/news" className="btn btn--gradient">
              More News
            </Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="separator separator--thick" style={{ maxWidth: '100%' }} />
        </div>
      </section>
    </>
  )
}
