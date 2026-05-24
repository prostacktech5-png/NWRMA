import type { CreateWaterTestingRequestInput } from '@/lib/db/water-testing-persistence'
import type { LabRequestPriority } from '@/lib/types'

/** Inbox for demo “request received” / workflow test emails. */
export const DEMO_WATER_TESTING_NOTIFY_EMAIL = 'jamesgobiophilip@gmail.com'

export type WaterTestingDemoSeedEntry = {
  label: string
  publicCaseId: string
  input: CreateWaterTestingRequestInput
}

export const WATER_TESTING_DEMO_PUBLIC_CASE_IDS = [
  'demo-wt-001',
  'demo-wt-002',
  'demo-wt-003',
  'demo-wt-004',
] as const

/** Stable demo intake rows for pipeline testing (recreated on each staff seed). */
export const WATER_TESTING_DEMO_SEEDS: WaterTestingDemoSeedEntry[] = [
  {
    label: 'Demo — hospital',
    publicCaseId: 'demo-wt-001',
    input: {
      requesterName: 'James Gobio Philip',
      requesterEmail: DEMO_WATER_TESTING_NOTIFY_EMAIL,
      requesterPhone: '+232 76 111100',
      organisation: 'Connaught Hospital',
      siteAddress: 'Connaught Hospital, Wilberforce Street, Freetown',
      testsRequested: ['pH', 'Turbidity', 'E. coli'],
      priority: 'urgent' satisfies LabRequestPriority,
      notes: 'Demo submission — ward water supply sampling point B.',
      publicCaseId: 'demo-wt-001',
    },
  },
  {
    label: 'Demo — private',
    publicCaseId: 'demo-wt-002',
    input: {
      requesterName: 'John Smith',
      requesterEmail: DEMO_WATER_TESTING_NOTIFY_EMAIL,
      requesterPhone: '+232 76 222200',
      organisation: 'Private residence',
      siteAddress: '45 Hill Station, Freetown',
      testsRequested: ['pH', 'Iron', 'Manganese'],
      priority: 'normal',
      notes: 'Demo submission — borehole at rear of property.',
      publicCaseId: 'demo-wt-002',
    },
  },
  {
    label: 'Demo — NGO',
    publicCaseId: 'demo-wt-003',
    input: {
      requesterName: 'Fatmata Bangura',
      requesterEmail: DEMO_WATER_TESTING_NOTIFY_EMAIL,
      requesterPhone: '+232 76 333300',
      organisation: 'UNICEF Sierra Leone',
      siteAddress: 'Multiple sites — Kono District (central collection point)',
      testsRequested: ['Full panel', 'Microbial'],
      priority: 'critical' satisfies LabRequestPriority,
      notes: 'Demo submission — emergency response monitoring.',
      publicCaseId: 'demo-wt-003',
    },
  },
  {
    label: 'Demo — company',
    publicCaseId: 'demo-wt-004',
    input: {
      requesterName: 'Mohamed Sesay',
      requesterEmail: DEMO_WATER_TESTING_NOTIFY_EMAIL,
      requesterPhone: '+232 76 444400',
      organisation: 'Sierra Minerals Ltd',
      siteAddress: 'Mine site water discharge point, Marampa',
      testsRequested: ['pH', 'Total dissolved solids'],
      priority: 'normal',
      notes: 'Demo submission — quarterly compliance sample.',
      publicCaseId: 'demo-wt-004',
    },
  },
]
