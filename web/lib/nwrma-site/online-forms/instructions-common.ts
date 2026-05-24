/** Shared copy for dam safety, effluent discharge, and water right instruction steps */

export const PERMIT_FORM_INSTRUCTIONS = {
  intro: `Pursuant to the National Water Resources Management Agency Act No.5 of 2017, no person shall discharge, dam, store, dredge, or otherwise use water resources or construct or maintain any works for the use of water resources prior to obtaining a water right permit.`,
  completeness: `Complete the form as completely as possible and include all relevant documents. Applications will not be processed unless all required information is included.`,
  attachmentsNote: `Where attached sheets and other technical documents are used in lieu of the space provided, indicate appropriate cross-references. Paragraphs that are not applicable should be marked as "N/A".`,
  processingTime: `On the precondition that the application has been completed correctly, the average length of time required to decide on permits is within 3 months from date of receipt, including if necessary, a public disclosure.`,
  involvement: `The applicant is required to be present during the site verification exercise. The applicant will be informed of objections raised during the hearing phase and requested to participate in public forums relating to the application.`,
} as const

export const PERMIT_ADMIN_FEES_TEXT = `Administrative fees of SLL 10,000.00 for provincial areas excluding Makeni and Bo Cities and SLL 1,000.00 for Western Area, Makeni and Bo Cities. Payable to National Water Resources Management Agency (SLL), Bank of Sierra Leone, Account 0111004067, BBAN 000001011100406701. Non-refundable. Applications processed ONLY AFTER fee is paid.`

export const WATER_USE_DEFINITIONS = [
  { term: 'Consumptive Use', def: 'Using any mechanical means to withdraw water from ponds, lakes, rivers, streams, or aquifers, dams/reservoirs, etc.' },
  { term: 'Non-Consumptive Use', def: 'A water use that does not affect the quantity of freshwater (e.g. hydropower, boating).' },
  { term: 'Municipal Use', def: 'Freshwater for municipal potable water supply to a population of more than 2000.' },
  { term: 'Domestic Use', def: 'Freshwater for household use.' },
  { term: 'Small Town Domestic Water System', def: 'Freshwater for a small urban community with population between 2,000 and 30,000.' },
  { term: 'Industrial', def: 'Freshwater for industrial purposes.' },
  { term: 'Commercial', def: 'Direct sale of freshwater for profit e.g. water tanker services.' },
  { term: 'Dewatering', def: 'An intentional lowering of water level e.g. groundwater level.' },
  { term: 'Spillage (controlled)', def: 'Controlled release of freshwater and/or effluent into the water body.' },
] as const

export const NWRMA_CONTACT = {
  address: '29 King Herman Road, Freetown, Sierra Leone',
  phone: '+23275 597184 / +23230 775898',
  email: 'waterresourcesagency2018@gmail.com',
} as const

export const PERMIT_APPLICATION_ITEMS_BASE = [
  '(a) A site plan showing infrastructure components',
  '(b) A general description of the project entailing water use',
  '(c) EIA, ESMP and relevant permits from EPA, NMA, etc.',
] as const
