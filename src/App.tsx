import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { AppSidebar } from './components/layout/AppSidebar'
import { GlobalHeader } from './components/layout/GlobalHeader'
import { ToastContainer } from './components/ui/Toast'
import { AppSplashScreen } from './components/startup/AppSplashScreen'
import { StartCleaningModal } from './components/cleaning/StartCleaningModal'
import { OverviewPage } from './pages/OverviewPage'
import { RobotsPage } from './pages/RobotsPage'
import { RobotDetailPage } from './pages/RobotDetailPage'

import { CleaningPage } from './pages/CleaningPage'
import { ReportsPage } from './pages/ReportsPage'
import { AlertsPage } from './pages/AlertsPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { AccountPage } from './pages/AccountPage'
import { isLoggedIn, setOnAuthError } from './services/api'

function AppInner() {
  const { startCleaningModalOpen, startCleaningModalRobotId, closeStartCleaningModal, robots } = useApp()
  const startRobot = robots.find((r) => r.id === startCleaningModalRobotId) ?? null
  return (
    <>
      <StartCleaningModal
        open={startCleaningModalOpen}
        onClose={closeStartCleaningModal}
        robot={startRobot}
        status={startRobot?.status}
      />
    </>
  )
}

function AuthenticatedApp() {
  const { currentUser, profileLoading, signOut } = useApp()

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app text-sm text-ink-secondary">
        Loading your account...
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app text-center">
        <p className="font-semibold text-ink">Unable to load your account profile.</p>
        <button type="button" onClick={signOut} className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink-secondary hover:bg-app">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    )
  }

  return (
    <>
      <AppInner />
      <div className="min-h-screen bg-app">
        <AppSidebar />
        <div className="ml-[224px] flex min-h-screen flex-col">
          <GlobalHeader />
          <main className="flex-1 px-7 py-7">
            <div className="mx-auto w-full max-w-[1560px]">
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/robots" element={<RobotsPage />} />
                <Route path="/robots/:id" element={<RobotDetailPage />} />
                <Route path="/cleaning" element={<CleaningPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/register" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
        <ToastContainer />
        <AppSplashScreen />
      </div>
    </>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(() => isLoggedIn())

  useEffect(() => {
    setOnAuthError(() => setAuthed(false))
    return () => setOnAuthError(null)
  }, [])

  if (!authed) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={() => setAuthed(true)} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <AppProvider onLogout={() => setAuthed(false)}>
      <AuthenticatedApp />
    </AppProvider>
  )
}
