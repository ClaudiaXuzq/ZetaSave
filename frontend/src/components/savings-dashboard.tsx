
import { GoalSummaryCard } from "@/components/goal-summary-card"
import { ProgressCard } from "@/components/progress-card"
import { RewardsCard } from "@/components/rewards-card"
import { DailyTasksCard } from "@/components/daily-tasks-card"
import { NFTGallery } from "@/components/nft-gallery"

export function SavingsDashboard() {
  return (
    <div className="space-y-6">
      <GoalSummaryCard />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressCard />
        <RewardsCard />
      </div>
      <NFTGallery />
      <DailyTasksCard />
    </div>
  )
}
