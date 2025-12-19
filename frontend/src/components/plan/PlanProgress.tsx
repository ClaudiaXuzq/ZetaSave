// Progress bar component with milestone markers

import { cn } from '@/lib/utils'
import { CheckCircle, Circle } from 'lucide-react'

interface PlanProgressProps {
  progress: number // 0-100
  milestones: {
    fifty: boolean
    hundred: boolean
  }
  className?: string
}

export function PlanProgress({ progress, milestones, className }: PlanProgressProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Progress bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />

        {/* 50% milestone marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-border"
          style={{ left: '50%' }}
        />

        {/* 100% marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-border right-0"
        />
      </div>

      {/* Milestone indicators */}
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">0%</span>

        {/* 50% milestone */}
        <div className="flex items-center gap-1">
          {milestones.fifty ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          ) : progress >= 50 ? (
            <Circle className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className={cn(
            milestones.fifty ? 'text-emerald-500' : progress >= 50 ? 'text-amber-500' : 'text-muted-foreground'
          )}>
            50%
          </span>
        </div>

        {/* 100% milestone */}
        <div className="flex items-center gap-1">
          {milestones.hundred ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          ) : progress >= 100 ? (
            <Circle className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className={cn(
            milestones.hundred ? 'text-emerald-500' : progress >= 100 ? 'text-amber-500' : 'text-muted-foreground'
          )}>
            100%
          </span>
        </div>
      </div>
    </div>
  )
}
