export type OnlineFormTheme = 'sky' | 'green' | 'amber' | 'teal'
export type OnlineFormIcon = 'drilling' | 'dam' | 'effluent' | 'water-right'

export type OnlineFormEntry = {
  slug: string
  title: string
  description: string
  pdfPath?: string
  theme: OnlineFormTheme
  icon: OnlineFormIcon
}

export const ONLINE_FORMS: OnlineFormEntry[] = [
  {
    slug: 'water-drilling-licence',
    title: 'Application for Water Drilling Licence',
    description:
      'Apply for a well drilling licence under the National Water Resources Management Agency Act No. 5 of 2017. Complete all sections and attach required documents.',
    pdfPath: '/nwrma-site/forms/water-drilling-licence.pdf',
    theme: 'sky',
    icon: 'drilling',
  },
  {
    slug: 'dam-safety',
    title: 'Dam Safety Application',
    description:
      'Apply for a Dam Safety / water use permit under the National Water Resources Management Agency Act No. 5 of 2017. Complete all sections and attach required documents.',
    pdfPath: '/nwrma-site/forms/dam-safety.pdf',
    theme: 'green',
    icon: 'dam',
  },
  {
    slug: 'effluent-discharge',
    title: 'Effluent Discharge Application',
    description:
      'Apply for an effluent discharge permit under the National Water Resources Management Agency Act No. 5 of 2017. Complete all sections and attach required documents.',
    pdfPath: '/nwrma-site/forms/effluent-discharge.pdf',
    theme: 'amber',
    icon: 'effluent',
  },
  {
    slug: 'water-right',
    title: 'Water Right Application',
    description:
      'Apply for a water right permit under the National Water Resources Management Agency Act No. 5 of 2017. Complete all sections and attach required documents.',
    pdfPath: '/nwrma-site/forms/water-right.pdf',
    theme: 'teal',
    icon: 'water-right',
  },
]

export function getOnlineForm(slug: string): OnlineFormEntry | undefined {
  return ONLINE_FORMS.find((f) => f.slug === slug)
}

export function getOnlineFormSlugs(): string[] {
  return ONLINE_FORMS.map((f) => f.slug)
}
