import React, { useState, useEffect } from 'react'
import { 
  Users, 
  AlertTriangle, 
  CheckSquare, 
  Settings, 
  MessageSquare, 
  Calendar,
  Radio,
  Wrench,
  Shield,
  Plane,
  Clock,
  TrendingUp,
  Bell
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

interface DashboardStats {
  activeIncidents: number
  pendingTasks: number
  onlineStaff: number
  equipmentIssues: number
  activeShifts: number
}

export const OperationsDashboard: React.FC = () => {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    activeIncidents: 0,
    pendingTasks: 0,
    onlineStaff: 0,
    equipmentIssues: 0,
    activeShifts: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    if (!profile) return

    try {
      const enterpriseId = (profile as any).enterprise_id

      // Fetch incidents
      const { count: incidentCount } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId)
        .in('status', ['open', 'investigating'])

      // Fetch tasks
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId)
        .in('status', ['pending', 'in_progress'])

      // Fetch equipment issues
      const { count: equipmentCount } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId)
        .in('status', ['maintenance', 'out_of_service', 'repair'])

      // Fetch active shifts
      const { count: shiftCount } = await supabase
        .from('shifts')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId)
        .eq('status', 'active')

      // Fetch online staff (simplified - in real app would use presence)
      const { count: staffCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('enterprise_id', enterpriseId)
        .eq('status', 'active')

      setStats({
        activeIncidents: incidentCount || 0,
        pendingTasks: taskCount || 0,
        onlineStaff: staffCount || 0,
        equipmentIssues: equipmentCount || 0,
        activeShifts: shiftCount || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: 'Report Incident',
      description: 'Report a security or operational incident',
      icon: AlertTriangle,
      color: 'bg-red-500',
      action: () => console.log('Report incident')
    },
    {
      title: 'Create Task',
      description: 'Assign a task to team members',
      icon: CheckSquare,
      color: 'bg-blue-500',
      action: () => console.log('Create task')
    },
    {
      title: 'Equipment Check',
      description: 'Update equipment status',
      icon: Wrench,
      color: 'bg-green-500',
      action: () => console.log('Equipment check')
    },
    {
      title: 'Shift Handover',
      description: 'Start shift handover process',
      icon: Clock,
      color: 'bg-purple-500',
      action: () => console.log('Shift handover')
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {profile?.full_name} • {(profile as any)?.enterprises?.name}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">System Operational</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Incidents</p>
                <p className="text-2xl font-bold text-red-600">{stats.activeIncidents}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Tasks</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pendingTasks}</p>
              </div>
              <CheckSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Staff Online</p>
                <p className="text-2xl font-bold text-green-600">{stats.onlineStaff}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Equipment Issues</p>
                <p className="text-2xl font-bold text-orange-600">{stats.equipmentIssues}</p>
              </div>
              <Wrench className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Shifts</p>
                <p className="text-2xl font-bold text-purple-600">{stats.activeShifts}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Recent Incidents</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Security Alert - Terminal A</p>
                  <p className="text-xs text-gray-600">2 minutes ago</p>
                </div>
                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">High</span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                <Wrench className="h-5 w-5 text-yellow-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Equipment Malfunction - Gate 12</p>
                  <p className="text-xs text-gray-600">15 minutes ago</p>
                </div>
                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Medium</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <CheckSquare className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Security Patrol - Terminal B</p>
                  <p className="text-xs text-gray-600">Due in 30 minutes</p>
                </div>
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Urgent</span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <Settings className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Equipment Maintenance Check</p>
                  <p className="text-xs text-gray-600">Due in 2 hours</p>
                </div>
                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Normal</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}