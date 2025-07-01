import React, { useState } from 'react'
import { X, User, Mail, Building2, Calendar, Shield, LogOut, Phone, Users, Bug, Briefcase } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../lib/auth'

interface ProfileModalProps {
  onClose: () => void
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { profile, user, profileType } = useAuth()
  const [showDebug, setShowDebug] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // If no profile, show error
  if (!profile || !profileType) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="bg-red-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Not Found</h3>
            <p className="text-gray-600 mb-4">Unable to load your profile information.</p>
            
            <div className="bg-gray-100 p-3 rounded-lg mb-4 text-left">
              <p className="text-xs text-gray-600">
                <strong>Debug Info:</strong><br/>
                <strong>Has Profile:</strong> {profile ? 'Yes' : 'No'}<br/>
                <strong>Profile Type:</strong> {profileType || 'None'}<br/>
                <strong>User ID:</strong> {user?.id || 'None'}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="secondary" 
                onClick={() => window.location.reload()}
                size="sm"
              >
                Reload Page
              </Button>
              <Button 
                variant="ghost" 
                onClick={onClose}
                size="sm"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const userProfile = profile as any

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowDebug(!showDebug)}
                title="Debug"
              >
                <Bug className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Profile Avatar */}
          <div className="text-center">
            <div className="w-20 h-20 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-2xl font-medium">
                {profile.full_name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {profile.full_name}
            </h3>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
              profileType === 'admin' 
                ? 'bg-red-100 text-red-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {profileType === 'admin' ? 'Super Administrator' : 'User'}
            </span>
          </div>

          {/* Debug Info */}
          {showDebug && (
            <div className="bg-gray-100 p-3 rounded-lg text-xs">
              <p className="font-medium text-gray-800 mb-2">Debug Info</p>
              <pre className="whitespace-pre-wrap text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                {JSON.stringify({ profile, profileType, userId: user?.id }, null, 2)}
              </pre>
            </div>
          )}

          {/* Profile Information */}
          <div className="space-y-4">
            {/* Full Name */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <User className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Full Name</p>
                <p className="text-sm text-gray-600">{profile.full_name}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Mail className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-600">{profile.email}</p>
              </div>
            </div>

            {/* User-specific fields */}
            {profileType === 'user' && (
              <>
                {/* Organization */}
                {userProfile.enterprises && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Organization</p>
                      <p className="text-sm text-gray-600">{userProfile.enterprises.name}</p>
                    </div>
                  </div>
                )}

                {/* Role */}
                {userProfile.role && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Role</p>
                      <p className="text-sm text-gray-600 capitalize">
                        {userProfile.role.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Phone */}
                {userProfile.phone && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Phone</p>
                      <p className="text-sm text-gray-600">{userProfile.phone}</p>
                    </div>
                  </div>
                )}

                {/* Department */}
                {userProfile.departments && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Department</p>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: userProfile.departments.color }}
                        />
                        <span className="text-sm text-gray-600">
                          {userProfile.departments.name}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Admin role */}
            {profileType === 'admin' && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Shield className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Role</p>
                  <p className="text-sm text-gray-600">Super Administrator</p>
                </div>
              </div>
            )}

            {/* Member Since */}
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Member Since</p>
                <p className="text-sm text-gray-600">
                  {profile.created_at ? formatDate(profile.created_at) : 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-4 space-y-3">
            <Button
              variant="danger"
              className="w-full flex items-center justify-center space-x-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}