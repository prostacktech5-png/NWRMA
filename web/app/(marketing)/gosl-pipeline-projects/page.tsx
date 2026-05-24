import { createProjectMetadata, ProjectListingPage } from '@/components/marketing/pages/ProjectListingPage'

export const metadata = createProjectMetadata('/gosl-pipeline-projects')

export default function GoSlPipelineProjectsPage() {
  return <ProjectListingPage route="/gosl-pipeline-projects" />
}
