import type { AppBranding } from '@/lib/app-branding'

export const NWRMA_ORGANISATION_NAME =
  'National Water Resources Management Agency — Sierra Leone'

export const HYDROLOGICAL_DEPARTMENT_NAME = 'Hydrological Department'

export const WATER_LEVEL_READINGS_REPORT_TITLE = 'Water Level Readings Report'

export const WATER_LEVEL_READINGS_REPORT_SUBTITLE =
  'Reading history — recorded field gauge measurements'

export type WaterReadingsExportMeta = {
  organisation: string
  department: string
  reportTitle: string
  reportSubtitle: string
}

export function buildWaterReadingsExportMeta(
  branding?: AppBranding | null
): WaterReadingsExportMeta {
  const orgFromBranding = branding?.appName?.trim()
  return {
    organisation:
      orgFromBranding && orgFromBranding.length > 5 ? orgFromBranding : NWRMA_ORGANISATION_NAME,
    department: HYDROLOGICAL_DEPARTMENT_NAME,
    reportTitle: WATER_LEVEL_READINGS_REPORT_TITLE,
    reportSubtitle: WATER_LEVEL_READINGS_REPORT_SUBTITLE,
  }
}

export const WATER_READINGS_PDF_FOOTER =
  'National Water Resources Management Agency (NWRMA) · Hydrological Department · Water level readings'
