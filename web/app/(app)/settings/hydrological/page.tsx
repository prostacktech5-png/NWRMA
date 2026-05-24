import { redirect } from 'next/navigation'

/** Hydrological programme preferences live under the Hydrological workspace, not Settings tabs. */
export default function SettingsHydrologicalRedirectPage() {
  redirect('/hydrological/settings')
}
