import { useEffect, useRef, useState } from 'react'
import { socketManager, SocketMessage, TypingUser } from '../lib/socket'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'

export const useSocket = () => {
  const { user, profile } = useAuth()
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initRef = useRef(false)

  useEffect(() => {
    if (!user || initRef.current) return
    
    if (!profile) {
      console.warn('⚠️ Authenticated user has no profile - this indicates a profile loading or creation issue')
      console.log('🔄 Skipping socket connection to prevent infinite loading')
      setConnecting(false)
      setError('Profile loading failed - unable to establish chat connection')
      return
    }

    const initializeSocket = async () => {
      try {
        setConnecting(true)
        setError(null)
        initRef.current = true

        // Get access token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No access token available')
        }

        // Connect to socket server
        const socket = socketManager.connect()

        // Set up connection event listeners
        socket.on('connect', () => {
          console.log('✅ Socket connected')
          setConnected(true)
          setConnecting(false)
        })

        socket.on('disconnect', () => {
          console.log('❌ Socket disconnected')
          setConnected(false)
        })

        socket.on('connect_error', (err) => {
          console.error('🔌 Socket connection error:', err)
          setError('Failed to connect to chat server')
          setConnecting(false)
        })

        socket.on('auth_error', (data) => {
          console.error('🔐 Socket auth error:', data)
          setError('Authentication failed')
          setConnecting(false)
        })

        socket.on('authenticated', (data) => {
          console.log('✅ Socket authenticated:', data)
          setConnected(true)
          setConnecting(false)
        })

        // Authenticate with the server
        socketManager.authenticate({
          userId: user.id,
          userName: profile.full_name,
          enterpriseId: (profile as any).enterprise_id,
          accessToken: session.access_token
        })

      } catch (err: any) {
        console.error('Socket initialization error:', err)
        setError(err.message || 'Failed to initialize chat')
        setConnecting(false)
        initRef.current = false
      }
    }

    initializeSocket()

    // Cleanup on unmount
    return () => {
      if (initRef.current) {
        socketManager.disconnect()
        setConnected(false)
        setConnecting(false)
        initRef.current = false
      }
    }
  }, [user, profile])

  return {
    connected,
    connecting,
    error,
    socketManager
  }
}

export const useSocketMessages = (channelId: string | null) => {
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const { connected } = useSocket()
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!connected || !channelId) return

    // Join the channel
    socketManager.joinChannel(channelId)

    // Listen for new messages
    const handleNewMessage = (message: SocketMessage) => {
      if (message.channelId === channelId) {
        setMessages(prev => [...prev, message])
      }
    }

    // Listen for typing indicators
    const handleUserTyping = (data: TypingUser) => {
      if (data.channelId === channelId) {
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.userId)
          return [...filtered, data]
        })
      }
    }

    const handleUserStoppedTyping = (data: { userId: string; channelId: string }) => {
      if (data.channelId === channelId) {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId))
      }
    }

    socketManager.onMessage(handleNewMessage)
    socketManager.onTyping(handleUserTyping)
    socketManager.onStoppedTyping(handleUserStoppedTyping)

    // Load initial messages from database
    loadInitialMessages()

    return () => {
      socketManager.removeAllListeners()
      setMessages([])
      setTypingUsers([])
    }
  }, [connected, channelId])

  const loadInitialMessages = async () => {
    if (!channelId) return

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user_profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) throw error

      const socketMessages: SocketMessage[] = (data || []).map(msg => ({
        id: msg.id,
        channelId: msg.channel_id,
        userId: msg.user_id,
        userName: msg.user_profiles?.full_name || 'Unknown User',
        content: msg.content,
        type: msg.type,
        fileUrl: msg.file_url,
        timestamp: msg.created_at,
        user_profiles: msg.user_profiles
      }))

      setMessages(socketMessages)
    } catch (error) {
      console.error('Error loading initial messages:', error)
    }
  }

  const sendMessage = (content: string, type: 'text' | 'file' | 'image' = 'text', fileUrl?: string) => {
    if (!connected || !channelId || !content.trim()) return

    socketManager.sendMessage({
      channelId,
      content: content.trim(),
      type,
      fileUrl
    })
  }

  const startTyping = () => {
    if (!connected || !channelId) return
    
    socketManager.startTyping(channelId)
    
    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 3000)
  }

  const stopTyping = () => {
    if (!connected || !channelId) return
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    
    socketManager.stopTyping(channelId)
  }

  return {
    messages,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    connected
  }
}
