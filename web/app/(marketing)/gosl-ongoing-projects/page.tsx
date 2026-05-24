import { createProjectMetadata, ProjectListingPage } from '@/components/marketing/pages/ProjectListingPage'

export const metadata = createProjectMetadata('/gosl-ongoing-projects')

export default function GoSlOngoingProjectsPage() {
  return <ProjectListingPage route="/gosl-ongoing-projects" />
}
