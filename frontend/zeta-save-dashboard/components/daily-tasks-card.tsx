"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ListTodo, Coins, Repeat, Share2, BookOpen } from "lucide-react"

interface Task {
  id: string
  label: string
  points: number
  icon: typeof Coins
  completed: boolean
}

const initialTasks: Task[] = [
  { id: "1", label: "Make a deposit today", points: 50, icon: Coins, completed: true },
  { id: "2", label: "Complete a cross-chain swap", points: 100, icon: Repeat, completed: false },
  { id: "3", label: "Invite a friend to ZetaSave", points: 200, icon: Share2, completed: false },
  { id: "4", label: "Read today's savings tip", points: 25, icon: BookOpen, completed: true },
]

export function DailyTasksCard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  const toggleTask = (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)))
  }

  const completedCount = tasks.filter((t) => t.completed).length
  const totalPoints = tasks.filter((t) => t.completed).reduce((sum, t) => sum + t.points, 0)

  return (
    <Card className="p-6 shadow-sm border-border/50 rounded-2xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">Daily Tasks</h2>
          <p className="text-sm text-muted-foreground">Complete tasks to earn bonus points</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Today's Progress</p>
            <p className="font-semibold text-foreground">
              {completedCount}/{tasks.length} completed
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
            <ListTodo className="w-5 h-5 text-accent-foreground" />
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
              task.completed
                ? "bg-secondary/30 border-secondary-foreground/20"
                : "bg-card border-border/50 hover:border-primary/30"
            }`}
            onClick={() => toggleTask(task.id)}
          >
            <Checkbox
              checked={task.completed}
              onCheckedChange={() => toggleTask(task.id)}
              className="data-[state=checked]:bg-secondary-foreground data-[state=checked]:border-secondary-foreground"
            />
            <task.icon
              className={`w-4 h-4 ${task.completed ? "text-secondary-foreground" : "text-muted-foreground"}`}
            />
            <span
              className={`flex-1 text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
            >
              {task.label}
            </span>
            <span className={`text-sm font-medium ${task.completed ? "text-secondary-foreground" : "text-accent"}`}>
              +{task.points} pts
            </span>
          </div>
        ))}
      </div>

      {/* Points Earned */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
        <span className="text-sm text-muted-foreground">Points earned today</span>
        <span className="text-lg font-bold text-foreground">🎁 {totalPoints} pts</span>
      </div>
    </Card>
  )
}
