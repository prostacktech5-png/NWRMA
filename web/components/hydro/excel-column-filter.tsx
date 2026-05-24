'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

export type ExcelFilterOption = { value: string; label: string }

/** Excel-style autofilter: search, (Select All), checkboxes, OK / Clear. */
export function ExcelColumnFilter({
  label,
  options,
  selected,
  onSelectedChange,
  className,
}: {
  label: string
  options: ExcelFilterOption[]
  selected: Set<string>
  onSelectedChange: (next: Set<string>) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Set<string>>(() => new Set(selected))

  const allValues = useMemo(() => options.map((o) => o.value), [options])

  const isActive =
    selected.size > 0 && selected.size < allValues.length && allValues.length > 0

  useEffect(() => {
    if (open) {
      setDraft(new Set(selected))
      setSearch('')
    }
  }, [open, selected])

  const visibleOptions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, search])

  const visibleValues = useMemo(() => visibleOptions.map((o) => o.value), [visibleOptions])

  const allVisibleSelected =
    visibleValues.length > 0 && visibleValues.every((v) => draft.has(v))
  const someVisibleSelected =
    visibleValues.some((v) => draft.has(v)) && !allVisibleSelected

  const toggleVisibleAll = () => {
    setDraft((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const v of visibleValues) next.delete(v)
      } else {
        for (const v of visibleValues) next.add(v)
      }
      return next
    })
  }

  const toggleOne = (value: string) => {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const apply = () => {
    onSelectedChange(new Set(draft))
    setOpen(false)
  }

  const clear = () => {
    const all = new Set(allValues)
    setDraft(all)
    onSelectedChange(all)
    setSearch('')
    setOpen(false)
  }

  const summary = isActive
    ? `${selected.size} of ${allValues.length}`
    : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 border-slate-300 bg-white px-2.5 font-normal text-slate-800 shadow-sm hover:bg-slate-50',
            isActive && 'border-sky-500 bg-sky-50/80 ring-1 ring-sky-200',
            className,
          )}
          aria-label={`Filter by ${label}`}
        >
          <span className="text-xs font-medium text-slate-600">{label}</span>
          {isActive ? (
            <Filter className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
          )}
          {summary ? (
            <span className="max-w-[5rem] truncate text-xs text-sky-700">{summary}</span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-64 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-slate-100 p-2">
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
            aria-label={`Search ${label}`}
          />
        </div>
        <div className="border-b border-slate-100 px-2 py-1.5">
          <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-slate-50">
            <Checkbox
              checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
              onCheckedChange={() => toggleVisibleAll()}
              aria-label="Select all"
            />
            <span className="font-medium text-slate-700">(Select All)</span>
          </label>
        </div>
        <ScrollArea className="h-[min(240px,40vh)]">
          <div className="px-2 py-1">
            {visibleOptions.length === 0 ? (
              <p className="px-1 py-3 text-center text-xs text-slate-500">No matches</p>
            ) : (
              visibleOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-2 rounded px-1 py-1.5 text-sm hover:bg-slate-50"
                  title={opt.label}
                >
                  <Checkbox
                    checked={draft.has(opt.value)}
                    onCheckedChange={() => toggleOne(opt.value)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1 leading-snug text-slate-800">{opt.label}</span>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 border-t border-slate-100 p-2">
          <Button type="button" size="sm" className="h-8 flex-1" onClick={apply}>
            OK
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-8 flex-1" onClick={clear}>
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function matchesExcelSet<T extends string>(
  value: T,
  selected: Set<T>,
  allValues: readonly T[],
): boolean {
  if (allValues.length === 0) return true
  if (selected.size === 0) return false
  if (selected.size >= allValues.length) return true
  return selected.has(value)
}
