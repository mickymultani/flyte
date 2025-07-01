import React, { useState, useEffect } from 'react'
import { Navbar } from '../Layout/Navbar'
import { EnterpriseManagement } from './EnterpriseManagement'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { Building2, Users, Globe, TrendingUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export const SuperAdminDashboard: React.FC = () => {
  const [currentSection, setCurrentSection] = useState('enterprises')
  const [stats, setStats] = useState({
    enterprises: 0,
    domains: 0,
    activeEnterprises: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch enterprise count
      const { count: enterpriseCount } = await supabase
        .from('enterprises')
        .select('*', { count: 'exact', head: true })

      // Fetch active enterprise count
      const { count: activeEnterpriseCount } = await supabase
        .from('enterprises')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // Count total domains across all enterprises
      const { data: enterprisesWithDomains } = await supabase
        .from('enterprises')
        .select('domains')

      const totalDomains = enterprisesWithDomains?.reduce((total, enterprise) => {
        return total + (enterprise.domains?.length || 0)
      }, 0) || 0

      setStats({
        enterprises: enterpriseCount || 0,
        domains: totalDomains,
        activeEnterprises: activeEnterpriseCount || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const renderContent = () => {
    switch (currentSection) {
      case 'enterprises':
        return <EnterpriseManagement />
      case 'settings':
        return (
          <div className="max-w-7xl mx-auto p-6">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h1>
              <p className="text-gray-600">System configuration and settings will be implemented in a future phase.</p>
            </div>
          </div>
        )
      default:
        return <EnterpriseManagement />
    }
  }

  // Show overview dashboard for the main page
  if (currentSection === 'overview') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onNavigate={setCurrentSection} currentSection={currentSection} />
        <main className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Overview</h1>
              <p className="text-gray-600">Monitor your airport operations platform performance and metrics.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-primary-100 p-3 rounded-lg">
                      <Building2 className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Enterprises</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.enterprises}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-3 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Enterprises</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeEnterprises}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-accent-100 p-3 rounded-lg">
                      <Globe className="h-6 w-6 text-accent-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Whitelisted Domains</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.domains}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-3 rounded-lg">
                      <Users className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">0</p>
                      <p className="text-xs text-gray-500">Coming in Phase 3</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onNavigate={setCurrentSection} currentSection={currentSection} />
      <main className="py-8">
        {renderContent()}
      </main>
      
      {/* Security Watermark */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-400 pointer-events-none select-none">
        Flyte Admin Portal • Secure Access
      </div>
    </div>
  )
}