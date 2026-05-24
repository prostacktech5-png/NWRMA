/** Sierra Leone administrative divisions for borehole ID generation. */

export type SeedRegion = { id: string; code: string; name: string }
export type SeedDistrict = { id: string; regionId: string; code: string; name: string }
export type SeedChiefdom = { id: string; districtId: string; name: string }
export type SeedSettlementType = { id: string; code: string; label: string }

export const SETTLEMENT_TYPES: SeedSettlementType[] = [
  { id: 'stl-r', code: 'R', label: 'Rural' },
  { id: 'stl-u', code: 'U', label: 'Urban' },
  { id: 'stl-p', code: 'P', label: 'Peri-Urban' },
]

export const REGIONS: SeedRegion[] = [
  { id: 'reg-1', code: '1', name: 'Eastern' },
  { id: 'reg-2', code: '2', name: 'Northern' },
  { id: 'reg-3', code: '3', name: 'Southern' },
  { id: 'reg-4', code: '4', name: 'Western Area' },
  { id: 'reg-5', code: '5', name: 'North Western' },
]

export const DISTRICTS: SeedDistrict[] = [
  { id: 'dist-01', regionId: 'reg-3', code: '01', name: 'Bo' },
  { id: 'dist-02', regionId: 'reg-2', code: '02', name: 'Bombali' },
  { id: 'dist-03', regionId: 'reg-3', code: '03', name: 'Bonthe' },
  { id: 'dist-04', regionId: 'reg-1', code: '04', name: 'Kailahun' },
  { id: 'dist-05', regionId: 'reg-5', code: '05', name: 'Kambia' },
  { id: 'dist-06', regionId: 'reg-3', code: '06', name: 'Kenema' },
  { id: 'dist-07', regionId: 'reg-2', code: '07', name: 'Koinadugu' },
  { id: 'dist-08', regionId: 'reg-1', code: '08', name: 'Kono' },
  { id: 'dist-09', regionId: 'reg-3', code: '09', name: 'Moyamba' },
  { id: 'dist-10', regionId: 'reg-5', code: '10', name: 'Port Loko' },
  { id: 'dist-11', regionId: 'reg-3', code: '11', name: 'Pujehun' },
  { id: 'dist-12', regionId: 'reg-2', code: '12', name: 'Tonkolili' },
  { id: 'dist-13', regionId: 'reg-4', code: '13', name: 'Western Area Urban' },
  { id: 'dist-14', regionId: 'reg-4', code: '14', name: 'Western Area Rural' },
  { id: 'dist-15', regionId: 'reg-2', code: '15', name: 'Falaba' },
  { id: 'dist-16', regionId: 'reg-5', code: '16', name: 'Karene' },
]

/** Representative chiefdoms per district (expandable later via admin). */
export const CHIEFDOMS: SeedChiefdom[] = [
  { id: 'ch-01-01', districtId: 'dist-01', name: 'Baoma' },
  { id: 'ch-01-02', districtId: 'dist-01', name: 'Bongor' },
  { id: 'ch-02-01', districtId: 'dist-02', name: 'Bombali Shebora' },
  { id: 'ch-02-02', districtId: 'dist-02', name: 'Gbanti' },
  { id: 'ch-03-01', districtId: 'dist-03', name: 'Bumpe' },
  { id: 'ch-04-01', districtId: 'dist-04', name: 'Dia' },
  { id: 'ch-04-02', districtId: 'dist-04', name: 'Luawa' },
  { id: 'ch-05-01', districtId: 'dist-05', name: 'Dixon' },
  { id: 'ch-06-01', districtId: 'dist-06', name: 'Magbema' },
  { id: 'ch-06-02', districtId: 'dist-06', name: 'Dama' },
  { id: 'ch-06-03', districtId: 'dist-06', name: 'Soa' },
  { id: 'ch-06-04', districtId: 'dist-06', name: 'Lugbu' },
  { id: 'ch-07-01', districtId: 'dist-07', name: 'Nieni' },
  { id: 'ch-08-01', districtId: 'dist-08', name: 'Sandor' },
  { id: 'ch-09-01', districtId: 'dist-09', name: 'Lower Banta' },
  { id: 'ch-10-01', districtId: 'dist-10', name: 'Kaffu Bullom' },
  { id: 'ch-11-01', districtId: 'dist-11', name: 'Barri' },
  { id: 'ch-12-01', districtId: 'dist-12', name: 'Kunike' },
  { id: 'ch-13-01', districtId: 'dist-13', name: 'Freetown Central' },
  { id: 'ch-14-01', districtId: 'dist-14', name: 'Waterloo Rural' },
  { id: 'ch-15-01', districtId: 'dist-15', name: 'Sulima' },
  { id: 'ch-16-01', districtId: 'dist-16', name: 'Samu' },
]
