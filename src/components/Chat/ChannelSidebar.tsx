import React, { useState } from 'react'
import { Hash, Plus, Search, Settings, ChevronDown, ChevronRight, Lock } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { Channel } from '../../lib/supabase'

interface ChannelSidebarProps {
  channels: Channel[]
  selectedChannelId: string | null
  onChannelSelect: (channelId: string) => void
  searchTerm: string
  onSearchChange: (term: string) => void
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  channels,
  selectedChannelId,
  onChannelSelect,
  searchTerm,
  onSearchChange
}) => {
  const { profile } = useAuth()
  const [expandedSections, setExpandedSections] = useState({
    channels: true,
    directMessages: true
  })

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    channel.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const publicChannels = filteredChannels.filter(c => c.type === 'public')
  const privateChannels = filteredChannels.filter(c => c.type === 'private')

  const getDirectMessageDisplayName = (channel: Channel, currentUserId?: string) => {
    if (!channel.name.startsWith('dm-') || !currentUserId) return channel.name
    
    return channel.description?.split(' between ')[1]?.split(' and ')[1] || 'Direct Message'
  }

  const toggleSection = (section: 'channels' | 'directMessages') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="h-full flex flex-col">
      {/* Workspace Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            {(profile as any)?.enterprises?.name || 'Workspace'}
          </h2>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search channels..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {/* Public Channels */}
        <div className="p-2">
          <button
            onClick={() => toggleSection('channels')}
            className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
          >
            <div className="flex items-center space-x-2">
              {expandedSections.channels ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span>Channels</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-5 w-5"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </button>

          {expandedSections.channels && (
            <div className="mt-1 space-y-0.5">
              {publicChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onChannelSelect(channel.id)}
                  className={`w-full flex items-center space-x-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors ${
                    selectedChannelId === channel.id
                      ? 'bg-primary-100 text-primary-900 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  <Hash className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{channel.name}</span>
                  {channel.unread_count && channel.unread_count > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                      {channel.unread_count > 99 ? '99+' : channel.unread_count}
                    </span>
                  )}
                </button>
              ))}
              
              {publicChannels.length === 0 && searchTerm && (
                <div className="px-2 py-2 text-xs text-gray-500">
                  No channels found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div className="p-2">
            <button
              onClick={() => toggleSection('directMessages')}
              className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
            >
              <div className="flex items-center space-x-2">
                {expandedSections.directMessages ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span>Private Channels</span>
              </div>
            </button>

            {expandedSections.directMessages && (
              <div className="mt-1 space-y-0.5">
                {privateChannels.map((channel) => {
                  const isDM = channel.name.startsWith('dm-')
                  const displayName = isDM 
                    ? getDirectMessageDisplayName(channel, profile?.id)
                    : channel.name
                  
                  return (
                    <button
                      key={channel.id}
                      onClick={() => onChannelSelect(channel.id)}
                      className={`w-full flex items-center space-x-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors ${
                        selectedChannelId === channel.id
                          ? 'bg-primary-100 text-primary-900 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {isDM ? (
                        <div className="w-4 h-4 bg-green-500 rounded-full" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="truncate">{displayName}</span>
                      {channel.unread_count && channel.unread_count > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                          {channel.unread_count > 99 ? '99+' : channel.unread_count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {profile?.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {profile?.full_name}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {profile?.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
