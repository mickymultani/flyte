import { io, Socket } from 'socket.io-client'

export interface SocketMessage {
  id: string
  channelId: string
  userId: string
  userName: string
  content: string
  type: 'text' | 'file' | 'image'
  fileUrl?: string
  timestamp: string
  user_profiles?: {
    id: string
    full_name: string
    email: string
  }
}

export interface TypingUser {
  userId: string
  userName: string
  channelId: string
}

export interface UserPresence {
  userId: string
  status: 'online' | 'away' | 'busy' | 'offline'
}

class SocketManager {
  private socket: Socket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  connect(serverUrl: string = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:3001'): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    console.log('🔌 Connecting to Socket.IO server...')
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    this.setupEventListeners()
    return this.socket
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server')
      this.isConnected = true
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO server:', reason)
      this.isConnected = false
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect automatically
        return
      }
      
      this.handleReconnect()
    })

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error)
      this.handleReconnect()
    })

    this.socket.on('auth_error', (data) => {
      console.error('🔐 Authentication error:', data.message)
    })

    this.socket.on('error', (data) => {
      console.error('⚠️ Socket error:', data.message)
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`)
    
    setTimeout(() => {
      this.socket?.connect()
    }, delay)
  }

  authenticate(userData: {
    userId: string
    userName: string
    enterpriseId: string
    accessToken: string
  }) {
    if (!this.socket) {
      throw new Error('Socket not connected')
    }

    console.log('🔐 Authenticating user:', userData.userName)
    this.socket.emit('authenticate', userData)
  }

  joinChannel(channelId: string) {
    if (!this.socket) return
    this.socket.emit('join_channel', { channelId })
  }

  sendMessage(data: {
    channelId: string
    content: string
    type?: 'text' | 'file' | 'image'
    fileUrl?: string
  }) {
    if (!this.socket) return
    this.socket.emit('send_message', data)
  }

  startTyping(channelId: string) {
    if (!this.socket) return
    this.socket.emit('typing_start', { channelId })
  }

  stopTyping(channelId: string) {
    if (!this.socket) return
    this.socket.emit('typing_stop', { channelId })
  }

  addReaction(messageId: string, emoji: string, channelId: string) {
    if (!this.socket) return
    this.socket.emit('add_reaction', { messageId, emoji, channelId })
  }

  updatePresence(status: 'online' | 'away' | 'busy') {
    if (!this.socket) return
    this.socket.emit('update_presence', { status })
  }

  // Event listeners
  onMessage(callback: (message: SocketMessage) => void) {
    if (!this.socket) return
    this.socket.on('new_message', callback)
  }

  onTyping(callback: (data: TypingUser) => void) {
    if (!this.socket) return
    this.socket.on('user_typing', callback)
  }

  onStoppedTyping(callback: (data: { userId: string; channelId: string }) => void) {
    if (!this.socket) return
    this.socket.on('user_stopped_typing', callback)
  }

  onUserOnline(callback: (data: { userId: string; userName: string }) => void) {
    if (!this.socket) return
    this.socket.on('user_online', callback)
  }

  onUserOffline(callback: (data: { userId: string }) => void) {
    if (!this.socket) return
    this.socket.on('user_offline', callback)
  }

  onPresenceUpdate(callback: (data: UserPresence) => void) {
    if (!this.socket) return
    this.socket.on('user_presence_update', callback)
  }

  onAuthenticated(callback: (data: { success: boolean; channels: string[] }) => void) {
    if (!this.socket) return
    this.socket.on('authenticated', callback)
  }

  onJoinedChannel(callback: (data: { channelId: string }) => void) {
    if (!this.socket) return
    this.socket.on('joined_channel', callback)
  }

  // Cleanup
  removeAllListeners() {
    if (!this.socket) return
    this.socket.removeAllListeners()
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting from Socket.IO server...')
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }

  get connected() {
    return this.isConnected && this.socket?.connected
  }

  getSocket() {
    return this.socket
  }
}

// Export singleton instance
export const socketManager = new SocketManager()
