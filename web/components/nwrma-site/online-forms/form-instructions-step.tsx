import type { ReactNode } from 'react'
import { FormProse, FormSection } from '@/components/nwrma-site/online-forms/form-section'
import { IB, InstructionBoldP, InstructionP } from '@/components/nwrma-site/online-forms/instruction-emphasis'
import {
  DAM_SAFETY_INSTRUCTIONS,
  DRILLING_LICENCE_INSTRUCTIONS,
  EFFLUENT_DISCHARGE_INSTRUCTIONS,
  PERMIT_APPLICATION_ITEMS,
  PERMIT_INSTRUCTIONS_SHARED,
  WATER_RIGHT_INSTRUCTIONS,
} from '@/lib/nwrma-site/online-forms/instructions-from-pdf'

export type InstructionsAcknowledgements = {
  readInstructions: boolean
  feesUnderstood: boolean
}

type AckProps = {
  acknowledgements: InstructionsAcknowledgements
  onChange: (patch: Partial<InstructionsAcknowledgements>) => void
  feesLabel?: string
}

function InstructionsAcknowledgements({
  acknowledgements,
  onChange,
  feesLabel = 'I understand the administrative fees and payment instructions.',
}: AckProps) {
  return (
    <>
      <label className="nwrma-checkbox nwrma-checkbox--required">
        <input
          type="checkbox"
          checked={acknowledgements.readInstructions}
          onChange={(e) => onChange({ readInstructions: e.target.checked })}
        />
        <span className="nwrma-checkbox__text">I have read and understood the instructions above.</span>
      </label>
      <label className="nwrma-checkbox nwrma-checkbox--required">
        <input
          type="checkbox"
          checked={acknowledgements.feesUnderstood}
          onChange={(e) => onChange({ feesUnderstood: e.target.checked })}
        />
        <span className="nwrma-checkbox__text">{feesLabel}</span>
      </label>
    </>
  )
}

/** Wrapper — same section title and prose styling on every form */
export function FormInstructionsStep({
  children,
  acknowledgements,
  onAcknowledgementsChange,
  feesCheckboxLabel,
  pleaseReadLine,
}: {
  children: ReactNode
  acknowledgements: InstructionsAcknowledgements
  onAcknowledgementsChange: (patch: Partial<InstructionsAcknowledgements>) => void
  feesCheckboxLabel?: string
  pleaseReadLine: string
}) {
  return (
    <FormSection title="Instructions">
      <FormProse>
        <InstructionBoldP>{pleaseReadLine}</InstructionBoldP>
        {children}
        <InstructionsAcknowledgements
          acknowledgements={acknowledgements}
          onChange={onAcknowledgementsChange}
          feesLabel={feesCheckboxLabel}
        />
      </FormProse>
    </FormSection>
  )
}

