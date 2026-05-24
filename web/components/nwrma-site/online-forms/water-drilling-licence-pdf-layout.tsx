'use client'

import { DEFAULT_PUBLIC_LOGO_PATH } from '@/lib/app-branding'
import { formatDateValue } from '@/lib/erp-formatting'
import { isBlank } from '@/lib/online-form-readonly-completeness'
import type {
  EquipmentRow,
  PersonnelRow,
  WaterDrillingLicenceFormPayload,
} from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'
import { cn } from '@/lib/utils'

function displayValue(value: unknown): string {
  if (value == null || value === '') return ''
  if (value instanceof Date) return formatDateValue(value, '')
  return String(value).trim()
}

function PdfAgencyBar() {
  return (
    <div className="wdl-pdf__agency-bar">National Water Resources Management Agency</div>
  )
}

function PdfPageNumber({ n }: { n: number }) {
  return <span className="wdl-pdf__page-num">{n}</span>
}

function PdfDottedField({
  label,
  value,
  suffix,
  block,
}: {
  label: string
  value: unknown
  suffix?: string
  block?: boolean
}) {
  const text = displayValue(value)
  const empty = isBlank(value)
  return (
    <div className={cn('wdl-pdf__dotted-row', block && 'wdl-pdf__dotted-row--block')}>
      {label ? (
        <span className="wdl-pdf__dotted-label">
          {label}
          {suffix ? ` ${suffix}` : ''}:
        </span>
      ) : null}
      <span className={cn('wdl-pdf__dotted-line', empty && 'wdl-pdf__dotted-line--empty')}>
        {text || '\u00a0'}
      </span>
    </div>
  )
}

function directorsLine(directors: WaterDrillingLicenceFormPayload['directors']): string {
  return directors
    .map((d) => {
      const name = displayValue(d.fullName)
      const cit = displayValue(d.citizenship)
      if (!name && !cit) return ''
      if (name && cit) return `${name} (${cit})`
      return name || cit
    })
    .filter(Boolean)
    .join('; ')
}

function isIntroRigRow(row: EquipmentRow): boolean {
  return row.description.toLowerCase().includes('100')
}

function classAMainRows(rows: EquipmentRow[]): EquipmentRow[] {
  return rows.filter((r) => !isIntroRigRow(r)).slice(0, 8)
}

function classIntroRow(rows: EquipmentRow[]): EquipmentRow | undefined {
  return rows.find(isIntroRigRow)
}

function classNumberedRows(rows: EquipmentRow[]): EquipmentRow[] {
  const intro = isIntroRigRow
  return rows.filter((r) => !intro(r)).slice(0, 8)
}

function PdfEquipmentCell({
  value,
  expected,
}: {
  value: string
  expected?: string
}) {
  const empty = isBlank(value)
  return (
    <td className={cn(empty && 'wdl-pdf__cell-empty')}>
      {displayValue(value) || (empty ? '\u00a0' : '')}
      {empty && expected ? (
        <span className="sr-only"> Expected: {expected}</span>
      ) : null}
    </td>
  )
}

