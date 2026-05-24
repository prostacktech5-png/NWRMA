/**
 * Instruction text transcribed from official NWRMA PDF application forms
 * in the project root (APPLICATION for WATER DRILLING LICENCE_final.pdf,
 * Dam Safety Application.pdf, Effulent discharge Application.pdf,
 * WATER RIGHT APPLICATION FINAL_provinces.pdf).
 */

export const DRILLING_LICENCE_INSTRUCTIONS = {
  title: 'APPLICATION FORM FOR WELL DRILLING LICENCES',
  intro:
    'Pursuant to Section 3(2)(b) of the National Water Resources Management Agency Act No.5 of 2017, no person shall drill and develop a water well without a drilling licence obtainable from the National Water Resources Management Agency (NWRMA).',
  completeness:
    'In order for the NWRMA to process applications for water drilling licence expediently, it is important that you complete the form as detailed as possible and include all the relevant documents. Applications will not be processed unless all the required information is included.',
  applicationItems: {
    heading: '1. Applications shall include:',
    businessParticulars: {
      label: '(a) Business particulars including:',
      items: [
        'Certificate of incorporation',
        'Certificate to commence business.',
        'Objects of the company',
        'List of Directors',
        'Certificate of change of name (where applicable)',
        "Name of company's representatives",
      ],
      note: '(This applies to private businesses only).',
    },
    taxClearance: '(b) Tax clearance certificate',
    vat: '(c) Value Added Tax (VAT) Certificate',
    slrsa:
      '(d) Sierra Leone Road Safety Authority (SLRSA) proving ownership of vehicles, drilling rigs and accessories',
    equipment: '(e) List of drilling equipment and their specifications',
  },
  attachments: {
    heading: '2. Attachments',
    body: 'Where attached sheets and other technical documents are used in lieu of the space provided, indicate appropriate cross-references. Paragraphs that are not applicable to your application should be marked as "N/A".',
    bodyEmphasis:
      '(List of key personnel and referees should include CV of such persons).',
  },
  fees: {
    heading: '3. Administrative, processing and licence fees.',
    paragraphs: [
      'The administrative fee of Fifteen thousand New Leones (NLE 15,000) for provincial areas other than Bo and Makeni cities and One Thousand New Leones (SLE 1,000) for Western Area, Bo and Makeni cities only. The fees cover costs for site visit and for processing the application. Licences Fess is NLe 17,000 and NLe 25,000 for classes B and A respectively. Administrative fees for processing the application shall be paid on submission of the completed application form for a water drilling licence and submit the pay-in-slip.',
      'The administrative fee for foreign contractors whose well drilling equipment are not located within sierra Leone will be determined by the Agency based on the location of the drilling equipment. This fee is non-refundable.',
      'All payments should be made to the following:',
      'Account Name: National Water Resources Management Agency (SLE)',
      'Bank Name: Bank of Sierra Leone',
      'Account Number: 0111004067',
      'BBAN Acct No: 000001011100406701',
      'Only certified cheques made payable to NWRMA is accepted.',
    ],
  },
  processing: {
    heading: '4. Time required for processing.',
    body: 'On the precondition that the application has been completed correctly, the average length of time required to decide on a drilling licence is within two (2) months from the date of receipt.',
  },
  renewal: {
    heading: '5. Renewal of licence.',
    paragraphs: [
      'An application for the renewal of the licence may be made to NWRMA not later than thirty (30) days before the expiration of the licence.',
      'Quarterly reports for all well(s) drilled MUST be submitted to the National Water Resources Management Agency not later than two weeks at the end of each quarter. Failure to submit the quarterly well drilling reports will lead to the refusal of issuing a well drilling licence',
    ],
  },
  contact: {
    intro:
      'For any clarification on any provision of the application form, please consult with the NWRMA Secretariat on the contacts below and applications may be delivered in person at NWRMA\'s address, below:',
    headOffice: 'Head Office',
    directorGeneral: 'Director-General',
    agency: 'National Water Resources Management Agency',
    address: '29 King Harman Road Brookfields',
    city: 'Freetown',
    mobile: '+23275597184/ +23230 775898',
    email: 'waterresourcesagency2018@gmail.com',
  },
} as const

