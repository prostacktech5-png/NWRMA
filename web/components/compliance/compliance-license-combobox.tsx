'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useSessionUser } from '@/components/demo-session-provider'
import { lookupLicenses, type LicenseLookupResult } from '@/lib/compliance-client'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (reference: string, result?: LicenseLookupResult) => void
  disabled?: boolean
}

export function ComplianceLicenseCombobox({ value, onChange, disabled }: Props) {
  const { actingUserHeaders } = useSessionUser()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LicenseLookupResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([])
        return
      }
      setLoading(true)
      void lookupLicenses(actingUserHeaders, query)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [query, actingUserHeaders])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {value || 'Link licence (optional)…'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search reference, organisation…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>{loading ? 'Searching…' : 'No licences found.'}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                No licence link
              </CommandItem>
              {results.map((r) => (
                <CommandItem
                  key={r.id}
                  value={r.reference}
                  onSelect={() => {
                    onChange(r.reference, r)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === r.reference ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="font-medium">{r.reference}</span>
                  <span className="text-muted-foreground ml-2 truncate">
                    {r.organisationName}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