function PdfBoreholeEquipmentTable({
  classA,
  classB,
  classC,
}: {
  classA: EquipmentRow[]
  classB: EquipmentRow[]
  classC: EquipmentRow[]
}) {
  const rowsA = classAMainRows(classA)
  const introB = classIntroRow(classB)
  const mainB = classNumberedRows(classB)
  const introC = classIntroRow(classC)
  const mainC = classNumberedRows(classC)

  const spacer = (key: string) => (
    <tr key={key} className="wdl-pdf__table-spacer">
      <td colSpan={5} />
    </tr>
  )

  return (
    <table className="wdl-pdf__table">
      <thead>
        <tr>
          <th className="wdl-pdf__col-no">No</th>
          <th>Description of expected equipment</th>
          <th className="wdl-pdf__col-qty">Qty (Nr)</th>
          <th>Qty available (Pls state)</th>
          <th className="wdl-pdf__col-class">Class</th>
        </tr>
      </thead>
      <tbody>
        {rowsA.map((row, i) => (
          <tr key={`a-${i}`}>
            <td className="wdl-pdf__col-no">{i + 1}</td>
            <td className="wdl-pdf__col-desc">{row.description}</td>
            <td className="wdl-pdf__col-qty">{row.qtyExpected}</td>
            <PdfEquipmentCell value={row.qtyAvailable} expected={row.qtyExpected} />
            {i === 0 ? (
              <td className="wdl-pdf__col-class" rowSpan={rowsA.length}>
                CLASS A
              </td>
            ) : null}
          </tr>
        ))}
        {spacer('sp-a-b')}
        {(() => {
          const bSpan = (introB ? 1 : 0) + mainB.length
          const bClassOnIntro = Boolean(introB)
          return (
            <>
              {introB ? (
                <tr key="b-intro">
                  <td className="wdl-pdf__col-no">{'\u00a0'}</td>
                  <td className="wdl-pdf__col-desc">{introB.description}</td>
                  <td className="wdl-pdf__col-qty">{introB.qtyExpected}</td>
                  <PdfEquipmentCell
                    value={introB.qtyAvailable}
                    expected={introB.qtyExpected}
                  />
                  <td className="wdl-pdf__col-class" rowSpan={bSpan}>
                    CLASS B
                  </td>
                </tr>
              ) : null}
              {mainB.map((row, i) => (
                <tr key={`b-${i}`}>
                  <td className="wdl-pdf__col-no">{String(i + 1)}</td>
                  <td className="wdl-pdf__col-desc">{row.description}</td>
                  <td className="wdl-pdf__col-qty">{row.qtyExpected}</td>
                  <PdfEquipmentCell value={row.qtyAvailable} expected={row.qtyExpected} />
                  {!bClassOnIntro && i === 0 ? (
                    <td className="wdl-pdf__col-class" rowSpan={bSpan}>
                      CLASS B
                    </td>
                  ) : null}
                </tr>
              ))}
            </>
          )
        })()}
        {spacer('sp-b-c')}
        {(() => {
          const cSpan = (introC ? 1 : 0) + mainC.length
          const cClassOnIntro = Boolean(introC)
          return (
            <>
              {introC ? (
                <tr key="c-intro">
                  <td className="wdl-pdf__col-no">{'\u00a0'}</td>
                  <td className="wdl-pdf__col-desc">{introC.description}</td>
                  <td className="wdl-pdf__col-qty">{introC.qtyExpected}</td>
                  <PdfEquipmentCell
                    value={introC.qtyAvailable}
                    expected={introC.qtyExpected}
                  />
                  <td className="wdl-pdf__col-class" rowSpan={cSpan}>
                    CLASS C
                  </td>
                </tr>
              ) : null}
              {mainC.map((row, i) => (
                <tr key={`c-${i}`}>
                  <td className="wdl-pdf__col-no">{String(i + 1)}</td>
                  <td className="wdl-pdf__col-desc">{row.description}</td>
                  <td className="wdl-pdf__col-qty">{row.qtyExpected}</td>
                  <PdfEquipmentCell value={row.qtyAvailable} expected={row.qtyExpected} />
                  {!cClassOnIntro && i === 0 ? (
                    <td className="wdl-pdf__col-class" rowSpan={cSpan}>
                      CLASS C
                    </td>
                  ) : null}
                </tr>
              ))}
            </>
          )
        })()}
      </tbody>
    </table>
  )
}

