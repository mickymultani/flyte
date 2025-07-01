import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const server = createServer(app)

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
)

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
})

app.use(cors())
app.use(express.json())

// Store active users and their socket connections
const activeUsers = new Map<string, {
  socketId: string
  userId: string
  userName: string
  enterpriseId: string
  channels: Set<string>
}>()

// Store typing indicators
const typingUsers = new Map<string, Set<string>>() // channelId -> Set of userIds

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id)

  // Handle user authentication and joining
  socket.on('authenticate', async (data: { 
    userId: string
    userName: string
    enterpriseId: string
    accessToken: string
  }) => {
    try {
      // Verify the user's token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(data.accessToken)
      
      if (error || !user || user.id !== data.userId) {
        socket.emit('auth_error', { message: 'Invalid authentication' })
        return
      }

      // Store user info
      activeUsers.set(socket.id, {
        socketId: socket.id,
        userId: data.userId,
        userName: data.userName,
        enterpriseId: data.enterpriseId,
        channels: new Set()
      })

      console.log(`✅ User authenticated: ${data.userName} (${data.userId})`)
      
      // Get user's channels from database
      const { data: channels, error: channelsError } = await supabase
        .from('channels')
        .select(`
          id,
          name,
          type,
          channel_members!inner (user_id)
        `)
        .eq('channel_members.user_id', data.userId)
        .eq('enterprise_id', data.enterpriseId)

      if (!channelsError && channels) {
        // Join all user's channels
        for (const channel of channels) {
          socket.join(`channel:${channel.id}`)
          activeUsers.get(socket.id)?.channels.add(channel.id)
        }

        socket.emit('authenticated', { 
          success: true,
          channels: channels.map(c => c.id)
        })

        // Notify other users in the same enterprise that this user is online
        socket.to(`enterprise:${data.enterpriseId}`).emit('user_online', {
          userId: data.userId,
          userName: data.userName
        })

        // Join enterprise room for enterprise-wide notifications
        socket.join(`enterprise:${data.enterpriseId}`)
      }
    } catch (error) {
      console.error('Authentication error:', error)
      socket.emit('auth_error', { message: 'Authentication failed' })
    }
  })

  // Handle joining a specific channel
  socket.on('join_channel', async (data: { channelId: string }) => {
    const user = activeUsers.get(socket.id)
    if (!user) {
      socket.emit('error', { message: 'Not authenticated' })
      return
    }

    try {
      // Verify user has access to this channel
      const { data: membership, error } = await supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', data.channelId)
        .eq('user_id', user.userId)
        .single()

      if (error || !membership) {
        socket.emit('error', { message: 'Access denied to channel' })
        return
      }

      socket.join(`channel:${data.channelId}`)
      user.channels.add(data.channelId)
      
      socket.emit('joined_channel', { channelId: data.channelId })
      
      // Notify others in the channel
      socket.to(`channel:${data.channelId}`).emit('user_joined_channel', {
        userId: user.userId,
        userName: user.userName,
        channelId: data.channelId
      })
    } catch (error) {
      console.error('Join channel error:', error)
      socket.emit('error', { message: 'Failed to join channel' })
    }
  })

  // Handle sending messages
  socket.on('send_message', async (data: {
    channelId: string
    content: string
    type?: 'text' | 'file' | 'image'
    fileUrl?: string
  }) => {
    const user = activeUsers.get(socket.id)
    if (!user) {
      socket.emit('error', { message: 'Not authenticated' })
      return
    }

    try {
      // Verify user is a member of the channel
      if (!user.channels.has(data.channelId)) {
        socket.emit('error', { message: 'Not a member of this channel' })
        return
      }

      // Save message to database
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          channel_id: data.channelId,
          user_id: user.userId,
          content: data.content,
          type: data.type || 'text',
          file_url: data.fileUrl
        })
        .select(`
          *,
          user_profiles (
            id,
            full_name,
            email
          )
        `)
        .single()

      if (error) {
        console.error('Database error:', error)
        socket.emit('error', { message: 'Failed to save message' })
        return
      }

      // Broadcast message to all users in the channel
      const messageData = {
        id: message.id,
        channelId: data.channelId,
        userId: user.userId,
        userName: user.userName,
        content: data.content,
        type: data.type || 'text',
        fileUrl: data.fileUrl,
        timestamp: new Date().toISOString(),
        user_profiles: message.user_profiles
      }

      io.to(`channel:${data.channelId}`).emit('new_message', messageData)

      // Clear typing indicator for this user
      const channelTyping = typingUsers.get(data.channelId)
      if (channelTyping?.has(user.userId)) {
        channelTyping.delete(user.userId)
        socket.to(`channel:${data.channelId}`).emit('user_stopped_typing', {
          userId: user.userId,
          channelId: data.channelId
        })
      }

    } catch (error) {
      console.error('Send message error:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  // Handle typing indicators
  socket.on('typing_start', (data: { channelId: string }) => {
    const user = activeUsers.get(socket.id)
    if (!user || !user.channels.has(data.channelId)) return

    if (!typingUsers.has(data.channelId)) {
      typingUsers.set(data.channelId, new Set())
    }
    
    typingUsers.get(data.channelId)?.add(user.userId)
    
    socket.to(`channel:${data.channelId}`).emit('user_typing', {
      userId: user.userId,
      userName: user.userName,
      channelId: data.channelId
    })
  })

  socket.on('typing_stop', (data: { channelId: string }) => {
    const user = activeUsers.get(socket.id)
    if (!user || !user.channels.has(data.channelId)) return

    const channelTyping = typingUsers.get(data.channelId)
    if (channelTyping?.has(user.userId)) {
      channelTyping.delete(user.userId)
      socket.to(`channel:${data.channelId}`).emit('user_stopped_typing', {
        userId: user.userId,
        channelId: data.channelId
      })
    }
  })

  // Handle message reactions
  socket.on('add_reaction', async (data: {
    messageId: string
    emoji: string
    channelId: string
  }) => {
    const user = activeUsers.get(socket.id)
    if (!user || !user.channels.has(data.channelId)) return

    // Broadcast reaction to channel
    socket.to(`channel:${data.channelId}`).emit('message_reaction', {
      messageId: data.messageId,
      emoji: data.emoji,
      userId: user.userId,
      userName: user.userName,
      action: 'add'
    })
  })

  // Handle user presence updates
  socket.on('update_presence', (data: { status: 'online' | 'away' | 'busy' }) => {
    const user = activeUsers.get(socket.id)
    if (!user) return

    // Broadcast presence update to enterprise
    socket.to(`enterprise:${user.enterpriseId}`).emit('user_presence_update', {
      userId: user.userId,
      status: data.status
    })
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    const user = activeUsers.get(socket.id)
    if (user) {
      console.log(`🔌 User disconnected: ${user.userName}`)
      
      // Remove from typing indicators
      for (const [channelId, typingSet] of typingUsers.entries()) {
        if (typingSet.has(user.userId)) {
          typingSet.delete(user.userId)
          socket.to(`channel:${channelId}`).emit('user_stopped_typing', {
            userId: user.userId,
            channelId
          })
        }
      }

      // Notify enterprise that user went offline
      socket.to(`enterprise:${user.enterpriseId}`).emit('user_offline', {
        userId: user.userId
      })

      activeUsers.delete(socket.id)
    }
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    activeUsers: activeUsers.size,
    timestamp: new Date().toISOString()
  })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`)
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`)
})
