import React, { useState, useEffect } from 'react'
import { UserCheck, Shield, Wrench, Users, Headphones, Plus, Search } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

interface UserProfile {
  id: string
  full_name: string
  email: string
  role: string
  phone?: string
  department_id?: string
  status: string
  enterprise_id: string
}

interface ContactsSidebarProps {
  searchTerm: string
  onChannelSelect?: (channelId: string) => void
  onChannelCreated?: () => void
}

export const ContactsSidebar: React.FC<ContactsSidebarProps> = ({ 
  searchTerm, 
  onChannelSelect, 
  onChannelCreated 
}) => {
  const { profile } = useAuth()
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([])
  const [myContacts, setMyContacts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (profile) {
      fetchAvailableUsers()
      fetchMyContacts()
    } else {
      setLoading(false)
    }
  }, [profile])

  const fetchAvailableUsers = async () => {
    if (!profile) return

    try {
      console.log('🔍 Fetching available users for enterprise:', (profile as any).enterprise_id)
      console.log('🔍 Current user profile:', profile)
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, role, phone, department_id, status, enterprise_id')
        .eq('enterprise_id', (profile as any).enterprise_id)
        .eq('status', 'active')
        .neq('id', profile.id) // Exclude current user
        .order('full_name', { ascending: true })

      console.log('🔍 Query result:', { data, error })
      
      if (error) throw error
      setAvailableUsers(data || [])
      console.log('🔍 Available users set:', data || [])
    } catch (error) {
      console.error('Error fetching available users:', error)
      setAvailableUsers([])
    }
  }

  const fetchMyContacts = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('user_id')
        .eq('enterprise_id', (profile as any).enterprise_id)
        .not('user_id', 'is', null)

      if (error) throw error
      setMyContacts(data?.map(c => c.user_id).filter(Boolean) || [])
    } catch (error) {
      console.error('Error fetching my contacts:', error)
      setMyContacts([])
    } finally {
      setLoading(false)
    }
  }

  const searchTermToUse = searchQuery || searchTerm
  
  const filteredUsers = availableUsers.filter(user =>
    user.full_name.toLowerCase().includes(searchTermToUse.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTermToUse.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTermToUse.toLowerCase())
  )

  const myContactUsers = filteredUsers.filter(user => myContacts.includes(user.id))
  const availableToAdd = filteredUsers.filter(user => !myContacts.includes(user.id))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'off_duty': return 'bg-yellow-500'
      case 'unavailable': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getRoleIcon = (role: string) => {
    const roleStr = role?.toLowerCase()
    if (roleStr?.includes('security')) return Shield
    if (roleStr?.includes('maintenance')) return Wrench
    if (roleStr?.includes('customer')) return Headphones
    if (roleStr?.includes('admin')) return Shield
    return Users
  }

  const handleAddContact = async (user: UserProfile) => {
    if (!profile) return

    try {
      const { error } = await supabase
        .from('contacts')
        .insert({
          enterprise_id: (profile as any).enterprise_id,
          user_id: user.id,
          name: user.full_name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          status: 'active'
        })

      if (error) throw error
      
      await fetchMyContacts()
    } catch (error) {
      console.error('Error adding contact:', error)
    }
  }

  const handleStartDirectMessage = async (user: UserProfile) => {
    if (!profile || !onChannelSelect) return
    
    try {
      const userIds = [profile.id, user.id].sort()
      const channelName = `dm-${userIds.join('-')}`
      
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('name', channelName)
        .eq('type', 'private')
        .eq('enterprise_id', (profile as any).enterprise_id)
        .single()
      
      if (existingChannel) {
        onChannelSelect(existingChannel.id)
        return
      }
      
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          enterprise_id: (profile as any).enterprise_id,
          name: channelName,
          description: `Direct conversation between ${profile.full_name} and ${user.full_name}`,
          type: 'private',
          created_by: profile.id
        })
        .select()
        .single()
      
      if (channelError) throw channelError
      
      const { error: memberError } = await supabase
        .from('channel_members')
        .insert([
          { channel_id: channel.id, user_id: profile.id, role: 'admin' },
          { channel_id: channel.id, user_id: user.id, role: 'member' }
        ])
      
      if (memberError) throw memberError
      
      if (onChannelCreated) onChannelCreated()
      onChannelSelect(channel.id)
      
    } catch (error) {
      console.error('Error starting direct message:', error)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Search Bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* My Contacts */}
          {myContactUsers.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 px-2 py-2 mb-2 flex items-center space-x-2">
                <UserCheck className="h-4 w-4" />
                <span>My Contacts ({myContactUsers.length})</span>
              </h3>
              <div className="space-y-1">
                {myContactUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.role)
                  return (
                    <div
                      key={user.id}
                      className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleStartDirectMessage(user)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <RoleIcon className="h-5 w-5 text-white" />
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(user.status)} rounded-full border-2 border-white`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-600 truncate">{user.role}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Available to Add */}
          {availableToAdd.length > 0 && (
            <div className="p-2">
              <h3 className="text-sm font-medium text-gray-700 px-2 py-2 mb-2 flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add to Contacts ({availableToAdd.length})</span>
              </h3>
              <div className="space-y-1">
                {availableToAdd.map((user) => {
                  const RoleIcon = getRoleIcon(user.role)
                  return (
                    <div
                      key={user.id}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => handleStartDirectMessage(user)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <RoleIcon className="h-5 w-5 text-white" />
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(user.status)} rounded-full border-2 border-white`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{user.full_name}</p>
                          <p className="text-xs text-gray-600 truncate">{user.role}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddContact(user)
                          }}
                          className="flex-shrink-0"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredUsers.length === 0 && searchTermToUse && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
              <p className="text-sm text-gray-500 mb-4">
                Try searching with a different name or email
              </p>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            </div>
          )}

          {/* Empty State */}
          {filteredUsers.length === 0 && !searchTermToUse && (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Colleagues</h3>
              <p className="text-sm text-gray-500 mb-4">
                Search for colleagues by name or email to add them to your contacts
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
