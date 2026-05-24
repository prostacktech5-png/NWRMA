import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getMarketingPage } from '@/lib/marketing-site/pages'
import { parseProjectTableHtml } from '@/lib/marketing-site/parse-project-table'
import { ProjectsDataTable } from '@/components/marketing/pages/ProjectsDataTable'
import './project-page.css'

export function createProjectMetadata(route: string): Metadata {
  const page = getMarketingPage(route)
  return { title: page?.title ?? 'Projects' }
}

export function ProjectListingPage({ route }: { route: string }) {
  const page = getMarketingPage(route)
  if (!page) notFound()

  const table = parseProjectTableHtml(page.html)

  return (
    <section className="project-page">
      <div className="project-page__inner">
        <ProjectsDataTable
          bannerTitle={table.bannerTitle}
          columns={table.columns}
          rows={table.rows}
        />
      </div>
    </section>
  )
}
