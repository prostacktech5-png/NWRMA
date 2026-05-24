import type { CanonicalDept } from '@/lib/orgDepartments'
import type { DeptStat } from '@/lib/orgDepartments'

/** Executive DG overview label — matches Approvals / Finance master data. */
export const DG_FISCAL_YEAR_DISPLAY = '2024/25'

export type DgOverviewCardId = 'operations' | 'hydrological' | 'laboratory' | 'it'

type GroupSpec = { id: DgOverviewCardId; title: string; members: CanonicalDept[] }

/**
 * Four executive-facing groups (2×2 grid) — Organisational Budget Overview layout:
 * Operations (finance + boreholes), Hydrological Services, Laboratory, IT (HR).
 */
const OVERVIEW_GROUPS: GroupSpec[] = [
  { id: 'operations', title: 'Operations', members: ['financial', 'boreholes'] },
  { id: 'hydrological', title: 'Hydrological Services', members: ['hydrological'] },
  { id: 'laboratory', title: 'Laboratory', members: ['hydrological'] },
  { id: 'it', title: 'Information Technology', members: ['hr'] },
]

export type DeptOverviewCard = DeptStat & { cardId: DgOverviewCardId }

export function mergeDeptStatsForExecutiveOverview(
  byCanonical: Array<DeptStat & { metaKey: CanonicalDept }>
): DeptOverviewCard[] {
  const map = new Map<CanonicalDept, DeptStat & { metaKey: CanonicalDept }>()
  for (const row of byCanonical) map.set(row.metaKey, row)

  return OVERVIEW_GROUPS.map((g) => {
    let allocated = 0
    let utilized = 0
    let requisitionsCount = 0
    let requisitionsTotal = 0
    let pendingCount = 0
    let pendingAmount = 0
    for (const m of g.members) {
      const r = map.get(m)
      if (!r) continue
      allocated += r.allocated
      utilized += r.utilized
      requisitionsCount += r.requisitionsCount
      requisitionsTotal += r.requisitionsTotal
      pendingCount += r.pendingCount
      pendingAmount += r.pendingAmount
    }
    const availableBalance = allocated - utilized
    const utilizationRate = allocated > 0 ? (utilized / allocated) * 100 : 0
    return {
      department: g.title,
      allocated,
      utilized,
      availableBalance,
      utilizationRate,
      requisitionsCount,
      requisitionsTotal,
      pendingCount,
      pendingAmount,
      cardId: g.id,
    }
  })
}

/** Executive cards with Finance programme allocation only (allocated > 0). */
export function filterFundedExecutiveCards(cards: DeptOverviewCard[]): DeptOverviewCard[] {
  return cards.filter((c) => c.allocated > 0)
}

/** Table labels — match DG Organisational Budget Overview mockup. */
export function dgTableDepartmentLabel(slug: string): string {
  const s = slug.trim().toLowerCase()
  if (s === 'financial' || s === 'boreholes') return 'Operations'
  if (s === 'hydrological') return 'Hydrological Services'
  if (s === 'water_quality' || s === 'waterquality') return 'Laboratory'
  if (s === 'hr') return 'Information Technology'
  return slug
}

const ROW_ORDER: Record<string, number> = {
  financial: 0,
  boreholes: 1,
  hydrological: 2,
  water_quality: 3,
  hr: 4,
}

export function compareBudgetLinesForDgTable(aSlug: string, bSlug: string): number {
  return (ROW_ORDER[aSlug] ?? 99) - (ROW_ORDER[bSlug] ?? 99)
}
