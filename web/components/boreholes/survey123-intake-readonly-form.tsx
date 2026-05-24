'use client'

import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Survey123BoreholeIntake } from '@/lib/types'

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value?.trim() ? value : '—'}</p>
    </div>
  )
}

export function Survey123IntakeReadonlyForm({ intake }: { intake: Survey123BoreholeIntake }) {
  const companyDisplay =
    intake.matchedCompanyName ?? intake.drillingCompanyName ?? '—'
  const companyWarning =
    Boolean(intake.drillingCompanyName) &&
    !intake.drillingCompanyId &&
    intake.status === 'received'

  const wq =
    intake.waterQualityPhysical && Object.keys(intake.waterQualityPhysical).length > 0
      ? JSON.stringify(intake.waterQualityPhysical, null, 2)
      : null

  return (
    <div className="space-y-4">
      {!intake.mappingComplete && intake.status === 'received' ? (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Administrative mapping or licensed company match is incomplete. Approval is blocked
            until Survey123 data resolves to region, district, chiefdom, settlement, and an
            active licensed company.
          </span>
        </div>
      ) : null}

      {companyWarning ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Survey123 company &quot;{intake.drillingCompanyName}&quot; did not match an active
            licensed drilling company in the registry.
          </span>
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Drilling company & location</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Licensed drilling company" value={companyDisplay} />
          <Field label="Survey123 company name" value={intake.drillingCompanyName} />
          <Field label="Location" value={intake.locationDescription} />
          <Field
            label="Coordinates"
            value={
              intake.lat != null && intake.lng != null
                ? `${intake.lat}, ${intake.lng}`
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Administrative location (for borehole ID)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Region" value={intake.regionLabel ?? intake.regionName} />
          <Field label="District" value={intake.districtLabel ?? intake.districtName} />
          <Field label="Chiefdom" value={intake.chiefdomLabel ?? intake.chiefdomName} />
          <Field label="Settlement type" value={intake.settlementLabel ?? intake.settlementType} />
          <div className="sm:col-span-2 rounded-md bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">ID preview (serial assigned on approve)</p>
            <p className="mt-1 font-mono text-sm font-semibold">
              {intake.registeredBoreholeCode ?? intake.idPreview ?? '—'}
            </p>
            <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
              <li>First segment = regional code</li>
              <li>Second = district code (2 digits)</li>
              <li>Third = chiefdom code (3 letters)</li>
              <li>Fourth = settlement code (R / U / P)</li>
              <li>Last four digits = borehole number (on approve only)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Drilling & hydrogeology</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Drilling method" value={intake.drillingMethod} />
          <Field
            label="Borehole depth (m)"
            value={intake.boreholeDepthM != null ? String(intake.boreholeDepthM) : null}
          />
          <Field
            label="Depth of overburden (m)"
            value={intake.overburdenDepthM != null ? String(intake.overburdenDepthM) : null}
          />
          <Field
            label="Depth to water strikes (m)"
            value={
              intake.waterStrikeDepthsM?.length
                ? intake.waterStrikeDepthsM.join(', ')
                : null
            }
          />
          <Field label="Permanent casing type" value={intake.permanentCasingType} />
          <Field
            label="Yield (L/s)"
            value={intake.yieldLps != null ? String(intake.yieldLps) : null}
          />
          <Field
            label="Transmissivity"
            value={intake.transmissivity != null ? String(intake.transmissivity) : null}
          />
          <Field
            label="Hydraulic conductivity"
            value={
              intake.hydraulicConductivity != null
                ? String(intake.hydraulicConductivity)
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Physical water quality</CardTitle>
        </CardHeader>
        <CardContent>
          {wq ? (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">{wq}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
