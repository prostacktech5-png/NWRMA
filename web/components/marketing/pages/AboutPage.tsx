import { ImageWithFallback } from '@/components/marketing/ui/ImageWithFallback'
import './about-page.css'

const RIVER_IMAGE = '/assets/uploads/2020/02/about.jpg'
const FIELD_IMAGE = '/assets/uploads/2021/03/About.jpeg'

export function AboutPage() {
  return (
    <section className="about-page">
      <div className="about-page__inner">
        <h1 className="about-page__title">About</h1>

        <p className="about-page__intro">
          Sierra Leone is well-watered and is now utilising its water resources for economic and social
          benefits. However the perceived abundance of Sierra Leone water resources should not give cause
          for complacency.
        </p>

        <div className="about-page__grid">
          <div className="about-page__col">
            <p>
              Sierra Leone has abundant water resources. However, the demand on these resources is growing
              rapidly due to increasing pressures from hydroelectric power generation, growing population,
              water supply to urban, small and large towns, mining, industrialization and irrigation
              activities. The destruction of critical watersheds and water catchment areas by various human
              activities and changing climatic conditions have resulted to water scarcity leading to the
              drying up of many streams and resulting in the decline of the groundwater aquifers. No one
              knows with absolute certainty how much water is available for the nation&apos;s future growth
              and prosperity. With a growing population, expanding industry (particularly mining and
              commercial agriculture) and poor levels of water supply coverage, it is important that water
              resources are monitored and managed robustly; and effective regulation is introduced
            </p>

            <figure className="about-page__figure">
              <ImageWithFallback
                localSrc={RIVER_IMAGE}
                alt="River and forest landscape in Sierra Leone"
                width={1275}
                height={588}
                className="about-page__img"
              />
            </figure>

            <p>
              One of the findings of the 2010 National Water and Sanitation Policy was that though Sierra
              Leone is blessed with abundant water resources, very little has been done to manage it. That is
              because the responsibility was being executed by state owned water utility companies, who were
              burdened with water supply. The policy therefore recommended that an entity solely responsible
              for the management of the country&apos;s water resources be established, thus the National Water
              Resources Management Agency. The National Water Resources Management Agency (NWRMA) has the
              mandate to manage and safeguard water resources at local, national and transboundary in Sierra
              Leone. The Ministry is also responsible for supporting the establishment of a regulator termed
              the National Water Resources Management Agency.
            </p>
          </div>

          <div className="about-page__col">
            <p>
              Sierra Leone&apos;s water resources monitoring infrastructure was largely destroyed during the
              decade long Civil War (1991 – 2002). Our activity is targeted at building experience and
              expertise in water resources management and managing water locally to solve real water-related
              problems and issues. We are leading and coordinating the (re) establishment of hydrological
              monitoring activities. We do this by working with multiple and diverse organisations who have
              an interest in hydrological data. We recognise the value of community-based water resources
              management, with communities and schools actively engaging in collecting hydrological data. We
              use data to inform our decision-making for both planning purposes and for enforcing national
              regulations.
            </p>

            <figure className="about-page__figure">
              <ImageWithFallback
                localSrc={FIELD_IMAGE}
                alt="Community member collecting water in Sierra Leone"
                width={996}
                height={647}
                className="about-page__img"
              />
            </figure>

            <p>
              Our purpose is to support the sustainable management of water resources. We also contribute to
              safeguarding domestic water supplies and work with industry to help them understand their
              environmental responsibilities. Our aim is to monitor, understand and report on the state of water
              resources, promote the importance of managing water resources, enforce water resources law and
              support the delivery of effective regulation. To that end we focus on the areas where we believe
              we can have the greatest impact. It is mandated with broad functions to regulate, utilize,
              protect, develop, conserve, control and manage ground and surface water resources throughout
              Sierra Leone. The Agency started operations in February 2019, underscoring the government of Sierra
              Leone&apos;s unflinching commitment in actualizing the National Water Resources Management
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
