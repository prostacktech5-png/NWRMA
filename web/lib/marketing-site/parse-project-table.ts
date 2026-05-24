export type ProjectTableCell = {
  html: string
  text: string
}

export type ProjectTableRow = {
  cells: ProjectTableCell[]
}

export type ParsedProjectTable = {
  bannerTitle: string
  columns: string[]
  rows: ProjectTableRow[]
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCellHtml(html: string): string {
  let out = html.trim()
  out = out.replace(/href="\/\/assets\/uploads\//g, 'href="/assets/uploads/')
  out = out.replace(/https?:\/\/(?:www\.)?nwrma\.gov\.sl\/+\/assets\/uploads\//g, '/assets/uploads/')
  out = out.replace(/https?:\/\/(?:www\.)?nwrma\.gov\.sl\/wp-content\/uploads\//g, '/assets/uploads/')
  return out
}

export function parseProjectTableHtml(html: string): ParsedProjectTable {
  const bannerMatch = html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)
  const bannerTitle = bannerMatch ? stripTags(bannerMatch[1]) : 'Projects'

  const columns: string[] = []
  const theadBlock = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)?.[1]
  if (theadBlock) {
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi
    let m: RegExpExecArray | null
    while ((m = thRe.exec(theadBlock))) {
      columns.push(stripTags(m[1]))
    }
  }

  const rows: ProjectTableRow[] = []
  const tbodyBlock = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]
  if (tbodyBlock) {
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    let tr: RegExpExecArray | null
    while ((tr = trRe.exec(tbodyBlock))) {
      const cells: ProjectTableCell[] = []
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let td: RegExpExecArray | null
      while ((td = tdRe.exec(tr[1]))) {
        const cellHtml = normalizeCellHtml(td[1])
        cells.push({ html: cellHtml, text: stripTags(cellHtml) })
      }
      if (cells.length > 0) rows.push({ cells })
    }
  }

  return { bannerTitle, columns, rows }
}
