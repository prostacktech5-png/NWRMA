import type { Metadata } from 'next'
import { ProjectsHubPage } from '@/components/marketing/pages/ProjectsHubPage'

export const metadata: Metadata = { title: 'Projects' }

export default function ProjectsPage() {
  return <ProjectsHubPage />
}
