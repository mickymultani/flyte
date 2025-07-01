import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export const ProfileDebug: React.FC = () => {
  const { user } = useAuth()
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const testDirectQuery = async () => {
    if (!user) return
    
    setLoading(true)
    const testResults: any = {}

    try {
      // Test 1: Direct user_profiles query
      console.log('🔍 Testing user_profiles query...')
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)

      testResults.userProfiles = {
        data: userData,
        error: userError,
        count: userData?.length || 0
      }

      // Test 2: Direct admin_profiles query
      console.log('🔍 Testing admin_profiles query...')
      const { data: adminData, error: adminError } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', user.id)

      testResults.adminProfiles = {
        data: adminData,
        error: adminError,
        count: adminData?.length || 0
      }

      // Test 3: Check RLS policies
      console.log('🔍 Testing RLS...')
      const { data: { session } } = await supabase.auth.getSession()
      testResults.session = {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email
      }

      // Test 4: Raw SQL query
      console.log('🔍 Testing raw query...')
      const { data: rawData, error: rawError } = await supabase
        .rpc('get_user_profile_debug', { user_id: user.id })

      testResults.rawQuery = {
        data: rawData,
        error: rawError
      }

      setResults(testResults)
      console.log('🔍 Test results:', testResults)

    } catch (error) {
      console.error('💥 Test error:', error)
      testResults.error = error
      setResults(testResults)
    } finally {
      setLoading(false)
    }
  }

  const createTestProfile = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Try to create a simple user profile
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: user.id,
          enterprise_id: '00000000-0000-0000-0000-000000000000', // Dummy enterprise
          full_name: user.user_metadata?.full_name || 'Test User',
          email: user.email || 'test@example.com',
          status: 'active'
        })
        .select()

      console.log('📝 Create result:', { data, error })
      
      // Refresh tests
      await testDirectQuery()
    } catch (error) {
      console.error('💥 Create error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return <div>No user logged in</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Profile Debug Tool</h1>
      
      <div className="mb-4 space-x-2">
        <button
          onClick={testDirectQuery}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Run Tests'}
        </button>
        
        <button
          onClick={createTestProfile}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          Create Test Profile
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg mb-4">
        <h3 className="font-bold mb-2">Current User:</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify({
            id: user.id,
            email: user.email,
            metadata: user.user_metadata
          }, null, 2)}
        </pre>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Test Results:</h3>
          
          {Object.entries(results).map(([key, value]) => (
            <div key={key} className="bg-white border rounded-lg p-4">
              <h4 className="font-semibold mb-2 capitalize">{key.replace(/([A-Z])/g, ' $1')}</h4>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(value, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}