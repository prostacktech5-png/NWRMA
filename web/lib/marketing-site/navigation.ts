export interface NavItem {
  label: string
  path?: string
  href?: string
  external?: boolean
  children?: NavItem[]
}

export const topBarLinks: NavItem[] = [
  { label: '+232 30 775898', href: 'tel:+23230775898' },
  { label: 'info@nwrma.gov.sl', href: 'mailto:info@nwrma.gov.sl' },
  { label: 'Webmail', href: 'https://premium53.web-hosting.com:2096/', external: true },
  {
    label: 'Outlook',
    href: 'https://outlook.live.com/mail/0/?prompt=select_account&culture=en-us&country=us',
    external: true,
  },
]

export const topNavLinks: NavItem[] = [
  { label: 'Get Involved', path: '/get-involved' },
  { label: 'Links', path: '/links' },
]

export const mainNav: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  {
    label: 'Departments',
    path: '/departments',
    children: [
      { label: 'Hydrological Services', path: '/hydrological-services-department' },
      { label: 'Planning, Research and Operations', path: '/policy-research-and-operations-department' },
      { label: 'Legal, Regulations and Outreach', path: '/legal-regulations-and-outreach-department' },
      { label: 'Administration and Human Resources', path: '/administration-and-human-resources-department' },
      { label: 'Finance', path: '/finance-department' },
    ],
  },
  {
    label: 'Projects',
    path: '/projects',
    children: [
      {
        label: 'GoSL Funded Projects',
        children: [
          { label: 'GoSL Completed Projects', path: '/gosl-completed-projects' },
          { label: 'GoSL Ongoing Projects', path: '/gosl-ongoing-projects' },
          { label: 'GoSL Pipeline Projects', path: '/gosl-pipeline-projects' },
        ],
      },
      {
        label: 'Donor Funded Projects',
        children: [
          { label: 'Donor Completed Projects', path: '/donor-completed-projects' },
          { label: 'Donor Pipeline Projects', path: '/donor-pipeline-projects' },
          { label: 'Donor Ongoing Projects', path: '/donor-ongoing-projects' },
        ],
      },
      { label: 'Project Procurement', path: '/projectprocurement' },
    ],
  },
  {
    label: 'Publications',
    path: '/publications',
    children: [
      { label: 'Plans', path: '/acts-policies-2' },
      { label: 'Reports', path: '/publications/reports' },
      { label: 'Procurement', path: '/procurement' },
      { label: 'Agreements', path: '/publications/agreements' },
      { label: 'Public Notice', path: '/publications/public-notice' },
    ],
  },
  {
    label: 'Legislation',
    path: '/legislation',
    children: [
      { label: 'Background to Legislation', path: '/legislation' },
      { label: 'Acts, Regulations & Policies', path: '/acts-policies' },
    ],
  },
  {
    label: 'Data',
    path: '/data',
    children: [
      { label: 'Rainfall', path: '/data/rainfall' },
      { label: 'Ground Water', path: '/data/ground-water' },
      { label: 'Surface Water', path: '/data/surface-water' },
      { label: 'Maps', path: '/maps' },
    ],
  },
  { label: 'News', path: '/news' },
  { label: 'Downloads', path: '/downloads' },
  { label: 'Online Forms', path: '/online-forms' },
  {
    label: 'Contact',
    path: '/contact',
    children: [{ label: 'Vacancies', path: '/vacancies' }],
  },
  { label: 'Staff Login', path: '/login' },
]

export const footerLinks: NavItem[] = [
  { label: 'WASH Learning', href: 'http://www.washlearningsl.org/', external: true },
  { label: 'Ministry of Water Resources', href: 'http://mwr.gov.sl/', external: true },
  {
    label: 'Sierra Leone Ground Water Resources Database',
    href: 'http://www.salgrid.org/',
    external: true,
  },
]

export const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/NationalWaterResourcesManagementAgency', icon: 'fab fa-facebook-f' },
  { label: 'Twitter', href: 'https://twitter.com/LeoneNwrma', icon: 'fab fa-twitter' },
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UCPx0ynu5_kzVpQGSSfsz0NQ', icon: 'fab fa-youtube' },
]