export const PERMIT_APPLICATION_ITEMS = {
  sitePlan:
    '(a) A site plan, showing the different components of the proposed infrastructure of the project, such as intake structure, dams, weirs, ponds, pipelines, treatment facilities, industrial processing plant, effluent point and water meters.',
  projectDescription:
    '(b) A general description of the project entailing water use, including types of works, what the water will be used for and how, proposed production or results of project, proposed project start and completion dates.',
  environmentalDocs:
    '(c) Relevant documents such as Environmental Impact Assessment (EIA), Environmental and Social Management Plan (ESMP) and other relevant permit from the Environmental Protection Agency, National Minerals Agency, Ministry of Energy, Local Councils, etc. If these have not yet been issued, state when application has been submitted and expected approval date. An environmental permit is required for projects subject to EPA regulations before a Water Use Permit may be issued.',
} as const

export const PERMIT_INSTRUCTIONS_SHARED = {
  questionnaire: {
    heading:
      '2. Fill out the questionnaire as detailed as possible. Where attached sheets and other technical documents are used in lieu of the space provided, indicate appropriate cross-references. Paragraphs that are not applicable to your application should be marked as "N/A".',
  },
  feesStandard: {
    heading: '3. Administrative and Processing Fees',
    paragraphs: [
      'The administrative fee covers costs of verification of site information and internal administration processing. Administrative fees of Ten Thousand New Leones (SLL 10,000.00) for provincial areas excluding Makeni and Bo Cities and One Thousand New Leones (SLL 1,000.00) for Western Area, Makeni and Bo Cities for processing applications shall be paid on submission of a completed application for Water Use Permit.',
      'Cash, certified cheques, and bank drafts are payable to the National Water Resources Management Agency and the pay-in-slip is attached when submitting the filled application form.',
      'Account Name: National Water Resources Management Agency (SLL)',
      'Bank Name: Bank of Sierra Leone',
      'Account Number: 0111004067',
      'BBAN Acct No: 000001011100406701',
      'The administrative fee is non-refundable.',
      'Applications will be processed ONLY AFTER the administrative fee has been paid.',
      'Kindly note that the cost of the administrative and processing fee is different from the water use charge, which will be determined based on the water use.',
    ],
  },
  feesWaterRight: {
    heading: '3. Administrative and Processing Fees',
    paragraphs: [
      'The administrative fee covers costs of verification of site information and internal administration processing. Administrative fees of Twenty Thousand New Leones (SLL 20,000.00) for provincial and One Thousand New Leones (SLL 1,000.00) for Western Area, Makeni and Bo Cities for processing applications shall be paid on submission of a completed application for Water Use Permit.',
      'Cash, certified cheques, and bank drafts are payable to the National Water Resources Management Agency and the pay-in-slip is attached when submitting the filled application form.',
      'Account Name: National Water Resources Management Agency (SLL)',
      'Bank Name: Bank of Sierra Leone',
      'Account Number: 0111004067',
      'BBAN Acct No: 000001011100406701',
      'The administrative fee is non-refundable.',
      'Applications will be processed ONLY AFTER the administrative fee has been paid.',
      'Kindly note that the cost of the administrative and processing fee is different from the water use charge, which will be determined based on the water use.',
    ],
  },
  processing: {
    heading: '4. Time required for processing.',
    body: 'On the precondition that the application has been completed correctly, the average length of time required to decide on permits is within 3 months from date of receipt, including if necessary, a public disclosure. (Delays may occur due to the processing of the environmental permitting and other permits where WDMP is not included in the EIA or ESMP)',
  },
  involvement: {
    heading: '5. Involvement in permit processing',
    body: 'The applicant is required to be present during the site verification exercise of the project area. The applicant will be informed of any objections raised during the hearing phase and of any information that the NWRMA receives from other parties. The applicant will be requested to participate in any public forums disclosure relating to the application.',
  },
  definitionsHeading: '6. Definitions of some water uses',
  definitionsDamEffluent: [
    'Consumptive Use: Using any mechanical means to withdraw water from ponds, lakes, rivers, streams, or aquifers, dams/reservoirs, etc. for purposes such as mining, irrigation, aquaculture (pond and hatchery), construction, etc.',
    'Non-Consumptive Use: A water use that does not affect the quantity of freshwater. Water for purposes such as hydropower, boating, aquaculture (cage)',
    'Municipal Use: Freshwater for municipal potable water supply to a population of more than 2000',
    'Domestic Use: Freshwater water for household use.',
    'Small Town Domestic Water System: Freshwater for a small urban community with population between 2,000 and 30,000.',
    'Industrial: Freshwater for industrial purposes, e.g. food processing, textile making',
    'Wastewater',
    'Commercial: Direct sale of freshwater for profit e.g. water tanker services',
    'Dewatering (e.g. pit-dewatering, discharge): An intentional lowering of water level e.g. groundwater level,',
    'Spillage (controlled): Controlled release of freshwater and/or effluent into the water body',
  ],
  definitionsWaterRight: [
    'Consumptive Use: Using any mechanical means to withdraw water from ponds, lakes, rivers, streams, or aquifers, dams/reservoirs, etc. for purposes such as mining, irrigation, aquaculture (pond and hatchery), construction, etc.',
    'Non-Consumptive Use: A water use that does not affect the quantity of freshwater. Water for purposes such as hydropower, boating, aquaculture (cage)',
    'Municipal Use: Freshwater for municipal potable water supply to a population of more than 2000',
    'Domestic Use: Freshwater water for household use.',
    'Small Town Domestic Water System: Freshwater for a small urban community with population between 2,000 and 30,000.',
    'Industrial: Freshwater for industrial purposes, e.g. food processing, textile making',
    'Commercial: Direct sale of freshwater for profit e.g. water tanker services',
    'Dewatering (e.g. pit-dewatering, discharge): An intentional lowering of water level e.g. groundwater level,',
    'Spillage (controlled): Controlled release of freshwater and/or effluent into the water body',
  ],
  contact: {
    intro:
      'If you are in doubt of any provision of the application form, please consult the NWRMA Secretariat on the contacts below. Applications may be delivered in person at the NWRMA address below:',
    headOffice: 'Head Office',
    directorGeneral: 'The Director-General',
    address: '29 King Harman Road',
    city: 'Freetown',
    country: 'Sierra Leone',
    mobile: '+23275 597184/+23230 775898',
  },
} as const