function PdfHandDugEquipmentTable({ rows }: { rows: EquipmentRow[] }) {
  return (
    <table className="wdl-pdf__table">
      <thead>
        <tr>
          <th className="wdl-pdf__col-no">No</th>
          <th>Description of expected equipment</th>
          <th className="wdl-pdf__col-qty">Qty (Nr)</th>
          <th>Qty available (Pls state)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td className="wdl-pdf__col-no">{i + 1}</td>
            <td className="wdl-pdf__col-desc">{row.description}</td>
            <td className="wdl-pdf__col-qty">{row.qtyExpected}</td>
            <PdfEquipmentCell value={row.qtyAvailable} expected={row.qtyExpected} />
          </tr>
        ))}
        <tr>
          <td colSpan={4} style={{ height: '0.35rem', borderTop: 'none' }} />
        </tr>
      </tbody>
    </table>
  )
}

function PdfPersonnelTable({ rows }: { rows: PersonnelRow[] }) {
  return (
    <table className="wdl-pdf__table">
      <thead>
        <tr>
          <th className="wdl-pdf__col-no">No</th>
          <th>Personnel</th>
          <th className="wdl-pdf__col-qty">Qty</th>
          <th>Qualification</th>
          <th>Yrs of Experience</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td className="wdl-pdf__col-no">{'\u00a0'}</td>
            <td className="wdl-pdf__col-desc">{row.role}</td>
            <td className="wdl-pdf__col-qty">{displayValue(row.qty) || '\u00a0'}</td>
            <td className={cn(isBlank(row.qualification) && 'wdl-pdf__cell-empty')}>
              {displayValue(row.qualification) || '\u00a0'}
            </td>
            <td>{displayValue(row.yearsExperience) || '\u00a0'}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={5} style={{ height: '0.35rem' }} />
        </tr>
      </tbody>
    </table>
  )
}

