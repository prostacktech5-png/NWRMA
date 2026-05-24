import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function HrModulePlaceholder({
  title,
  description,
  features,
}: {
  title: string
  description: string
  features: string[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <Card className="border-dashed border-primary/30 bg-muted/20">
        <CardHeader>
          <CardTitle>Coming in Phase 2</CardTitle>
          <CardDescription>
            This module is planned as part of the HR &amp; Admin workflow expansion. The MVP hub,
            staff records, assets, and leave are live now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
