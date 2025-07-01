import React, { useState } from 'react'
import { Plane, AlertCircle, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { signIn } from '../../lib/auth'

export const UserLogin: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
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
      const { error } = await signIn(formData.email, formData.password)
      
      if (error) throw error

      // Success - useAuth hook will handle the redirect
    } catch (error: any) {
      setErrors({
        submit: error.message || 'Invalid email or password'
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

  const handleSwitchToRegister = () => {
    navigate('/user/register')
  }

  const handleSwitchToAdmin = () => {
    navigate('/admin/login')
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
          <p className="text-gray-600 font-medium">Welcome Back</p>
          <p className="text-sm text-gray-500 mt-1">Sign in to access your operations dashboard</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">User Sign In</h2>
                <p className="text-sm text-gray-600">Access your airport operations platform</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Work Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                placeholder="you@yourcompany.com"
                required
              />

              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={errors.password}
                placeholder="Enter your password"
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
                Sign In
              </Button>
            </form>

            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={handleSwitchToRegister}
                    className="text-primary-600 hover:text-primary-500 font-medium transition-colors"
                  >
                    Register here
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

        {/* Info Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Organization Access</h3>
              <p className="text-sm text-blue-700 mt-1">
                You can only access Flyte with an email from an organization that's subscribed to our platform. 
                Contact your system administrator if you're having trouble accessing the system.
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