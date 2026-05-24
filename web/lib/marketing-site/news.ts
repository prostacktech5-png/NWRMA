export interface NewsItem {
  title: string
  path: string
  date: string
  image?: string
  /** wp-content live URL first, then local /assets mirror */
  imageSources?: string[]
  excerpt?: string
  comments: number
}

export type WhatWeDoItem = {
  title: string
  image: string
  text: string
  /** Local-only URLs; skips wp-content fallback when set. */
  imageSources?: string[]
}

export const whatWeDo: WhatWeDoItem[] = [
  {
    title: 'REGULATION',
    image: '/assets/plugins/us-core/assets/images/placeholder.svg',
    imageSources: ['/assets/plugins/us-core/assets/images/placeholder.svg'],
    text: 'Water Resources Authority (NWRMA) sustainably and equitably allocates water resources among the various competing needs. NWRMA also requires that stakeholders are involved in the process. The "Water use Permit" is used to carry out this function.',
  },
  {
    title: 'PROTECTION',
    image: '/assets/uploads/2021/03/WRP.png',
    text: 'The National Water Resources Management Agency (NWRMA) also controls pollution and improves water quality in the country\'s water bodies. This involves regular water quality tests and integrating land use activities into NWRMA Water Quality Control programs.',
  },
  {
    title: 'PUBLIC INFORMATION',
    image: '/assets/uploads/2021/03/Download.png',
    text: 'The Agency collects all information on water resources, analyses, stores and disseminates it. This information is critical for water allocation, water resources investment decision making and modeling to enact scenarios to better understand the impact of climate change in future.',
  },
  {
    title: 'CLIMATE CHANGE ADAPTATION',
    image: '/assets/uploads/2021/03/CCA.png',
    text: 'The Authority undertakes climate actions in terms of mitigation and adaptation to minimizing the effects of global warming and climate change.',
  },
]

export const heroSlides = [
  {
    image: '/assets/uploads/2020/02/11.jpg',
    title: 'Welcome to The National Water Resources',
    subtitle: 'Management Agency (NWRMA)',
    description:
      'The agency that has the mandate to manage and safeguard water resources at local, national and transboundary in Sierra Leone.',
  },
  {
    image: '/assets/uploads/2020/02/Reservoir-lake-and-dam-dredging.jpg',
    description:
      'Sierra Leone is well-watered and is now utilising its water resources for economic and social benefits',
  },
  {
    image: '/assets/uploads/2020/02/River-No2-Village-Beach-Sierra-Leone.jpg',
  },
]
