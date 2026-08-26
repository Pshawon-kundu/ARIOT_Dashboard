import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { AppSidebar } from './components/layout/AppSidebar'
import { GlobalHeader } from './components/layout/GlobalHeader'
import { ToastContainer } from './components/ui/Toast'
import { AppSplashScreen } from './components/startup/AppSplashScreen'
import { CleaningTaskModal } from './components/cleaning/CleaningTaskModal'
import { OverviewPage } from './pages/OverviewPage'
import { RobotsPage } from './pages/RobotsPage'
import { RobotDetailPage } from './pages/RobotDetailPage'
import { MapSetupPage } from './pages/MapSetupPage'
import { CleaningPage } from './pages/CleaningPage'
import { ReportsPage } from './pages/ReportsPage'
import { AlertsPage } from './pages/AlertsPage'

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-app">
        <AppSidebar />
        <div className="ml-[224px] flex min-h-screen flex-col">
          <GlobalHeader />
          <main className="flex-1 px-7 py-7">
            <div className="mx-auto w-full max-w-[1240px]">
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/robots" element={<RobotsPage />} />
                <Route path="/robots/:id" element={<RobotDetailPage />} />
                <Route path="/robots/:id/map-setup" element={<MapSetupPage />} />
                <Route path="/cleaning" element={<CleaningPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
        <CleaningTaskModal />
        <ToastContainer />
        <AppSplashScreen />
      </div>
    </AppProvider>
  )
}
