'use client'

import { Sliders } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useTheme } from '@/components/theme-provider'

function AppearanceSection() {
  const { setTheme, resolvedTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  return (
    <section className="bg-card space-y-6 rounded-xl border p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sliders className="text-muted-foreground h-5 w-5" aria-hidden />
          Appearance
        </h2>
      </div>
      <div className="border-border bg-muted/30 flex flex-col gap-4 rounded-lg border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Label htmlFor="dark-mode">Dark mode</Label>
          <p id="dark-mode-desc" className="text-muted-foreground text-sm">
            Use a darker palette for the main workspace and forms.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-muted-foreground text-sm">{dark ? 'On' : 'Off'}</span>
          <Switch
            id="dark-mode"
            checked={dark}
            onCheckedChange={(on) => setTheme(on ? 'dark' : 'light')}
            aria-describedby="dark-mode-desc"
            data-testid="toggle-dark-mode"
          />
        </div>
      </div>
    </section>
  )
}

export function HydrologicalSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hydrological settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Display preferences for the Hydrological workspace.
        </p>
      </div>

      <div className="space-y-6">
        <AppearanceSection />
      </div>
    </div>
  )
}
