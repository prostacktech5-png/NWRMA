import type { ErpReferencePayload } from '@/lib/erp-reference-types'

/** Empty until loaded from Supabase (`erp_reference_snapshot`) or filled by user actions. */
export function createDefaultErpReferencePayload(): ErpReferencePayload {
  return {
    fiscalYears: [],
    programmeBudgetLines: [],
    requisitions: [],
    requisitionEvents: [],
    monitoringStations: [],
    floodIncidents: [],
    drillingCompanies: [],
    boreholes: [],
    licenseApplications: [],
    damSafetyApplications: [],
    effluentDischargeApplications: [],
    waterRightApplications: [],
    onlineFormPaymentIntakes: [],
    labRequests: [],
    employees: [],
    notifications: [],
    waterLevelReadings: [],
  }
}
