import { createProjectMetadata, ProjectListingPage } from '@/components/marketing/pages/ProjectListingPage'

export const metadata = createProjectMetadata('/gosl-completed-projects')

export default function GoSlCompletedProjectsPage() {
  return <ProjectListingPage route="/gosl-completed-projects" />
}
