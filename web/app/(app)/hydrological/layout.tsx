import { HydrologicalAccessGate } from '@/components/hydro/hydrological-access-gate'

export default function HydrologicalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <HydrologicalAccessGate>
      <div className="space-y-6">{children}</div>
    </HydrologicalAccessGate>
  )
}
