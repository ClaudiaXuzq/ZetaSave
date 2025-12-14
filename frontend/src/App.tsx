import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import StartingPage from '@/pages/StartingPage'
import WalletPage from '@/pages/WalletPage'
import DashboardPage from '@/pages/DashboardPage'

function App() {
  return (
    <ThemeProvider defaultTheme="system" enableSystem>
      <Routes>
        <Route path="/" element={<StartingPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App

