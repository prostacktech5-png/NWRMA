'use client'

import type { PersonnelRow } from '@/lib/nwrma-site/online-forms/water-drilling-licence-schema'

export function PersonnelTable({
  title,
  rows,
  onChange,
}: {
  title: string
  rows: PersonnelRow[]
  onChange: (rows: PersonnelRow[]) => void
}) {
  const update = (index: number, patch: Partial<PersonnelRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="nwrma-equipment-table-wrap">
      <h4 className="nwrma-equipment-table-title">{title}</h4>
      <div className="nwrma-table-scroll">
        <table className="nwrma-data-table">
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
                <td>{index + 1}</td>
                <td>
                  <input
                    type="text"
                    className="nwrma-field-input"
                    value={row.role}
                    onChange={(e) => update(index, { role: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="nwrma-field-input nwrma-field-input--narrow"
                    value={row.qty}
                    onChange={(e) => update(index, { qty: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="nwrma-field-input"
                    value={row.qualification}
                    onChange={(e) => update(index, { qualification: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="nwrma-field-input nwrma-field-input--narrow"
                    value={row.yearsExperience}
                    onChange={(e) => update(index, { yearsExperience: e.target.value })}
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
