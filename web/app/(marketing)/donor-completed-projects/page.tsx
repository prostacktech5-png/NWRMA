import { createProjectMetadata, ProjectListingPage } from '@/components/marketing/pages/ProjectListingPage'

export const metadata = createProjectMetadata('/donor-completed-projects')

export default function DonorCompletedProjectsPage() {
  return <ProjectListingPage route="/donor-completed-projects" />
}
