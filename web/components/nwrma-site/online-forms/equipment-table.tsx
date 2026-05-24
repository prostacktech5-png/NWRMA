'use client'

import type { EquipmentRow } from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'

export function EquipmentTable({
  title,
  rows,
  onChange,
}: {
  title: string
  rows: EquipmentRow[]
  onChange: (rows: EquipmentRow[]) => void
}) {
  const update = (index: number, patch: Partial<EquipmentRow>) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  return (
    <div className="nwrma-equipment-table-wrap">
      <h4 className="nwrma-equipment-table-title">{title}</h4>
      <div className="nwrma-table-scroll">
        <table className="nwrma-data-table">
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
                <td>{index + 1}</td>
                <td>
                  <input
                    type="text"
                    className="nwrma-field-input"
                    value={row.description}
                    onChange={(e) => update(index, { description: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="nwrma-field-input nwrma-field-input--narrow"
                    value={row.qtyExpected}
                    onChange={(e) => update(index, { qtyExpected: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="nwrma-field-input nwrma-field-input--narrow"
                    value={row.qtyAvailable}
                    onChange={(e) => update(index, { qtyAvailable: e.target.value })}
                    placeholder="State"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="nwrma-field-input nwrma-field-input--narrow"
                    value={row.equipmentClass ?? ''}
                    onChange={(e) => update(index, { equipmentClass: e.target.value })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
