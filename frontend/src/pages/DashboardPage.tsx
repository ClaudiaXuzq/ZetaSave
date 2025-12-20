import { useLocation } from "react-router-dom"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function DashboardPage() {
  const location = useLocation()
  const initialContext = location.state?.initialContext || null

  return <DashboardLayout initialContext={initialContext} />
}

