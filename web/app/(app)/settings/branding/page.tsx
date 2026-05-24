'use client'

import { useEffect, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppBranding } from '@/components/app-branding-provider'
import { useSessionUser } from '@/components/demo-session-provider'
import { canManageOrgSettings } from '@/lib/settings-access-policy'
import { APP_BRANDING_MAX_LOGO_CHARS } from '@/lib/app-branding'
import { BrandingLogoPrimary } from '@/components/branding-logo'

export default function SettingsBrandingPage() {
  const { user } = useSessionUser()
  const { branding, setBranding, resetBranding } = useAppBranding()
  const [appName, setAppName] = useState(branding.appName)
  const [slogan, setSlogan] = useState(branding.slogan)
  const [signInDescription, setSignInDescription] = useState(branding.signInDescription)
  const [logoHint, setLogoHint] = useState<string | null>(null)

  useEffect(() => {
    setAppName(branding.appName)
    setSlogan(branding.slogan)
    setSignInDescription(branding.signInDescription)
  }, [branding.appName, branding.slogan, branding.signInDescription])

  const isAdmin = canManageOrgSettings(user)

  function handleLogoFile(file: File | undefined) {
    setLogoHint(null)
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoHint('Please choose an image file (PNG, JPG, or SVG).')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        setLogoHint('Could not read that file.')
        return
      }
      if (dataUrl.length > APP_BRANDING_MAX_LOGO_CHARS) {
        setLogoHint('Image is too large after encoding. Try a smaller file (under ~400KB).')
        return
      }
      setBranding({ logoDataUrl: dataUrl })
      setLogoHint(null)
    }
    reader.onerror = () => setLogoHint('Failed to read the file.')
    reader.readAsDataURL(file)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    setBranding({
      appName: appName.trim() || branding.appName,
      slogan: slogan.trim(),
      signInDescription: signInDescription.trim() || branding.signInDescription,
    })
    setLogoHint(null)
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>
          Only system administrators can change the organisation name, slogan, and logo.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Branding</h2>
        <p className="text-sm text-muted-foreground">
          Visible on the staff sidebar and sign-in screens. Stored in this browser until you connect
          a backend.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-4">
        <BrandingLogoPrimary branding={branding} />
        <div>
          <p className="font-semibold text-foreground">{branding.appName}</p>
          <p className="text-sm text-muted-foreground">{branding.slogan}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="h-4 w-4" />
            Organisation identity
          </CardTitle>
          <CardDescription>Name and slogan appear next to the logo across the ERP shell.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="brand-name">App / organisation short name</Label>
              <Input
                id="brand-name"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="NWRMA"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-slogan">Slogan / subtitle</Label>
              <Input
                id="brand-slogan"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                placeholder="Staff Portal"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-signin">Sign-in page description</Label>
              <Input
                id="brand-signin"
                value={signInDescription}
                onChange={(e) => setSignInDescription(e.target.value)}
                placeholder="Sign in to access the … management system"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-logo">Logo image</Label>
              <Input
                id="brand-logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="cursor-pointer"
                onChange={(e) => handleLogoFile(e.target.files?.[0])}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setBranding({ logoDataUrl: null })}>
                  Remove custom logo (use agency seal)
                </Button>
              </div>
              {logoHint && <p className="text-sm text-destructive">{logoHint}</p>}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit">Save branding</Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetBranding()
                  setLogoHint(null)
                }}
              >
                Reset all to defaults
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
