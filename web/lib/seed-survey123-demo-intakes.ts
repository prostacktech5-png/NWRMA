import type { Survey123BoreholeIntakeFields } from '@/lib/types'

export type DemoIntakePayload = {
  label: string
  fields: Survey123BoreholeIntakeFields
}

export const SURVEY123_DEMO_INTAKES: DemoIntakePayload[] = [
  {
    label: 'Kenema — Magbema (Rural)',
    fields: {
      drillingCompanyName: 'Sierra Water Drilling Ltd',
      regionName: 'Southern',
      districtName: 'Kenema',
      chiefdomName: 'Magbema',
      settlementType: 'Rural',
      locationDescription: 'Kpandobu village, community water point',
      lat: 7.8763,
      lng: -11.1859,
      drillingMethod: 'Rotary mud flush',
      boreholeDepthM: 52,
      overburdenDepthM: 12,
      waterStrikeDepthsM: [18, 34, 48],
      permanentCasingType: 'PVC 6 inch',
      yieldLps: 2.4,
      transmissivity: 12.5,
      hydraulicConductivity: 0.85,
      waterQualityPhysical: {
        pH: 7.1,
        turbidity_ntu: 2.1,
        ec_us_cm: 420,
        tds_mg_l: 268,
      },
    },
  },
  {
    label: 'Bo — Baoma (Rural)',
    fields: {
      drillingCompanyName: 'Sierra Water Drilling Ltd',
      regionName: 'Southern',
      districtName: 'Bo',
      chiefdomName: 'Baoma',
      settlementType: 'Rural',
      locationDescription: 'Baoma town outskirts, school compound',
      lat: 7.9647,
      lng: -11.7388,
      drillingMethod: 'Air rotary',
      boreholeDepthM: 38,
      overburdenDepthM: 8,
      waterStrikeDepthsM: [22, 35],
      permanentCasingType: 'PVC 5 inch',
      yieldLps: 1.8,
      transmissivity: 9.2,
      hydraulicConductivity: 0.62,
      waterQualityPhysical: {
        pH: 6.9,
        turbidity_ntu: 3.5,
        ec_us_cm: 510,
      },
    },
  },
  {
    label: 'Kenema — Dama (Peri-Urban)',
    fields: {
      drillingCompanyName: 'Sierra Water Drilling Ltd',
      regionName: 'Southern',
      districtName: 'Kenema',
      chiefdomName: 'Dama',
      settlementType: 'Peri-Urban',
      locationDescription: 'Dama chiefdom peri-urban fringe',
      lat: 7.8912,
      lng: -11.2011,
      drillingMethod: 'Rotary',
      boreholeDepthM: 44,
      overburdenDepthM: 10,
      waterStrikeDepthsM: [20, 38],
      permanentCasingType: 'PVC 6 inch',
      yieldLps: 2.0,
      transmissivity: 10.0,
      hydraulicConductivity: 0.7,
      waterQualityPhysical: { pH: 7.0, turbidity_ntu: 2.8 },
    },
  },
]
