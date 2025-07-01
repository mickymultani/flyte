import React, { useState } from 'react'
import { Plane, AlertCircle, Shield, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { signUpSuperAdmin } from '../../lib/auth'

export const SuperAdminRegister: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const { data, error } = await signUpSuperAdmin(
        formData.email,
        formData.password,
        formData.fullName
      )

      if (error) throw error

      if (data.user) {
        setSuccess(true)
      }
    } catch (error: any) {
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
  }

  const handleSwitchToLogin = () => {
    navigate('/login')
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
                <p className="text-sm text-green-700">
                  Your super admin account has been created successfully! You can now sign in and start using Flyte.
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
          <p className="text-gray-600 font-medium">Super Admin Registration</p>
          <p className="text-sm text-gray-500 mt-1">Set up your airport operations command center</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create Super Admin Account</h2>
                <p className="text-sm text-gray-600">This account will have full system access</p>
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

              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                placeholder="admin@example.com"
                required
              />

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
                className="w-full"
                size="lg"
              >
                Create Super Admin Account
              </Button>
            </form>

            <div className="mt-6 text-center">
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
          </CardContent>
        </Card>

        {/* Development Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Development Mode</h3>
              <p className="text-sm text-blue-700 mt-1">
                Email confirmation is disabled for development. Your account will be created immediately and ready to use.
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-primary-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-primary-800">Security Notice</h3>
              <p className="text-sm text-primary-700 mt-1">
                This super admin account will have complete control over all enterprises, users, and system settings. 
                Keep these credentials secure and only share with authorized personnel.
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