/** Starter data for Legal, Regulations & Outreach (compliance department) UI shells. */

export const LRO_MANDATE =
  'The Department of Legal, Regulations and Outreach is strategically established to be the arm that deals with all legal matters; interfaces with the public with respect to awareness raising on the mandate and activities of the agency, thereby ensuring the public’s compliance with the law that establishes the National Water Resources Management Agency (NWRMA). The department also ensures that the Agency does right by the public, stays in compliance with the law of the land, creates and maintains a credible public image that is easy to relate with, better placed to face crises, and adequately encourages the public to regularise its status with the Agency.'

export const LRO_KEY_TASKS = [
  {
    id: 'representation',
    title: 'Legal representation',
    description: 'Represent NWRMA in legal proceedings, appeals, and advisory matters.',
  },
  {
    id: 'byelaws',
    title: 'Development of byelaws',
    description: 'Draft, review, and maintain agency byelaws and subsidiary instruments.',
  },
  {
    id: 'corporate_communication',
    title: 'Corporate communication',
    description: 'Agency messaging, public image, awareness, and crisis communications.',
  },
  {
    id: 'compliance_planning',
    title: 'Compliance strategic planning and work execution',
    description: 'Plan and execute programmes that drive public compliance with NWRMA law.',
  },
] as const

export const LRO_UNITS = [
  {
    id: 'compliance',
    title: 'Compliance',
    description:
      'Strategic planning and execution to ensure public compliance with NWRMA law and encourage regularisation.',
    href: '/compliance/compliance-register',
  },
  {
    id: 'legal',
    title: 'Legal',
    description: 'Legal representation and development of byelaws for the Agency.',
    href: '/compliance/legal',
  },
  {
    id: 'communications',
    title: 'Communications',
    description:
      'Corporate communication, awareness raising, credible public image, and stakeholder engagement.',
    href: '/compliance/communications',
  },
] as const

export type ComplianceCaseStatus = 'open' | 'in_review' | 'resolved' | 'escalated'

export type ComplianceCase = {
  id: string
  reference: string
  entityName: string
  violationType: string
  workstream: string
  planYear: string
  status: ComplianceCaseStatus
  assignedOfficer: string
  dueDate: string
}

export type LegalMatterStatus = 'draft' | 'active' | 'archived'

export type LegalMatter = {
  id: string
  title: string
  matterType: 'byelaw' | 'representation' | 'advisory'
  status: LegalMatterStatus
  updatedAt: string
}

export type CommunicationsTheme = 'awareness' | 'image' | 'regularisation' | 'crisis'

export type OutreachCampaignStatus = 'planned' | 'active' | 'completed'

export type OutreachCampaign = {
  id: string
  title: string
  channel: string
  theme: CommunicationsTheme
  status: OutreachCampaignStatus
  startDate: string
}

export const COMPLIANCE_CASES: ComplianceCase[] = [
  {
    id: '1',
    reference: 'CMP-2026-0142',
    entityName: 'Freetown Water Services Ltd',
    violationType: 'Unlicensed abstraction',
    workstream: 'Enforcement & regularisation',
    planYear: '2026',
    status: 'in_review',
    assignedOfficer: 'A. Kamara',
    dueDate: '2026-06-01',
  },
  {
    id: '2',
    reference: 'CMP-2026-0138',
    entityName: 'Bo District Borehole Operator',
    violationType: 'Late licence renewal',
    workstream: 'Permit regularisation',
    planYear: '2026',
    status: 'open',
    assignedOfficer: 'S. Conteh',
    dueDate: '2026-05-25',
  },
  {
    id: '3',
    reference: 'CMP-2026-0129',
    entityName: 'Community Well Project',
    violationType: 'Monitoring non-compliance',
    workstream: 'Strategic compliance plan',
    planYear: '2026',
    status: 'escalated',
    assignedOfficer: 'M. Sesay',
    dueDate: '2026-05-20',
  },
]

export const LEGAL_MATTERS: LegalMatter[] = [
  {
    id: '1',
    title: 'Draft byelaw — groundwater protection zones',
    matterType: 'byelaw',
    status: 'draft',
    updatedAt: '2026-05-10',
  },
  {
    id: '2',
    title: 'Representation — licence appeal WR-884',
    matterType: 'representation',
    status: 'active',
    updatedAt: '2026-05-14',
  },
  {
    id: '3',
    title: 'Advisory — inter-agency MOU review',
    matterType: 'advisory',
    status: 'active',
    updatedAt: '2026-05-12',
  },
]

export const OUTREACH_CAMPAIGNS: OutreachCampaign[] = [
  {
    id: '1',
    title: 'National water law awareness week',
    channel: 'Radio & community meetings',
    theme: 'awareness',
    status: 'active',
    startDate: '2026-05-01',
  },
  {
    id: '2',
    title: 'Permit regularisation drive',
    channel: 'SMS & district offices',
    theme: 'regularisation',
    status: 'planned',
    startDate: '2026-06-15',
  },
  {
    id: '3',
    title: 'Agency brand refresh — stakeholder toolkit',
    channel: 'Web & print',
    theme: 'image',
    status: 'active',
    startDate: '2026-04-20',
  },
]

export const REGULATIONS_LIBRARY = [
  {
    id: '1',
    category: 'Acts',
    title: 'National Water Resources Management Act',
    summary: 'Establishing NWRMA and water resource governance framework.',
  },
  {
    id: '2',
    category: 'Regulations',
    title: 'Water use licensing regulations',
    summary: 'Licensing requirements for abstraction and borehole drilling.',
  },
  {
    id: '3',
    category: 'Policies',
    title: 'Public compliance and outreach policy',
    summary: 'Agency approach to awareness, enforcement, and stakeholder engagement.',
  },
]

export const complianceCaseStatusLabels: Record<ComplianceCaseStatus, string> = {
  open: 'Open',
  in_review: 'In review',
  resolved: 'Resolved',
  escalated: 'Escalated',
}

export const legalMatterTypeLabels: Record<LegalMatter['matterType'], string> = {
  byelaw: 'Byelaw development',
  representation: 'Legal representation',
  advisory: 'Advisory',
}

export type EnforcementStage =
  | 'none'
  | 'notice'
  | 'compliance_order'
  | 'admin_penalty'
  | 'prosecution'

export const enforcementStageLabels: Record<EnforcementStage, string> = {
  none: 'None',
  notice: 'Notice',
  compliance_order: 'Compliance order',
  admin_penalty: 'Administrative penalty',
  prosecution: 'Prosecution',
}

export const communicationsThemeLabels: Record<CommunicationsTheme, string> = {
  awareness: 'Public awareness',
  image: 'Agency image',
  regularisation: 'Regularisation',
  crisis: 'Crisis communications',
}

/** @deprecated Use OUTREACH_CAMPAIGNS — alias for backwards compatibility */
export const COMMUNICATIONS_CAMPAIGNS = OUTREACH_CAMPAIGNS
