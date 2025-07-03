import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { UserRegister } from './components/Auth/UserRegister'
import { UserLogin } from './components/Auth/UserLogin'
import { ChatInterface } from './components/Chat/ChatInterface'

function AppContent() {
  const { user, profile, loading, initializing } = useAuth()

  useEffect(() => {
    const checkForIncompleteProfile = async () => {
      if (!user || profile || loading) return

      console.log('User authenticated, proceeding to chat interface')
    }

    checkForIncompleteProfile()
  }, [user, profile, loading])


  // Show loading
  if (initializing || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">
            {initializing ? 'Initializing...' : 'Loading your profile...'}
          </p>
        </div>
      </div>
    )
  }

  if (user && !profile && !loading) {
    console.log('🔄 User authenticated but no profile found - may need profile creation flow')
    return <ChatInterface />
  }

  if (user) {
    return <ChatInterface />
  }


  return (
    <Routes>
      <Route path="/user/register" element={<UserRegister />} />
      <Route path="/user/login" element={<UserLogin />} />
      <Route path="/register" element={<Navigate to="/user/register" replace />} />
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
