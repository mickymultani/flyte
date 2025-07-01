import React, { useState, useEffect } from 'react'
import { Plane, AlertCircle, CheckCircle, Users, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { signUpUser, checkDomainWhitelist } from '../../lib/auth'
import { supabase } from '../../lib/supabase'

export const UserRegister: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'staff',
    departmentId: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [domainStatus, setDomainStatus] = useState<'checking' | 'valid' | 'invalid' | null>(null)
  const [enterpriseInfo, setEnterpriseInfo] = useState<{ id: string; name: string } | null>(null)
  const [departments, setDepartments] = useState<any[]>([])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    return newErrors
  }

  const checkEmailDomain = async (email: string) => {
    if (!email.includes('@')) return

    setDomainStatus('checking')
    setEnterpriseInfo(null)
    setDepartments([])
    
    try {
      const { data, error } = await checkDomainWhitelist(email)
      
      if (error || !data) {
        setDomainStatus('invalid')
        setErrors(prev => ({
          ...prev,
          email: 'Your organization is not subscribed to Flyte. Contact your administrator.'
        }))
      } else {
        setDomainStatus('valid')
        setEnterpriseInfo({ id: data.enterprise_id, name: data.enterprise_name })
        setErrors(prev => {
          const { email, ...rest } = prev
          return rest
        })
        
        // Fetch departments for this enterprise
        fetchDepartments(data.enterprise_id)
      }
    } catch (error) {
      setDomainStatus('invalid')
      setErrors(prev => ({
        ...prev,
        email: 'Unable to verify domain. Please try again.'
      }))
    }
  }

  const fetchDepartments = async (enterpriseId: string) => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('enterprise_id', enterpriseId)
        .order('name')

      if (!error && data) {
        setDepartments(data)
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    if (domainStatus !== 'valid' || !enterpriseInfo) {
      setErrors({ email: 'Please enter a valid whitelisted email address' })
      return
    }

    setLoading(true)
    setErrors({})

    try {
      console.log('🔄 Starting user registration...')
      
      // Create auth user
      const { data: authData, error: authError } = await signUpUser(
        formData.email,
        formData.password,
        formData.fullName,
        enterpriseInfo.id,
        formData.phone.trim() || undefined,
        formData.role
      )

      if (authError) {
        console.error('❌ Auth signup error:', authError)
        throw authError
      }

      if (!authData.user) {
        throw new Error('User creation failed - no user returned')
      }

      console.log('✅ Auth user created successfully')
      
      // Create the user profile immediately
      const { createUserProfile } = await import('../../lib/auth')
      
      const { data: profile, error: profileError } = await createUserProfile(
        authData.user.id,
        formData.email,
        formData.fullName,
        enterpriseInfo.id,
        {
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          departmentId: formData.departmentId || undefined
        }
      )

      if (profileError) {
        console.warn('⚠️ Profile creation failed during registration:', profileError)
        // Don't fail the registration - profile will be created on first login
      } else {
        console.log('✅ Profile created during registration:', profile?.full_name)
      }

      setSuccess(true)
    } catch (error: any) {
      console.error('💥 Registration error:', error)
      setErrors({
        submit: error.message || 'An error occurred during registration'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Check domain when email changes
    if (field === 'email' && value.includes('@')) {
      const timeoutId = setTimeout(() => {
        checkEmailDomain(value)
      }, 500)
      
      return () => clearTimeout(timeoutId)
    }
  }

  const handleSwitchToLogin = () => {
    navigate('/user/login')
  }

  const handleSwitchToAdmin = () => {
    navigate('/admin/login')
  }

  const getDomainStatusIcon = () => {
    switch (domainStatus) {
      case 'checking':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardContent className="text-center py-8">
              <div className="bg-green-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful!</h2>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-700 mb-2">
                  Welcome to <strong>{enterpriseInfo?.name}</strong> on Flyte!
                </p>
                <p className="text-sm text-green-700">
                  Your account has been created successfully. You can now sign in and start collaborating with your team.
                </p>
              </div>

              <Button
                onClick={handleSwitchToLogin}
                className="w-full"
                size="lg"
              >
                Go to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-primary-600 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Plane className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Flyte</h1>
          <p className="text-gray-600 font-medium">Join Your Operations Team</p>
          <p className="text-sm text-gray-500 mt-1">Connect with your airport operations network</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create Account</h2>
                <p className="text-sm text-gray-600">Register with your organization email</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Full Name"
                type="text"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                error={errors.fullName}
                placeholder="Enter your full name"
                required
              />

              <div className="relative">
                <Input
                  label="Work Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={errors.email}
                  placeholder="you@yourcompany.com"
                  required
                />
                {formData.email.includes('@') && (
                  <div className="absolute right-3 top-8 flex items-center">
                    {getDomainStatusIcon()}
                  </div>
                )}
              </div>

              {/* Enterprise Info Display */}
              {domainStatus === 'valid' && enterpriseInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      Joining: {enterpriseInfo.name}
                    </span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    Your email domain is whitelisted for this organization
                  </p>
                </div>
              )}

              <Input
                label="Phone Number (Optional)"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role/Position
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
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

              {/* Department Selection */}
              {departments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department (Optional)
                  </label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => handleInputChange('departmentId', e.target.value)}
                    className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={errors.password}
                placeholder="Enter a secure password"
                helper="Must be at least 8 characters"
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                error={errors.confirmPassword}
                placeholder="Confirm your password"
                required
              />

              {errors.submit && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errors.submit}</span>
                </div>
              )}

              <Button
                type="submit"
                loading={loading}
                disabled={domainStatus !== 'valid'}
                className="w-full"
                size="lg"
              >
                Create Account
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={handleSwitchToLogin}
                    className="text-primary-600 hover:text-primary-500 font-medium transition-colors"
                  >
                    Sign in here
                  </button>
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSwitchToAdmin}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Admin Portal Access →
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Organization Access</h3>
              <p className="text-sm text-blue-700 mt-1">
                You can only register with an email from an organization that's subscribed to Flyte. 
                Contact your system administrator if you're having trouble accessing the system.
              </p>
            </div>
          </div>
        </div>

        {/* Development Notice */}
        <div className="mt-4 bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-primary-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-primary-800">Development Mode</h3>
              <p className="text-sm text-primary-700 mt-1">
                Email confirmation is disabled for development. Your account will be created immediately and ready to use.
              </p>
            </div>
          </div>
        </div>

        {/* Watermark */}
        <div className="fixed bottom-4 right-4 text-xs text-gray-400 pointer-events-none select-none">
          Secure Airport Operations • {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}