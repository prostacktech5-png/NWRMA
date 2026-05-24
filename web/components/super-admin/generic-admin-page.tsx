'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { resolvedApiUrl } from '@/lib/apiBase'

export type AdminColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

export function GenericAdminPage<T extends { id: string }>({
  title,
  description,
  apiPath,
  columns,
  searchPlaceholder = 'Search…',
  toolbar,
  mapResponse,
}: {
  title: string
  description: string
  apiPath: string
  columns: AdminColumn<T>[]
  searchPlaceholder?: string
  toolbar?: ReactNode
  mapResponse?: (data: unknown) => T[]
}) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(resolvedApiUrl(apiPath), { credentials: 'include' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : `Failed to load (${res.status})`
        throw new Error(msg)
      }
      const list = mapResponse
        ? mapResponse(data)
        : Array.isArray(data)
          ? (data as T[])
          : data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)
            ? (data.items as T[])
            : []
      setItems(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiPath, mapResponse])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  const filtered = search.trim()
    ? items.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          <Button variant="outline" size="sm" onClick={() => void fetchItems()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{filtered.length} record(s)</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.key}>{c.header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => (
                    <TableRow key={row.id}>
                      {columns.map((c) => (
                        <TableCell key={c.key}>{c.render(row)}</TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
