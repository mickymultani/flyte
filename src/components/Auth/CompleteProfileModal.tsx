import React, { useState, useEffect } from 'react'
import { User, Building2, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { supabase, Department } from '../../lib/supabase'
import { createUserProfile } from '../../lib/auth'

interface CompleteProfileModalProps {
  user: any
  enterpriseId: string
  enterpriseName: string
  onProfileCompleted: (profile: any) => void
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  user,
  enterpriseId,
  enterpriseName,
  onProfileCompleted
}) => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [formData, setFormData] = useState({
    fullName: user.user_metadata?.full_name || '',
    email: user.email || '',
    phone: '',
    role: 'staff',
    departmentId: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .order('name')

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      console.log('📝 Creating complete user profile...')
      
      const { data: profile, error: profileError } = await createUserProfile(
        user.id,
        formData.email,
        formData.fullName.trim(),
        enterpriseId,
        {
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          departmentId: formData.departmentId || undefined
        }
      )

      if (profileError) {
        console.error('❌ Profile creation error:', profileError)
        throw profileError
      }

      console.log('✅ Profile created successfully:', profile)
      onProfileCompleted(profile)
    } catch (error: any) {
      console.error('💥 Error creating profile:', error)
      setError(error.message || 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="text-center">
            <div className="bg-primary-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Complete Your Profile</h2>
            <p className="text-sm text-gray-600 mt-1">
              Please complete your profile to access Flyte
            </p>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Enterprise Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Joining: {enterpriseName}
              </span>
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Your email domain is whitelisted for this organization
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="John Smith"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john.smith@company.com"
              disabled
              helper="This is your verified email address"
            />

            <Input
              label="Phone Number (Optional)"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role/Position
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="staff">Staff</option>
                <option value="supervisor">Supervisor</option>
                <option value="manager">Manager</option>
                <option value="coordinator">Coordinator</option>
                <option value="technician">Technician</option>
                <option value="security">Security Officer</option>
                <option value="maintenance">Maintenance</option>
                <option value="customer_service">Customer Service</option>
              </select>
            </div>

            {departments.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department (Optional)
                </label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
                  className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Complete Profile & Continue
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              By completing your profile, you agree to follow your organization's communication policies
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
