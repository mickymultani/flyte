import React, { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { Send, LogOut, Users } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  text: string
  user: string
  timestamp: Date
}

interface SimpleChatProps {
  user: User
  onLogout: () => void
}

export const SimpleChat: React.FC<SimpleChatProps> = ({ user, onLogout }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      auth: {
        userId: user.id,
        userEmail: user.email
      }
    })

    newSocket.on('connect', () => {
      console.log('Connected to chat server')
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server')
      setConnected(false)
    })

    newSocket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    newSocket.on('userJoined', (data: { user: string; onlineUsers: string[] }) => {
      setOnlineUsers(data.onlineUsers)
    })

    newSocket.on('userLeft', (data: { user: string; onlineUsers: string[] }) => {
      setOnlineUsers(data.onlineUsers)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [user.id, user.email])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !socket || !connected) {
      console.log('Cannot send message:', { hasMessage: !!newMessage.trim(), hasSocket: !!socket, connected })
      return
    }

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      user: user.email || 'Unknown',
      timestamp: new Date()
    }

    console.log('Sending message:', message)
    socket.emit('sendMessage', message)
    setNewMessage('')
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-semibold text-gray-900">Simple Chat</h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{onlineUsers.length} online</span>
            </div>
            <div className="text-sm text-gray-600">
              {user.email}
            </div>
            <button
              onClick={onLogout}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user === user.email ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.user === user.email
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {message.user !== user.email && (
                  <p className="text-xs text-gray-500 mb-1">{message.user}</p>
                )}
                <p className="text-sm">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.user === user.email ? 'text-blue-100' : 'text-gray-400'
                }`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!connected}
          />
          <button
            type="submit"
            disabled={!connected || !newMessage.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
