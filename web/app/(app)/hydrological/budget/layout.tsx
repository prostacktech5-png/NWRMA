import { HydrologicalBudgetSubnav } from '@/components/hydro/hydrological-budget-subnav'

export default function HydrologicalBudgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <HydrologicalBudgetSubnav />
      {children}
    </div>
  )
}
