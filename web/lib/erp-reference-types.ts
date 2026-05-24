import type {
  Borehole,
  BoreholeLicenseApplication,
  DamSafetyApplication,
  EffluentDischargeApplication,
  OnlineFormPaymentIntake,
  WaterRightApplication,
  DrillingCompany,
  Employee,
  FiscalYear,
  FloodIncident,
  LabRequest,
  MonitoringStation,
  Notification,
  ProgrammeBudgetLine,
  Requisition,
  RequisitionEvent,
  WaterLevelReading,
} from '@/lib/types'

/** Canonical ERP reference payload stored in `erp_reference_snapshot.payload` (Supabase JSONB). */
export type ErpReferencePayload = {
  fiscalYears: FiscalYear[]
  programmeBudgetLines: ProgrammeBudgetLine[]
  requisitions: Requisition[]
  requisitionEvents: RequisitionEvent[]
  monitoringStations: MonitoringStation[]
  floodIncidents: FloodIncident[]
  drillingCompanies: DrillingCompany[]
  boreholes: Borehole[]
  licenseApplications: BoreholeLicenseApplication[]
  damSafetyApplications: DamSafetyApplication[]
  effluentDischargeApplications: EffluentDischargeApplication[]
  waterRightApplications: WaterRightApplication[]
  onlineFormPaymentIntakes: OnlineFormPaymentIntake[]
  labRequests: LabRequest[]
  employees: Employee[]
  notifications: Notification[]
  /** Snapshot readings for dashboard fallbacks — live hydro data stays in relational tables */
  waterLevelReadings: WaterLevelReading[]
}
