
import { GoalSummaryCard } from "@/components/goal-summary-card"
import { RewardsCard } from "@/components/rewards-card"
import { DailyTasksCard } from "@/components/daily-tasks-card"
import { NFTGallery } from "@/components/nft-gallery"
import { PlanList } from "@/components/plan"

interface SavingsDashboardProps {
  initialContext?: {
    targetAmount?: string
    goalDate?: string
    purpose?: string
    notes?: string
  } | null
}

export function SavingsDashboard({ initialContext }: SavingsDashboardProps) {
  return (
    <div className="space-y-6">
      <GoalSummaryCard initialContext={initialContext} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlanList initialContext={initialContext} />
        <RewardsCard />
      </div>
      <NFTGallery initialContext={initialContext} />
      <DailyTasksCard />
    </div>
  )
}