export function WaterDrillingLicencePdfLayout({
  form,
  reference,
}: {
  form: WaterDrillingLicenceFormPayload
  reference: string
}) {
  const refereeBlock = (name: string, address: string) => {
    const parts = [displayValue(name), displayValue(address)].filter(Boolean)
    return parts.join(parts.length > 1 ? ', ' : '') || '\u00a0'
  }

  return (
    <div className="wdl-pdf">
      <p className="wdl-pdf__staff-meta">
        Application reference: <strong>{reference}</strong> — Official form layout (read-only)
      </p>

      {/* Cover / application page (PDF p.4) */}
      <section className="wdl-pdf__page wdl-pdf__cover">
        <PdfAgencyBar />
        <div className="wdl-pdf__page-inner">
          <div className="wdl-pdf__logo-wrap">
            <img src={DEFAULT_PUBLIC_LOGO_PATH} alt="" className="wdl-pdf__logo" />
            <p className="wdl-pdf__agency-name">
              National Water Resources Management Agency Sierra Leone
            </p>
          </div>
          <h1 className="wdl-pdf__regulation-title">
            Drilling Licence and Groundwater Development Regulation
          </h1>
          <div className="wdl-pdf__application-box">
            <h2 className="wdl-pdf__application-box-title">
              Application for Well Drilling Licence
            </h2>
            <PdfDottedField label="Company name" value={form.companyName} />
            <PdfDottedField label="Address" value={form.poBox} suffix="P.O. Box" />
            <PdfDottedField label="Tel" value={form.phone} />
            <PdfDottedField label="Fax" value={form.fax} />
            <PdfDottedField label="E-mail" value={form.email} />
            <PdfDottedField label="Name of contact person" value={form.contactName} />
            <PdfDottedField label="Email" value={form.contactEmail} />
            <PdfDottedField label="Phone No" value={form.contactPhone} />
            <hr className="wdl-pdf__hr" />
            <PdfDottedField label="Registered Company No" value={form.regNumber} />
            <hr className="wdl-pdf__hr" />
            <PdfDottedField
              label="Full name of Directors and their citizenship"
              value={directorsLine(form.directors)}
              block
            />
            <hr className="wdl-pdf__hr" />
            <PdfDottedField
              label="Name and address of company's bankers"
              value={form.bankers}
              block
            />
            <hr className="wdl-pdf__hr" />
            <div className="wdl-pdf__dotted-row">
              <span className="wdl-pdf__dotted-line">{'\u00a0'}</span>
            </div>
          </div>
        </div>
        <PdfPageNumber n={4} />
      </section>

      {/* Equipment — borehole (PDF p.5) */}
      <section className="wdl-pdf__page">
        <PdfAgencyBar />
        <div className="wdl-pdf__page-inner">
          <p className="wdl-pdf__table-title">
            List of equipment: (borehole drilling) specify and include as Annex 1
          </p>
          <PdfBoreholeEquipmentTable
            classA={form.boreholeClassA}
            classB={form.boreholeClassB}
            classC={form.boreholeClassC}
          />
          <p className="wdl-pdf__table-title">
            List of equipment: (Hand dug well) specify and include as Annex 1
          </p>
        </div>
        <PdfPageNumber n={5} />
      </section>

      {/* Hand dug equipment + personnel (PDF p.6) */}
      <section className="wdl-pdf__page">
        <PdfAgencyBar />
        <div className="wdl-pdf__page-inner">
          <PdfHandDugEquipmentTable rows={form.handDugWell} />
          <p className="wdl-pdf__table-title">
            List of key personnel (including field personnel of each drilling crew): specify and
            include as Annex 2
          </p>
          <PdfPersonnelTable rows={form.boreholePersonnel} />
          <p className="wdl-pdf__table-title">
            List of key personnel (including field personnel of each hand dug well crew): specify
            and include as Annex 2
          </p>
          <PdfPersonnelTable rows={form.handDugPersonnel} />
          <p className="wdl-pdf__annex-line">
            List of projects carried out in the last 5 years specify and include as Annex 3
          </p>
          <PdfDottedField label="" value={form.projectsLast5Years} block />
          <p className="wdl-pdf__annex-line">Name and address of two referees:</p>
          <PdfDottedField label="" value={refereeBlock(form.referee1.name, form.referee1.address)} block />
          <PdfDottedField label="" value={refereeBlock(form.referee2.name, form.referee2.address)} block />
          <p className="wdl-pdf__annex-line">
            Quarterly Well drilling reports(for renewal purposes only) and include as annex 4
          </p>
        </div>
        <PdfPageNumber n={6} />
      </section>

      {/* Declaration (PDF p.7) */}
      <section className="wdl-pdf__page">
        <PdfAgencyBar />
        <div className="wdl-pdf__page-inner">
          <div className="wdl-pdf__declaration-box">
            <p className="wdl-pdf__declaration-text">
              I declare that the information given on this form and attachments hereto is correct
              to the best of my knowledge and belief.
            </p>
            <div className="wdl-pdf__signature-row">
              <div className="wdl-pdf__signature-field">
                <span>Signature:</span>
                <span
                  className={cn(
                    'wdl-pdf__signature-dots',
                    isBlank(form.declarationSignature) && 'wdl-pdf__dotted-line--empty'
                  )}
                >
                  {displayValue(form.declarationSignature) || '\u00a0'}
                </span>
              </div>
              <div className="wdl-pdf__signature-field">
                <span>Date</span>
                <span
                  className={cn(
                    'wdl-pdf__signature-dots',
                    isBlank(form.declarationDate) && 'wdl-pdf__dotted-line--empty'
                  )}
                >
                  {formatDateValue(form.declarationDate, '') || '\u00a0'}
                </span>
              </div>
            </div>
          </div>
          <p className="wdl-pdf__note">
            NOTE: All drilling companies from classes A to C/ or companies involved in the
            construction of hand dug wells must present the list of all their key staff together
            with their CVs and certificates BEFORE LICENCES ARE ISSUE
          </p>
          <div className="wdl-pdf__footer-logo">
            <img src={DEFAULT_PUBLIC_LOGO_PATH} alt="" />
          </div>
        </div>
        <PdfPageNumber n={7} />
      </section>
    </div>
  )
}
