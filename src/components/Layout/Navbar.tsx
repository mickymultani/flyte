import React, { useState } from 'react'
import { Plane, LogOut, Settings, Building2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../lib/auth'

interface NavbarProps {
  onNavigate?: (section: string) => void
  currentSection?: string
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, currentSection }) => {
  const { profile, isSuperAdmin } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    if (signingOut) return // Prevent double-clicks
    
    setSigningOut(true)
    
    try {
      console.log('🚪 User clicked sign out')
      const { error } = await signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        // Don't throw - let the auth state change handle the redirect
      }
      
      // The useAuth hook will detect the auth state change and handle the redirect
      // No need to manually redirect here
    } catch (error) {
      console.error('Exception during sign out:', error)
      // If there's an exception, force reload as fallback
      window.location.href = '/login'
    }
    
    // Note: We don't set signingOut back to false because the component will unmount
  }

  const navItems = [
    ...(isSuperAdmin ? [
      { id: 'enterprises', label: 'Enterprises', icon: Building2 },
      { id: 'settings', label: 'Settings', icon: Settings }
    ] : [])
  ]

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="bg-primary-600 p-2 rounded-lg shadow-sm">
              <Plane className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Flyte</h1>
              <p className="text-xs text-gray-500">Airport Operations Platform</p>
            </div>
          </div>

          {/* Navigation */}
          {isSuperAdmin && onNavigate && (
            <div className="flex items-center space-x-1">
              {navItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentSection === item.id ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => onNavigate(item.id)}
                  className="flex items-center space-x-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              ))}
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-500">Super Administrator</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              {signingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}