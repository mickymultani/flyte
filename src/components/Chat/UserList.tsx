import React from 'react'
import { Crown, Circle } from 'lucide-react'
import { useChannelMembers } from '../../hooks/useChannelMembers'

interface UserListProps {
  channelId: string
}

export const UserList: React.FC<UserListProps> = ({ channelId }) => {
  const { members, loading } = useChannelMembers(channelId)

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const admins = members.filter(m => m.role === 'admin')
  const regularMembers = members.filter(m => m.role === 'member')

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900">
          Members ({members.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Admins */}
        {admins.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Admins ({admins.length})
            </h4>
            <div className="space-y-2">
              {admins.map((member) => (
                <div key={member.user_id} className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {member.user_profiles?.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.user_profiles?.full_name}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Circle className="h-2 w-2 text-green-500 fill-current" />
                      <span className="text-xs text-gray-500">Online</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Members */}
        {regularMembers.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Members ({regularMembers.length})
            </h4>
            <div className="space-y-2">
              {regularMembers.map((member) => (
                <div key={member.user_id} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {member.user_profiles?.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.user_profiles?.full_name}
                    </p>
                    <div className="flex items-center space-x-1">
                      <Circle className="h-2 w-2 text-green-500 fill-current" />
                      <span className="text-xs text-gray-500">Online</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No members found</p>
          </div>
        )}
      </div>
    </div>
  )
}