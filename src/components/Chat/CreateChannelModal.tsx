import React, { useState } from 'react'
import { X, Hash, Lock, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface CreateChannelModalProps {
  onClose: () => void
  onChannelCreated: () => void
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  onClose,
  onChannelCreated
}) => {
  const { user, profile, profileType, refreshSession } = useAuth()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'public' as 'public' | 'private'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefreshSession = async () => {
    setRefreshing(true)
    setError('')
    
    try {
      const success = await refreshSession()
      if (success) {
        // Wait a moment for the auth state to update
        setTimeout(() => {
          setRefreshing(false)
          // Try the operation again if we have valid auth now
          if (user && profile) {
            setError('')
          }
        }, 1000)
      } else {
        setRefreshing(false)
        setError('Failed to refresh session. Please sign in again.')
      }
    } catch (error) {
      setRefreshing(false)
      setError('Failed to refresh session. Please sign in again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Channel name is required')
      return
    }

    // Debug current auth state
    console.log('🔍 Auth state check:', {
      hasUser: !!user,
      hasProfile: !!profile,
      profileType,
      userId: user?.id,
      userEmail: user?.email,
      profileData: profile
    })

    // Check authentication state
    if (!user || !profile) {
      console.error('❌ Missing auth data:', { user: !!user, profile: !!profile })
      setError('Authentication required. Please refresh your session.')
      return
    }

    if (profileType !== 'user') {
      console.error('❌ Wrong profile type:', profileType)
      setError('Only regular users can create channels.')
      return
    }

    const enterpriseId = (profile as any).enterprise_id
    console.log('🏢 Enterprise ID:', enterpriseId)
    
    if (!enterpriseId) {
      console.error('❌ No enterprise ID found in profile:', profile)
      setError('Enterprise information not found. Please contact support.')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('🔄 Creating channel...')

      // Verify session is still valid before proceeding
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        console.error('❌ Session validation failed:', sessionError)
        throw new Error('Your session has expired. Please refresh and try again.')
      }

      console.log('✅ Session is valid, proceeding with channel creation')

      // Create the channel
      const channelData = {
        enterprise_id: enterpriseId,
        name: formData.name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: formData.description.trim() || null,
        type: formData.type,
        created_by: user.id
      }

      console.log('📝 Channel data:', channelData)

      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single()

      if (channelError) {
        console.error('❌ Channel creation error:', channelError)
        
        // Handle specific error cases
        if (channelError.code === '23505') {
          throw new Error('A channel with this name already exists')
        } else if (channelError.code === '42501') {
          throw new Error('Permission denied. Please check your account permissions.')
        } else if (channelError.code === '23503') {
          throw new Error('Invalid reference. Please refresh and try again.')
        } else {
          throw new Error(channelError.message || 'Failed to create channel')
        }
      }

      console.log('✅ Channel created:', channel)

      // Add the creator as an admin member
      const { error: memberError } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channel.id,
          user_id: user.id,
          role: 'admin'
        })

      if (memberError) {
        console.warn('⚠️ Failed to add creator as admin:', memberError.message)
        // Don't fail the whole operation
      } else {
        console.log('✅ Creator added as admin')
      }

      // Success!
      onChannelCreated()
      onClose()
    } catch (error: any) {
      console.error('💥 Error creating channel:', error)
      setError(error.message || 'Failed to create channel')
    } finally {
      setLoading(false)
    }
  }

  // Show session refresh option if authentication issues
  if (!user || !profile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Authentication Required</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="text-center py-4">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Issue</h3>
              <p className="text-gray-600 mb-4">
                There seems to be an issue with your session. Try refreshing your session first.
              </p>
              
              {/* Debug info */}
              <div className="bg-gray-100 p-3 rounded-lg mb-4 text-left">
                <p className="text-xs text-gray-600">
                  <strong>Debug Info:</strong><br/>
                  User: {user ? '✅' : '❌'}<br/>
                  Profile: {profile ? '✅' : '❌'}<br/>
                  Profile Type: {profileType || 'None'}<br/>
                  {profile && (
                    <>
                      Enterprise ID: {(profile as any).enterprise_id || 'Missing'}<br/>
                      Name: {profile.full_name}
                    </>
                  )}
                </p>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleRefreshSession} 
                  loading={refreshing}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Session</span>
                </Button>
                
                <Button 
                  variant="secondary" 
                  onClick={() => window.location.reload()} 
                  className="w-full"
                >
                  Reload Page
                </Button>
              </div>

              {error && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create Channel</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Channel Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., project-updates"
              helper="Use lowercase letters, numbers, and hyphens"
              required
            />

            <Input
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What's this channel about?"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Channel Type
              </label>
              <div className="space-y-3">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="public"
                    checked={formData.type === 'public'}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'public' | 'private' }))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">Public</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Anyone in your workspace can join and see the history
                    </p>
                  </div>
                </label>

                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="private"
                    checked={formData.type === 'private'}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'public' | 'private' }))}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">Private</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Only invited members can join and see the history
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex space-x-3">
              <Button type="submit" loading={loading} className="flex-1">
                Create Channel
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}