import { createProjectMetadata, ProjectListingPage } from '@/components/marketing/pages/ProjectListingPage'

export const metadata = createProjectMetadata('/projectprocurement')

export default function ProjectProcurementPage() {
  return <ProjectListingPage route="/projectprocurement" />
}
