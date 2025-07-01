import React from 'react'
import { TypingUser } from '../../lib/socket'

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ typingUsers }) => {
  if (typingUsers.length === 0) return null

  const getTypingText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].userName} is typing...`
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
    } else {
      return `${typingUsers[0].userName} and ${typingUsers.length - 1} others are typing...`
    }
  }

  return (
    <div className="px-6 py-2 bg-gray-50 border-t border-gray-100">
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span className="text-sm text-gray-600 italic">
          {getTypingText()}
        </span>
      </div>
    </div>
  )
}