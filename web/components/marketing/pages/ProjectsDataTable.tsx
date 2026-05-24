'use client'

import { useMemo, useState } from 'react'
import type { ParsedProjectTable, ProjectTableRow } from '@/lib/marketing-site/parse-project-table'

const PAGE_SIZES = [10, 25, 50, 100] as const

type SortDir = 'asc' | 'desc'

function rowHasContent(row: ProjectTableRow): boolean {
  return row.cells.some((c) => c.text.length > 0)
}

function compareRows(a: ProjectTableRow, b: ProjectTableRow, col: number, dir: SortDir): number {
  const av = a.cells[col]?.text ?? ''
  const bv = b.cells[col]?.text ?? ''
  const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? cmp : -cmp
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="project-table__sort" aria-hidden>
      <i
        className={`fas fa-caret-up ${active && dir === 'asc' ? 'project-table__sort--on' : 'project-table__sort--dim'}`}
      />
      <i
        className={`fas fa-caret-down ${active && dir === 'desc' ? 'project-table__sort--on' : 'project-table__sort--dim'}`}
      />
    </span>
  )
}

export function ProjectsDataTable({ bannerTitle, columns, rows }: ParsedProjectTable) {
  const [pageSize, setPageSize] = useState<number>(10)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = rows
    if (q) {
      list = rows.filter((row) => row.cells.some((c) => c.text.toLowerCase().includes(q)))
    }
    if (sortCol !== null) {
      list = [...list].sort((a, b) => compareRows(a, b, sortCol, sortDir))
    }
    return list
  }, [rows, search, sortCol, sortDir])

  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount - 1)
  const start = total === 0 ? 0 : safePage * pageSize + 1
  const end = Math.min(total, (safePage + 1) * pageSize)
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)

  const toggleSort = (index: number) => {
    if (sortCol === index) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(index)
      setSortDir('asc')
    }
    setPage(0)
  }

  const showEmptyPlaceholder = rows.length > 0 && !rows.some(rowHasContent) && !search

  return (
    <div className="project-table">
      <h2 className="project-table__banner">{bannerTitle}</h2>

      <div className="project-table__toolbar">
        <label className="project-table__length">
          Show{' '}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(0)
            }}
            aria-label="Entries per page"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>{' '}
          entries
        </label>
        <label className="project-table__search">
          Search:{' '}
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            aria-label="Search table"
          />
        </label>
      </div>

      <div className="project-table__scroll">
        <table className="project-table__grid">
          <thead>
            <tr>
              {columns.map((col, i) => (
                <th key={col + i} scope="col">
                  <button
                    type="button"
                    className="project-table__th-btn"
                    onClick={() => toggleSort(i)}
                  >
                    {col}
                    <SortIcon active={sortCol === i} dir={sortDir} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length || 1} className="project-table__no-data">
                  {search ? 'No matching entries.' : 'No entries listed at this time.'}
                </td>
              </tr>
            ) : (
              pageRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'project-table__row--even' : 'project-table__row--odd'}>
                  {columns.map((_, ci) => {
                    const cell = row.cells[ci]
                    const html = cell?.html ?? ''
                    const text = cell?.text ?? ''
                    return (
                      <td key={ci}>
                        {html && text ? (
                          <span dangerouslySetInnerHTML={{ __html: html }} />
                        ) : (
                          '\u00a0'
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="project-table__footer">
        <p className="project-table__info">
          Showing {total === 0 ? 0 : start} to {end} of {total} entries
          {showEmptyPlaceholder ? ' (awaiting project documents)' : ''}
        </p>
        <nav className="project-table__pager" aria-label="Table pagination">
          <button
            type="button"
            className="project-table__pager-btn"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="project-table__pager-btn"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Next
          </button>
        </nav>
      </div>
    </div>
  )
}
