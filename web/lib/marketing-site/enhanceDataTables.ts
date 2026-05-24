const PAGE_LENGTH_OPTIONS = [10, 11, 25, 30, 50, 100] as const

type TableState = {
  rows: HTMLTableRowElement[]
  pageLength: number
  page: number
  search: string
  sortCol: number | null
  sortDir: 'asc' | 'desc'
}

function rowHasContent(row: HTMLTableRowElement): boolean {
  return Array.from(row.querySelectorAll('td')).some((td) => td.textContent?.trim())
}

function rowSearchText(row: HTMLTableRowElement): string {
  return Array.from(row.cells)
    .map((c) => c.textContent ?? '')
    .join(' ')
    .toLowerCase()
}

function compareRows(a: HTMLTableRowElement, b: HTMLTableRowElement, col: number, dir: 'asc' | 'desc'): number {
  const av = (a.cells[col]?.textContent ?? '').trim().toLowerCase()
  const bv = (b.cells[col]?.textContent ?? '').trim().toLowerCase()
  const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
  return dir === 'asc' ? cmp : -cmp
}

function renderTable(table: HTMLTableElement, state: TableState, toolbar: HTMLElement, footer: HTMLElement) {
  const thead = table.tHead
  const tbody = table.tBodies[0]
  if (!tbody) return

  let filtered = state.rows
  if (state.search) {
    const q = state.search.toLowerCase()
    filtered = filtered.filter((row) => rowSearchText(row).includes(q))
  }

  if (state.sortCol !== null) {
    filtered = [...filtered].sort((a, b) => compareRows(a, b, state.sortCol!, state.sortDir))
  }

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / state.pageLength))
  const page = Math.min(state.page, totalPages - 1)
  const start = page * state.pageLength
  const end = Math.min(start + state.pageLength, total)
  const pageRows = filtered.slice(start, end)

  tbody.replaceChildren(...pageRows)

  const info = footer.querySelector('.data-table__info')
  if (info) {
    info.textContent =
      total === 0
        ? 'Showing 0 to 0 of 0 entries'
        : `Showing ${start + 1} to ${end} of ${total} entries`
  }

  const prev = footer.querySelector<HTMLButtonElement>('.data-table__prev')
  const next = footer.querySelector<HTMLButtonElement>('.data-table__next')
  if (prev) {
    prev.disabled = page <= 0
    prev.classList.toggle('disabled', page <= 0)
  }
  if (next) {
    next.disabled = page >= totalPages - 1
    next.classList.toggle('disabled', page >= totalPages - 1)
  }

  if (thead) {
    thead.querySelectorAll('th').forEach((th, i) => {
      th.classList.remove('sorting_asc', 'sorting_desc', 'sorting')
      if (state.sortCol === i) {
        th.classList.add(state.sortDir === 'asc' ? 'sorting_asc' : 'sorting_desc')
      } else {
        th.classList.add('sorting')
      }
    })
  }

  const lengthSelect = toolbar.querySelector<HTMLSelectElement>('.data-table__length')
  if (lengthSelect && lengthSelect.value !== String(state.pageLength)) {
    lengthSelect.value = String(state.pageLength)
  }
}

function createToolbar(tableId: string, defaultLength: number): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'data-table__toolbar'
  wrap.innerHTML = `
    <label class="data-table__length-wrap">
      Show
      <select class="data-table__length" aria-controls="${tableId}">
        ${PAGE_LENGTH_OPTIONS.map((n) => `<option value="${n}"${n === defaultLength ? ' selected' : ''}>${n}</option>`).join('')}
      </select>
      entries
    </label>
    <label class="data-table__search-wrap">
      Search:
      <input type="search" class="data-table__search" aria-controls="${tableId}" />
    </label>
  `
  return wrap
}

function createFooter(): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'data-table__footer'
  wrap.innerHTML = `
    <div class="data-table__info"></div>
    <div class="data-table__paginate">
      <button type="button" class="data-table__prev">Previous</button>
      <button type="button" class="data-table__next">Next</button>
    </div>
  `
  return wrap
}

function defaultPageLength(table: HTMLTableElement): number {
  const id = table.id ?? ''
  if (id === 'tablepress-9') return 30
  return 11
}

export type DataTableCleanup = () => void

/** Wrap each TablePress table with search, sort, and pagination controls (DataTables-style). */
export function enhanceDataTables(root: HTMLElement): DataTableCleanup[] {
  const cleanups: DataTableCleanup[] = []

  root.querySelectorAll<HTMLTableElement>('table.tablepress').forEach((table) => {
    const tbody = table.tBodies[0]
    if (!tbody) return

    const rows = Array.from(tbody.querySelectorAll('tr')).filter(rowHasContent)
    if (rows.length === 0) return

    const tableId = table.id || `table-${Math.random().toString(36).slice(2, 9)}`
    if (!table.id) table.id = tableId

    const state: TableState = {
      rows,
      pageLength: defaultPageLength(table),
      page: 0,
      search: '',
      sortCol: null,
      sortDir: 'asc',
    }

    const block = document.createElement('div')
    block.className = 'data-table__block'
    table.parentNode?.insertBefore(block, table)
    block.appendChild(table)

    const toolbar = createToolbar(tableId, state.pageLength)
    const footer = createFooter()
    block.insertBefore(toolbar, table)
    block.appendChild(footer)

    const render = () => renderTable(table, state, toolbar, footer)
    render()

    const onSearch = (e: Event) => {
      state.search = (e.target as HTMLInputElement).value
      state.page = 0
      render()
    }
    const onLength = (e: Event) => {
      state.pageLength = Number((e.target as HTMLSelectElement).value) || 11
      state.page = 0
      render()
    }
    const onPrev = () => {
      if (state.page > 0) {
        state.page -= 1
        render()
      }
    }
    const onNext = () => {
      const totalPages = Math.ceil(
        (state.search
          ? state.rows.filter((r) => rowSearchText(r).includes(state.search.toLowerCase()))
          : state.rows
        ).length / state.pageLength,
      )
      if (state.page < totalPages - 1) {
        state.page += 1
        render()
      }
    }

    const searchInput = toolbar.querySelector<HTMLInputElement>('.data-table__search')!
    const lengthSelect = toolbar.querySelector<HTMLSelectElement>('.data-table__length')!
    const prevBtn = footer.querySelector<HTMLButtonElement>('.data-table__prev')!
    const nextBtn = footer.querySelector<HTMLButtonElement>('.data-table__next')!

    searchInput.addEventListener('input', onSearch)
    lengthSelect.addEventListener('change', onLength)
    prevBtn.addEventListener('click', onPrev)
    nextBtn.addEventListener('click', onNext)

    const sortHandlers: Array<{ th: HTMLTableCellElement; fn: () => void }> = []
    table.tHead?.querySelectorAll('th').forEach((th, colIndex) => {
      th.classList.add('sorting')
      const fn = () => {
        if (state.sortCol === colIndex) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc'
        } else {
          state.sortCol = colIndex
          state.sortDir = 'asc'
        }
        render()
      }
      th.addEventListener('click', fn)
      sortHandlers.push({ th, fn })
    })

    cleanups.push(() => {
      searchInput.removeEventListener('input', onSearch)
      lengthSelect.removeEventListener('change', onLength)
      prevBtn.removeEventListener('click', onPrev)
      nextBtn.removeEventListener('click', onNext)
      sortHandlers.forEach(({ th, fn }) => th.removeEventListener('click', fn))
      const parent = block.parentNode
      if (parent) {
        parent.insertBefore(table, block)
        block.remove()
      }
    })
  })

  return cleanups
}
