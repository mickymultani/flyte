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
  const { profile, user, profileType, loading } = useAuth()
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
            <p className="text-sm text-gray-600">Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If no profile, show helpful message instead of error
  if (!profile && user) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-3">Profile Setup Required</h3>
            <p className="text-sm text-gray-600 mb-4">
              Your account exists but needs a profile to be created. Please contact your administrator.
            </p>
            <div className="space-y-3">
              <Button onClick={handleLogout} variant="secondary" className="w-full">
                Sign Out
              </Button>
              <Button
                onClick={() => setShowDebug(!showDebug)}
                variant="ghost"
                size="sm"
                className="w-full text-xs"
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </Button>
            </div>

            {showDebug && (
              <div className="mt-4 p-3 bg-gray-50 rounded text-left text-xs">
                <div><strong>User ID:</strong> {user?.id || 'None'}</div>
                <div><strong>Email:</strong> {user?.email || 'None'}</div>
                <div><strong>Has Profile:</strong> {profile ? 'Yes' : 'No'}</div>
                <div><strong>Profile Type:</strong> {profileType || 'None'}</div>
                <div><strong>User Metadata:</strong> {JSON.stringify(user?.user_metadata || {}, null, 2)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!profile) {
    return null
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
