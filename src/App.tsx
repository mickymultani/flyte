import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { signOut, checkDomainWhitelist } from './lib/auth'
import { SuperAdminRegister } from './components/Auth/SuperAdminRegister'
import { SuperAdminLogin } from './components/Auth/SuperAdminLogin'
import { UserLogin } from './components/Auth/UserLogin'
import { UserRegister } from './components/Auth/UserRegister'
import { SuperAdminDashboard } from './components/Admin/SuperAdminDashboard'
import { ChatInterface } from './components/Chat/ChatInterface'
import { CompleteProfileModal } from './components/Auth/CompleteProfileModal'
import { ProfileDebug } from './components/Debug/ProfileDebug'

function AppContent() {
  const { user, profile, loading, initializing, setUserProfile, isSuperAdmin, isUser } = useAuth()
  const [profileError, setProfileError] = useState<string | null>(null)
  const [showCompleteProfile, setShowCompleteProfile] = useState(false)
  const [enterpriseInfo, setEnterpriseInfo] = useState<{ id: string; name: string } | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    const checkForIncompleteProfile = async () => {
      if (!user || profile || loading) return

      if (user.email) {
        const { data: domainData } = await checkDomainWhitelist(user.email)
        
        if (domainData) {
          setEnterpriseInfo({
            id: domainData.enterprise_id,
            name: domainData.enterprise_name
          })
          setShowCompleteProfile(true)
        } else {
          setProfileError('Your email domain is not whitelisted. Contact your administrator.')
        }
      }
    }

    checkForIncompleteProfile()
  }, [user, profile, loading])

  const handleProfileCompleted = (newProfile: any) => {
    setUserProfile(newProfile, 'user')
    setShowCompleteProfile(false)
    setEnterpriseInfo(null)
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Show debug tool if requested
  if (showDebug) {
    return <ProfileDebug />
  }

  // Show loading
  if (initializing || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">
            {initializing ? 'Initializing...' : 'Loading your profile...'}
          </p>
          <button
            onClick={() => setShowDebug(true)}
            className="mt-4 text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Show Debug Tool
          </button>
        </div>
      </div>
    )
  }

  // Show profile completion modal
  if (showCompleteProfile && user && enterpriseInfo) {
    return (
      <CompleteProfileModal
        user={user}
        enterpriseId={enterpriseInfo.id}
        enterpriseName={enterpriseInfo.name}
        onProfileCompleted={handleProfileCompleted}
      />
    )
  }

  // Show dashboard if authenticated with profile
  if (user && profile) {
    if (isSuperAdmin) {
      return <SuperAdminDashboard />
    }
    if (isUser) {
      return <ChatInterface />
    }
  }

  // Show error if profile failed to load
  if (user && profileError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Error</h1>
          <p className="text-red-600 mb-4">{profileError}</p>
          <div className="space-y-3">
            <button
              onClick={() => setShowDebug(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 mr-3"
            >
              Debug Tool
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
            >
              Reload Page
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 ml-3"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show login/register routes
  return (
    <Routes>
      <Route path="/admin/register" element={<SuperAdminRegister />} />
      <Route path="/admin/login" element={<SuperAdminLogin />} />
      <Route path="/user/register" element={<UserRegister />} />
      <Route path="/user/login" element={<UserLogin />} />
      <Route path="/register" element={<Navigate to="/admin/register" replace />} />
      <Route path="/login" element={<Navigate to="/user/login" replace />} />
      <Route path="/*" element={<Navigate to="/user/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}

export default App
