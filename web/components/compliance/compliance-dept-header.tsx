import { Badge } from '@/components/ui/badge'

type Props = {
  title: string
  subtitle: string
  unit?: string
}

export function ComplianceDeptHeader({ title, subtitle, unit }: Props) {
  return (
    <div>
      {unit ? (
        <Badge variant="secondary" className="mb-2">
          {unit}
        </Badge>
      ) : null}
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">{subtitle}</p>
    </div>
  )
}
