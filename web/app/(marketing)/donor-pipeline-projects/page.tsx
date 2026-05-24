import { createProjectMetadata, ProjectListingPage } from '@/components/marketing/pages/ProjectListingPage'

export const metadata = createProjectMetadata('/donor-pipeline-projects')

export default function DonorPipelineProjectsPage() {
  return <ProjectListingPage route="/donor-pipeline-projects" />
}
