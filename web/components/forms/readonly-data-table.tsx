'use client'

import { isBlank } from '@/lib/online-form-readonly-completeness'
import type {
  EquipmentRow,
  PersonnelRow,
} from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'
import { cn } from '@/lib/utils'

export const EMPTY_CELL_CLASS =
  'bg-amber-50 text-amber-950 ring-1 ring-inset ring-amber-200'

function ReadOnlyCell({ value }: { value: unknown }) {
  const empty = isBlank(value)
  return (
    <td
      className={cn('px-2 py-2 text-sm', empty && EMPTY_CELL_CLASS)}
      title={empty ? 'Not provided' : undefined}
    >
      {empty ? '—' : String(value)}
    </td>
  )
}

export function ReadOnlyEquipmentTable({
  title,
  rows,
}: {
  title: string
  rows: EquipmentRow[]
}) {
  return (
    <div className="nwrma-equipment-table-wrap">
      <h4 className="nwrma-equipment-table-title">{title}</h4>
      <div className="nwrma-table-scroll">
        <table className="nwrma-data-table w-full">
          <thead>
            <tr>
              <th>No</th>
              <th>Description of expected equipment</th>
              <th>Qty (Nr)</th>
              <th>Qty available</th>
              <th>Class</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                <td className="px-2 py-2 text-sm">{index + 1}</td>
                <ReadOnlyCell value={row.description} />
                <ReadOnlyCell value={row.qtyExpected} />
                <ReadOnlyCell value={row.qtyAvailable} />
                <ReadOnlyCell value={row.equipmentClass ?? ''} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ReadOnlyPersonnelTable({
  title,
  rows,
}: {
  title: string
  rows: PersonnelRow[]
}) {
  return (
    <div className="nwrma-equipment-table-wrap">
      <h4 className="nwrma-equipment-table-title">{title}</h4>
      <div className="nwrma-table-scroll">
        <table className="nwrma-data-table w-full">
          <thead>
            <tr>
              <th>No</th>
              <th>Personnel</th>
              <th>Qty</th>
              <th>Qualification</th>
              <th>Yrs of Experience</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                <td className="px-2 py-2 text-sm">{index + 1}</td>
                <ReadOnlyCell value={row.role} />
                <ReadOnlyCell value={row.qty} />
                <ReadOnlyCell value={row.qualification} />
                <ReadOnlyCell value={row.yearsExperience} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ReadOnlyDirectorsTable({
  rows,
}: {
  rows: { fullName: string; citizenship: string }[]
}) {
  return (
    <div className="nwrma-table-scroll">
      <table className="nwrma-data-table w-full">
        <thead>
          <tr>
            <th>No</th>
            <th>Director full name</th>
            <th>Citizenship</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="px-2 py-2 text-sm">{index + 1}</td>
              <ReadOnlyCell value={row.fullName} />
              <ReadOnlyCell value={row.citizenship} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
