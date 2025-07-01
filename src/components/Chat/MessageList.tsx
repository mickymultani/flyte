import React, { useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { SocketMessage } from '../../lib/socket'

interface MessageListProps {
  messages: SocketMessage[]
  loading: boolean
  currentUserId: string
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  currentUserId
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="bg-gray-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Start the conversation
          </h3>
          <p className="text-gray-500">
            This is the beginning of your conversation in this channel. 
            Send a message to get things started!
          </p>
        </div>
      </div>
    )
  }

  const groupMessagesByDate = (messages: SocketMessage[]) => {
    const groups: { [key: string]: SocketMessage[] } = {}
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    
    return groups
  }

  const messageGroups = groupMessagesByDate(messages)

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    
    if (dateString === today) return 'Today'
    if (dateString === yesterday) return 'Yesterday'
    return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-4 space-y-6">
        {Object.entries(messageGroups).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date Header */}
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white border border-gray-200 rounded-full px-4 py-1">
                <span className="text-xs font-medium text-gray-600">
                  {formatDateHeader(date)}
                </span>
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-4">
              {dateMessages.map((message, index) => {
                const isOwnMessage = message.userId === currentUserId
                const showAvatar = index === 0 || 
                  dateMessages[index - 1].userId !== message.userId ||
                  new Date(message.timestamp).getTime() - new Date(dateMessages[index - 1].timestamp).getTime() > 300000 // 5 minutes

                return (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {showAvatar ? (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isOwnMessage ? 'bg-primary-600' : 'bg-gray-600'
                        }`}>
                          <span className="text-white text-sm font-medium">
                            {message.userName?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      ) : (
                        <div className="w-8 h-8" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`flex-1 max-w-lg ${isOwnMessage ? 'text-right' : ''}`}>
                      {showAvatar && (
                        <div className={`flex items-center space-x-2 mb-1 ${
                          isOwnMessage ? 'justify-end' : ''
                        }`}>
                          <span className="text-sm font-medium text-gray-900">
                            {isOwnMessage ? 'You' : message.userName || 'Unknown User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(message.timestamp)}
                          </span>
                        </div>
                      )}
                      
                      <div
                        className={`inline-block px-4 py-2 rounded-2xl max-w-full break-words ${
                          isOwnMessage
                            ? 'bg-primary-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>

                      {!showAvatar && (
                        <div className={`text-xs text-gray-400 mt-1 ${
                          isOwnMessage ? 'text-right' : ''
                        }`}>
                          {formatMessageTime(message.timestamp)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  )
}