export function DrillingLicenceInstructions({
  acknowledgements,
  onAcknowledgementsChange,
}: {
  acknowledgements: InstructionsAcknowledgements
  onAcknowledgementsChange: (patch: Partial<InstructionsAcknowledgements>) => void
}) {
  const d = DRILLING_LICENCE_INSTRUCTIONS
  return (
    <FormInstructionsStep
      acknowledgements={acknowledgements}
      onAcknowledgementsChange={onAcknowledgementsChange}
      feesCheckboxLabel="I understand the administrative and licence fees and payment instructions."
      pleaseReadLine="Please read the following prior to completing the application form."
    >
      <p>
        <strong>{d.title}</strong>
      </p>
      <InstructionBoldP>{d.intro}</InstructionBoldP>
      <InstructionBoldP>{d.completeness}</InstructionBoldP>

      <InstructionBoldP>{d.applicationItems.heading}</InstructionBoldP>
      <InstructionBoldP>{d.applicationItems.businessParticulars.label}</InstructionBoldP>
      <ol className="nwrma-instruction-sublist" type="i">
        {d.applicationItems.businessParticulars.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <InstructionBoldP>{d.applicationItems.businessParticulars.note}</InstructionBoldP>
      <InstructionBoldP>{d.applicationItems.taxClearance}</InstructionBoldP>
      <InstructionBoldP>{d.applicationItems.vat}</InstructionBoldP>
      <InstructionP>
        <IB>(d) Sierra Leone Road Safety Authority (</IB>SLRSA<IB>) proving ownership of vehicles, drilling rigs and accessories</IB>
      </InstructionP>
      <InstructionBoldP>{d.applicationItems.equipment}</InstructionBoldP>

      <h4>{d.attachments.heading}</h4>
      <InstructionP>
        {d.attachments.body} <IB>{d.attachments.bodyEmphasis}</IB>
      </InstructionP>

      <h4>{d.fees.heading}</h4>
      <InstructionP>
        The administrative fee of Fifteen thousand New Leones (<IB>NLE 15,000</IB>) for provincial areas other
        than Bo and Makeni cities and One Thousand New Leones (<IB>SLE 1,000</IB>) for Western Area, Bo and
        Makeni cities only. The fees cover costs for site visit and for processing the application. Licences Fess
        is NLe 17,000 and NLe 25,000 for classes B and A respectively. Administrative fees for processing the
        application shall be paid on submission of the completed application form for a water drilling licence
        and submit the pay-in-slip.
      </InstructionP>
      <InstructionP>{d.fees.paragraphs[1]}</InstructionP>
      <InstructionP>{d.fees.paragraphs[2]}</InstructionP>
      <InstructionBoldP>{d.fees.paragraphs[3]}</InstructionBoldP>
      <InstructionBoldP>{d.fees.paragraphs[4]}</InstructionBoldP>
      <InstructionBoldP>{d.fees.paragraphs[5]}</InstructionBoldP>
      <InstructionBoldP>{d.fees.paragraphs[6]}</InstructionBoldP>
      <InstructionP>{d.fees.paragraphs[7]}</InstructionP>

      <h4>{d.processing.heading}</h4>
      <InstructionP>{d.processing.body}</InstructionP>

      <h4>{d.renewal.heading}</h4>
      {d.renewal.paragraphs.map((p) => (
        <InstructionP key={p}>{p}</InstructionP>
      ))}

      <InstructionBoldP>{d.contact.intro}</InstructionBoldP>
      <p>
        <strong>{d.contact.headOffice}</strong>
        <br />
        <strong>{d.contact.directorGeneral}</strong>
        <br />
        {d.contact.agency}
        <br />
        {d.contact.address}
        <br />
        {d.contact.city}
        <br />
        Mobile: {d.contact.mobile}
        <br />
        E-mail: {d.contact.email}
      </p>
    </FormInstructionsStep>
  )
}

type PermitVariant = 'dam-safety' | 'effluent-discharge' | 'water-right'

function permitCopy(variant: PermitVariant) {
  if (variant === 'dam-safety') return DAM_SAFETY_INSTRUCTIONS
  if (variant === 'effluent-discharge') return EFFLUENT_DISCHARGE_INSTRUCTIONS
  return WATER_RIGHT_INSTRUCTIONS
}

function PermitFeesParagraphs({ variant }: { variant: PermitVariant }) {
  const shared = PERMIT_INSTRUCTIONS_SHARED
  const isWaterRight = variant === 'water-right'
  const feeBlock = isWaterRight ? shared.feesWaterRight : shared.feesStandard

  if (isWaterRight) {
    return (
      <>
        <InstructionP>
          The administrative fee covers costs of verification of site information and internal administration
          processing. Administrative fees of Twenty Thousand New Leones (SLL 20,000.00) for provincial and{' '}
          <IB>
            One Thousand New Leones (SLL 1,000.00) for Western Area, Makeni and Bo Cities for processing
          </IB>{' '}
          applications shall be paid on submission of a completed application for Water Use Permit.
        </InstructionP>
        <InstructionP>
          Cash, certified cheques, and bank drafts are payable to the National Water Resources Management{' '}
          <IB>Agency and the pay-in-slip is attached when submitting the filled application form.</IB>
        </InstructionP>
        <InstructionBoldP>{feeBlock.paragraphs[2]}</InstructionBoldP>
        <InstructionBoldP>{feeBlock.paragraphs[3]}</InstructionBoldP>
        <InstructionBoldP>{feeBlock.paragraphs[4]}</InstructionBoldP>
        <InstructionBoldP>{feeBlock.paragraphs[5]}</InstructionBoldP>
        <InstructionP>{feeBlock.paragraphs[6]}</InstructionP>
        <InstructionP>{feeBlock.paragraphs[7]}</InstructionP>
        <InstructionBoldP>{feeBlock.paragraphs[8]}</InstructionBoldP>
      </>
    )
  }

  return (
    <>
      <InstructionP>
        The administrative fee covers costs of verification of site information and internal administration
        processing. Administrative fees of Ten Thousand New Leones (SLL 10,000.00) for provincial areas{' '}
        <IB>
          excluding Makeni and Bo Cities and One Thousand New Leones (SLL 1,000.00) for Western Area, Makeni
          and Bo Cities
        </IB>{' '}
        for processing applications shall be paid on submission of a completed application for Water Use Permit.
      </InstructionP>
      <InstructionP>
        Cash, certified cheques, and bank drafts are payable to the National Water Resources Management{' '}
        <IB>Agency and the pay-in-slip is attached when submitting the filled application form.</IB>
      </InstructionP>
      <InstructionBoldP>{feeBlock.paragraphs[2]}</InstructionBoldP>
      <InstructionBoldP>{feeBlock.paragraphs[3]}</InstructionBoldP>
      <InstructionBoldP>{feeBlock.paragraphs[4]}</InstructionBoldP>
      <InstructionBoldP>{feeBlock.paragraphs[5]}</InstructionBoldP>
      <InstructionP>{feeBlock.paragraphs[6]}</InstructionP>
      <InstructionP>{feeBlock.paragraphs[7]}</InstructionP>
      <InstructionBoldP>{feeBlock.paragraphs[8]}</InstructionBoldP>
    </>
  )
}

export function PermitApplicationInstructions({
  variant,
  acknowledgements,
  onAcknowledgementsChange,
}: {
  variant: PermitVariant
  acknowledgements: InstructionsAcknowledgements
  onAcknowledgementsChange: (patch: Partial<InstructionsAcknowledgements>) => void
}) {
  const copy = permitCopy(variant)
  const shared = PERMIT_INSTRUCTIONS_SHARED
  const items = PERMIT_APPLICATION_ITEMS
  const definitions =
    variant === 'water-right' ? shared.definitionsWaterRight : shared.definitionsDamEffluent
  const pleaseRead =
    variant === 'water-right'
      ? 'Please read the following prior to completing the application form.'
      : 'Please read the following before completing the application form.'

  return (
    <FormInstructionsStep
      acknowledgements={acknowledgements}
      onAcknowledgementsChange={onAcknowledgementsChange}
      pleaseReadLine={pleaseRead}
    >
      <p>
        <strong>{copy.title}</strong>
      </p>
      <InstructionP>{copy.intro}</InstructionP>
      <InstructionP>{copy.completeness}</InstructionP>

      <InstructionP>1. Applications shall include:</InstructionP>
      <InstructionP>{items.sitePlan}</InstructionP>
      <InstructionP>{items.projectDescription}</InstructionP>
      <InstructionP>{items.environmentalDocs}</InstructionP>
      <InstructionP>{copy.itemD}</InstructionP>
      <InstructionP>{copy.itemE}</InstructionP>

      <InstructionP>{shared.questionnaire.heading}</InstructionP>

      <InstructionP>{shared.feesStandard.heading}</InstructionP>
      <PermitFeesParagraphs variant={variant} />

      <h4>{shared.processing.heading}</h4>
      <InstructionP>{shared.processing.body}</InstructionP>

      <h4>{shared.involvement.heading}</h4>
      <InstructionP>{shared.involvement.body}</InstructionP>

      <h4>{shared.definitionsHeading}</h4>
      <ol className="nwrma-instruction-sublist" type="i">
        {definitions.map((def) => (
          <li key={def}>{def}</li>
        ))}
      </ol>

      <InstructionP>{shared.contact.intro}</InstructionP>
      <p>
        {shared.contact.headOffice}
        <br />
        <strong>{shared.contact.directorGeneral}</strong>
        <br />
        {shared.contact.address}
        <br />
        {shared.contact.city}
        <br />
        {shared.contact.country}
        <br />
        Mobile: {shared.contact.mobile}
      </p>
    </FormInstructionsStep>
  )
}
