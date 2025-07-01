import React, { useState, useEffect } from 'react'
import { CheckSquare, Clock, AlertTriangle, Plus, User, Calendar } from 'lucide-react'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Task } from '../../lib/supabase'

interface TasksSidebarProps {
  searchTerm: string
}

export const TasksSidebar: React.FC<TasksSidebarProps> = ({ searchTerm }) => {
  const { profile, user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile && user) {
      fetchTasks()
    } else {
      setLoading(false)
    }
  }, [profile, user])

  const fetchTasks = async () => {
    if (!profile || !user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          user_profiles!tasks_created_by_fkey (
            id,
            full_name
          )
        `)
        .eq('enterprise_id', (profile as any).enterprise_id)
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-blue-500'
      case 'low': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`
    } else if (diffDays === 0) {
      return 'Due today'
    } else if (diffDays === 1) {
      return 'Due tomorrow'
    } else {
      return `Due in ${diffDays} days`
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2">
        <div className="flex items-center justify-between px-2 py-2 mb-2">
          <h3 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
            <CheckSquare className="h-4 w-4" />
            <span>My Tasks ({loading ? '...' : filteredTasks.length})</span>
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-6 w-6"
            disabled
            title="Create Task (Coming Soon)"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm truncate flex-1">
                      {task.title}
                    </h4>
                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)} flex-shrink-0 ml-2`} />
                  </div>
                  
                  {task.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    
                    {task.due_date && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(task.due_date)}</span>
                      </div>
                    )}
                  </div>

                  {task.assigned_to === user?.id && task.created_by !== user?.id && (
                    <div className="flex items-center space-x-1 text-xs text-gray-500 mt-2">
                      <User className="h-3 w-3" />
                      <span>Assigned by {(task as any).user_profiles?.full_name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredTasks.length === 0 && (
              <div className="p-6 text-center">
                {searchTerm ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">No tasks found</p>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => {/* Clear search handled by parent */}}
                    >
                      Clear Search
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckSquare className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h3>
                    <p className="text-sm text-gray-500 mb-3">No tasks assigned to you right now</p>
                    <p className="text-xs text-gray-400">
                      New tasks will appear here when they're assigned to you
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}