export const DAM_SAFETY_INSTRUCTIONS = {
  title: 'APPLICATION FOR DAM SAFETY LICENCE',
  intro:
    'Pursuant to the National Water Resources Management Agency Act No.5 of 2017, no person shall discharge, dam, store, dredge, or otherwise use water resources or construct or maintain any works for the use of water resources prior to obtaining a water right permit.',
  completeness:
    'In order for the NWRMA to process applications for the Dam Safety licence conveniently, you must complete the form as completely as possible and include all the relevant documents. Applications will not be processed unless all required information is included.',
  itemD:
    '(d) A Dam construction and Management Plan (DCMP) (preliminary): A DCMP shall include planned measures to reduce consumption, plans, designs, construction method, operations and monitoring of dams. A DCMP is only required for consumptive uses and effluent discharge purposes.',
  itemE:
    '(e) Business Particulars: Including registration, object of the company, representatives, and whether the company is currently under litigation for reasons pertaining to environmental pollution. (This applies to private businesses only).',
} as const

export const EFFLUENT_DISCHARGE_INSTRUCTIONS = {
  title: 'APPLICATION FOR EFFLUENT DISCHARGE PERMIT',
  intro:
    'Pursuant to the National Water Resources Management Agency Act No.5 of 2017, no person shall discharge, dam, store, dredge, or otherwise use water resources or construct or maintain any works for the use of water resources prior to obtaining a water right permit.',
  completeness:
    'In order for the NWRMA to process applications for the discharge of effluent conveniently, you must complete the form as completely as possible and include all the relevant documents. Applications will not be processed unless all required information is included.',
  itemD:
    '(d) A wastewater Management Plan (WMP) (preliminary): A WMP shall include planned measures to reduce consumption, plans for treating the wastewater, and to monitor wastewater discharge. A WMP is only required for consumptive uses and effluent discharge purposes.',
  itemE:
    '(e) Business Particulars: Including registration, object of the company, representatives, and whether the company is currently under litigation for reasons pertaining to environmental pollution. (This applies to private businesses only).',
} as const

export const WATER_RIGHT_INSTRUCTIONS = {
  title: 'APPLICATION FOR WATER RIGHT PERMIT',
  intro:
    'Pursuant to the National Water Resources Management Agency Act No.5 of 2017, no person shall divert, dam, store, dredge, abstract or otherwise use water resources or construct or maintain any works for the use of water resources prior to obtaining a water right permit.',
  completeness:
    'In order for the NWRMA to process applications for water rights conveniently, it is important that you complete the form as detailed as possible and include all the relevant documents. Applications will not be processed unless all required information is included.',
  itemD:
    '(d) A Water Demand Management Plan (WDMP) (preliminary): A WDMP shall include planned measures to reduce consumption and to monitor water use (metering). A WDMP is only required for consumptive uses, such as water abstraction.',
  itemE:
    '(e) Business Particulars: Including registration, object of the company, representatives, and whether the company is currently under litigation for reasons pertaining to environmental pollution. (This applies to private businesses only).',
} as const
