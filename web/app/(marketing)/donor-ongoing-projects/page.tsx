import { createProjectMetadata, ProjectListingPage } from '@/components/marketing/pages/ProjectListingPage'

export const metadata = createProjectMetadata('/donor-ongoing-projects')

export default function DonorOngoingProjectsPage() {
  return <ProjectListingPage route="/donor-ongoing-projects" />
}
