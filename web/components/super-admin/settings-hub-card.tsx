import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type SettingsHubCardTint = 'blue' | 'violet' | 'green' | 'orange'

const tintStyles: Record<
  SettingsHubCardTint,
  { iconBg: string; iconColor: string }
> = {
  blue: {
    iconBg: 'bg-sky-100 dark:bg-sky-950/50',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  violet: {
    iconBg: 'bg-violet-100 dark:bg-violet-950/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  green: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  orange: {
    iconBg: 'bg-orange-100 dark:bg-orange-950/50',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
}

type SettingsHubCardProps = {
  href: string
  title: string
  description: string
  icon: LucideIcon
  tint: SettingsHubCardTint
}

export function SettingsHubCard({
  href,
  title,
  description,
  icon: Icon,
  tint,
}: SettingsHubCardProps) {
  const styles = tintStyles[tint]

  return (
    <Link href={href} className="group block h-full">
      <Card
        className={cn(
          'h-full transition-shadow hover:shadow-md',
          'border-border/80 hover:border-border',
        )}
      >
        <CardContent className="flex items-center gap-4 p-5 sm:p-6">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
              styles.iconBg,
            )}
          >
            <Icon className={cn('h-6 w-6', styles.iconColor)} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </CardContent>
      </Card>
    </Link>
  )
}
