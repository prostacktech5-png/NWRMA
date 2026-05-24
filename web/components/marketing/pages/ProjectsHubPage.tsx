import Link from 'next/link'
import './project-page.css'

const SECTIONS = [
  {
    title: 'GoSL Funded Projects',
    links: [
      { label: 'GoSL Completed Projects', href: '/gosl-completed-projects' },
      { label: 'GoSL Ongoing Projects', href: '/gosl-ongoing-projects' },
      { label: 'GoSL Pipeline Projects', href: '/gosl-pipeline-projects' },
    ],
  },
  {
    title: 'Donor Funded Projects',
    links: [
      { label: 'Donor Completed Projects', href: '/donor-completed-projects' },
      { label: 'Donor Pipeline Projects', href: '/donor-pipeline-projects' },
      { label: 'Donor Ongoing Projects', href: '/donor-ongoing-projects' },
    ],
  },
  {
    title: 'Procurement',
    links: [{ label: 'Project Procurement', href: '/projectprocurement' }],
  },
] as const

export function ProjectsHubPage() {
  return (
    <section className="project-page">
      <div className="project-page__inner">
        <h1 className="project-page__title">Projects</h1>
        <div className="project-page__hub">
          {SECTIONS.map((section) => (
            <div key={section.title} className="project-page__hub-section">
              <h2 className="project-page__hub-heading">{section.title}</h2>
              <ul className="project-page__hub-list">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
