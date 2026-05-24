import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation, EffectFade } from 'swiper/modules'
import { heroSlides } from '../../data/news'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/effect-fade'
import './HeroSlider.css'

const LIVE = 'https://nwrma.gov.sl/wp-content/uploads'

function slideBg(localPath: string) {
  const live = LIVE + localPath.replace('/assets/uploads', '')
  return `url(${localPath}), url(${live})`
}

export function HeroSlider() {
  return (
    <section className="hero">
      <Swiper
        modules={[Autoplay, Navigation, EffectFade]}
        effect="fade"
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        navigation
        loop
        className="hero__swiper"
      >
        {heroSlides.map((slide, i) => (
          <SwiperSlide key={i}>
            <div className="hero__slide" style={{ backgroundImage: slideBg(slide.image) }}>
              {(slide.title || slide.description) && (
                <div className="hero__content">
                  {slide.title && (
                    <h1 className="hero__title">
                      {slide.title}
                      {slide.subtitle && (
                        <>
                          <br />
                          <br />
                          {slide.subtitle}
                        </>
                      )}
                    </h1>
                  )}
                  {slide.description && <p className="hero__desc">{slide.description}</p>}
                </div>
              )}
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  )
}
