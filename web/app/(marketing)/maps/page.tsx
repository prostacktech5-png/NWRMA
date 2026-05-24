import { createDataMetadata, DataPage } from '@/components/marketing/pages/DataPage'
import { DATA_MAPS_ROUTE } from '@/lib/marketing-site/data-routes'

export const metadata = createDataMetadata(DATA_MAPS_ROUTE)

export default function MapsPage() {
  return <DataPage route={DATA_MAPS_ROUTE} />
}
