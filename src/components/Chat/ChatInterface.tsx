import React, { useState, useEffect, useRef } from 'react'
import { Send, Paperclip, Smile, MoreVertical, Users, Search, Phone, Video, Wifi, WifiOff, Plus, Settings, LogOut, Hash, Lock, MessageSquare, CheckSquare, UserCheck } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { useChannels } from '../../hooks/useChannels'
import { useSocket, useSocketMessages } from '../../hooks/useSocket'
import { MessageList } from './MessageList'
import { TypingIndicator } from './TypingIndicator'
import { UserList } from './UserList'
import { CreateChannelModal } from './CreateChannelModal'
import { ProfileModal } from './ProfileModal'
import { TasksSidebar } from './TasksSidebar'
import { ContactsSidebar } from './ContactsSidebar'
import { signOut } from '../../lib/auth'

type SidebarSection = 'channels' | 'tasks' | 'contacts'

export const ChatInterface: React.FC = () => {
  const { profile } = useAuth()
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [showUserList, setShowUserList] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sidebarSection, setSidebarSection] = useState<SidebarSection>('channels')
  const messageInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const { channels, loading: channelsLoading, refetch: refetchChannels } = useChannels()
  const { connected, connecting, error: socketError } = useSocket()
  const { 
    messages, 
    typingUsers,
    sendMessage, 
    startTyping,
    stopTyping
  } = useSocketMessages(selectedChannelId)

  // Auto-select first channel when channels load
  useEffect(() => {
    if (channels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(channels[0].id)
    }
  }, [channels, selectedChannelId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!messageText.trim() || !selectedChannelId || !connected) return

    try {
      sendMessage(messageText.trim())
      setMessageText('')
      messageInputRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value)
    
    // Handle typing indicators
    if (e.target.value.trim() && connected) {
      startTyping()
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping()
      }, 1000)
    } else if (!e.target.value.trim()) {
      stopTyping()
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const selectedChannel = channels.find(c => c.id === selectedChannelId)
  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    channel.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Show loading screen during initial setup
  if (channelsLoading || connecting) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">
            {channelsLoading ? 'Loading your workspace...' : 'Connecting to operations center...'}
          </p>
        </div>
      </div>
    )
  }

  // Show error if socket connection failed
  if (socketError) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
            <WifiOff className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
          <p className="text-gray-600 mb-4">{socketError}</p>
          <Button onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  const renderSidebarContent = () => {
    switch (sidebarSection) {
      case 'tasks':
        return <TasksSidebar searchTerm={searchTerm} />
      case 'contacts':
        return <ContactsSidebar 
          searchTerm={searchTerm}
          onChannelSelect={setSelectedChannelId}
          onChannelCreated={refetchChannels}
        />
      default:
        return (
          <div className="flex-1 overflow-y-auto">
            {/* Channels Section */}
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-2 mb-2">
                <h3 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Channels</span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-6 w-6"
                  onClick={() => setShowCreateChannel(true)}
                  title="Create Channel"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="space-y-1">
                {filteredChannels.filter(c => c.type === 'public').map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-3 text-sm rounded-lg hover:bg-gray-100 transition-colors ${
                      selectedChannelId === channel.id
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-700'
                    }`}
                  >
                    <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Hash className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{channel.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {channel.description || 'No description'}
                      </p>
                    </div>
                    {channel.unread_count && channel.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {channel.unread_count > 99 ? '99+' : channel.unread_count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Department Channels */}
            {filteredChannels.some(c => c.type === 'department') && (
              <div className="p-2 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 px-2 py-2 mb-2 flex items-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Department Channels</span>
                </h3>
                <div className="space-y-1">
                  {filteredChannels.filter(c => c.type === 'department').map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannelId(channel.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-3 text-sm rounded-lg hover:bg-gray-100 transition-colors ${
                        selectedChannelId === channel.id
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-700'
                      }`}
                    >
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Lock className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{channel.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {channel.description || 'Department channel'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredChannels.length === 0 && (
              <div className="p-6 text-center">
                {searchTerm ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">No channels found</p>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => setSearchTerm('')}
                    >
                      Clear Search
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 mb-3">No channels yet</p>
                    <Button 
                      size="sm"
                      onClick={() => setShowCreateChannel(true)}
                      className="inline-flex items-center"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create Channel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
    }
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      {/* Sidebar - WhatsApp Style */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="bg-primary-600 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-white text-lg font-medium">
                  {profile?.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="font-semibold text-white">
                  {profile?.full_name}
                </h2>
                <p className="text-xs text-primary-100">
                  {(profile as any)?.enterprises?.name || 'Airport Operations'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowProfile(true)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2"
                title="Profile Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${sidebarSection}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm bg-white bg-opacity-20 border-white border-opacity-30 text-white placeholder-primary-200"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setSidebarSection('channels')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors ${
              sidebarSection === 'channels'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Chats</span>
          </button>
          <button
            onClick={() => setSidebarSection('tasks')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors ${
              sidebarSection === 'tasks'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            <span>Tasks</span>
          </button>
          <button
            onClick={() => setSidebarSection('contacts')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 text-sm font-medium transition-colors ${
              sidebarSection === 'contacts'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Contacts</span>
          </button>
        </div>

        {/* Sidebar Content */}
        {renderSidebarContent()}

        {/* Connection Status */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {connected ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">Connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-red-600 font-medium">Disconnected</span>
                </>
              )}
            </div>
            <span className="text-gray-500">
              {sidebarSection === 'channels' && `${channels.length} channel${channels.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChannel ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                    {selectedChannel.type === 'department' ? (
                      <Lock className="h-5 w-5 text-white" />
                    ) : (
                      <Hash className="h-5 w-5 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h1 className="text-xl font-semibold text-gray-900">
                        {selectedChannel.name}
                      </h1>
                      {/* Connection Status */}
                      <div className="flex items-center space-x-1">
                        {connected ? (
                          <Wifi className="h-4 w-4 text-green-500" />
                        ) : (
                          <WifiOff className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      {selectedChannel.description || 'No description'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUserList(!showUserList)}
                    className="flex items-center space-x-2"
                  >
                    <Users className="h-4 w-4" />
                    <span>Members</span>
                  </Button>
                  
                  <Button variant="ghost" size="sm" disabled title="Voice Call (Coming Soon)">
                    <Phone className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm" disabled title="Video Call (Coming Soon)">
                    <Video className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="ghost" size="sm" title="Channel Settings">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex">
              <div className="flex-1 flex flex-col">
                <MessageList
                  messages={messages}
                  loading={false}
                  currentUserId={profile?.id || ''}
                />

                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                  <TypingIndicator typingUsers={typingUsers} />
                )}

                {/* Message Input */}
                <div className="bg-white border-t border-gray-200 p-4">
                  <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                    <div className="flex-1">
                      <div className="relative">
                        <Input
                          ref={messageInputRef}
                          value={messageText}
                          onChange={handleInputChange}
                          placeholder={`Message ${selectedChannel.name}`}
                          className="pr-20 resize-none"
                          disabled={!connected}
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8"
                            disabled
                            title="Attach File (Coming Soon)"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="p-1 h-8 w-8"
                            disabled
                            title="Add Emoji (Coming Soon)"
                          >
                            <Smile className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={!messageText.trim() || !connected}
                      className="flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send</span>
                    </Button>
                  </form>
                  
                  {!connected && (
                    <div className="mt-2 text-xs text-red-600 flex items-center space-x-1">
                      <WifiOff className="h-3 w-3" />
                      <span>Disconnected from communications server</span>
                    </div>
                  )}
                </div>
              </div>

              {/* User List Sidebar */}
              {showUserList && (
                <div className="w-64 bg-white border-l border-gray-200">
                  <UserList channelId={selectedChannelId || ''} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="bg-gray-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to Flyte Communications
              </h2>
              <p className="text-gray-500 mb-4">
                Select a channel to start coordinating with your team
              </p>
              {channels.length === 0 && (
                <Button onClick={() => setShowCreateChannel(true)}>
                  Create Your First Channel
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateChannel && (
        <CreateChannelModal
          onClose={() => setShowCreateChannel(false)}
          onChannelCreated={refetchChannels}
        />
      )}

      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}
