import * as React from 'react'
import { cn } from '../../lib/utils'

type ChartShellProps = React.HTMLAttributes<HTMLDivElement> & {
  heightClassName?: string
}

type TooltipPayload = {
  color?: string
  dataKey?: string
  name?: string
  value?: number | string | null
  payload?: Record<string, unknown>
}

type ChartTooltipContentProps = {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string | number
  labelFormatter?: (label: string | number) => string
  valueFormatter?: (value: number | string | null, item: TooltipPayload) => string
}

export const CHART_COLORS = {
  accent: 'var(--accent)',
  yellow: 'var(--yellow)',
  green: 'var(--green)',
  red: 'var(--red)',
  cyan: '#7dd3fc',
  violet: '#c084fc',
  slate: 'rgba(234,234,234,0.76)',
} as const

export const CHART_GRID = 'rgba(255,255,255,0.08)'
export const CHART_AXIS = 'rgba(234,234,234,0.68)'

export function ChartShell({ className, heightClassName = 'h-72', ...props }: ChartShellProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-3 sm:p-4',
        heightClassName,
        className
      )}
      {...props}
    />
  )
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="min-w-[180px] rounded-2xl border border-white/10 bg-[rgba(10,16,30,0.96)] px-3 py-2 shadow-[0_18px_38px_rgba(0,0,0,0.35)] backdrop-blur">
      {label !== undefined ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text2)]">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      ) : null}
      <div className="space-y-1.5">
        {payload.map(item => (
          <div key={`${item.dataKey ?? item.name ?? 'value'}-${item.value ?? 'na'}`} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex min-w-0 items-center gap-2 text-[var(--text)]">
              <span className="size-2 rounded-full" style={{ backgroundColor: item.color ?? CHART_COLORS.accent }} />
              <span className="truncate">{item.name ?? item.dataKey ?? 'Wert'}</span>
            </div>
            <span className="shrink-0 font-semibold text-[var(--text)]">
              {valueFormatter ? valueFormatter(item.value ?? null, item) : item.value ?? 'n/a'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
