import React, { useState, useEffect } from 'react'
import { X, User, Mail, Phone, MapPin, Radio, Clock, Shield, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { supabase, Department } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface AddContactModalProps {
  onClose: () => void
  onContactAdded: () => void
}

export const AddContactModal: React.FC<AddContactModalProps> = ({
  onClose,
  onContactAdded
}) => {
  const { profile } = useAuth()
  const [departments, setDepartments] = useState<Department[]>([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    radioChannel: '',
    location: '',
    shiftPattern: '',
    departmentId: '',
    emergencyContact: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('enterprise_id', (profile as any).enterprise_id)
        .order('name')

      if (error) throw error
      setDepartments(data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.role.trim()) {
      setError('Name and role are required')
      return
    }

    if (!profile) {
      setError('Authentication required. Please sign in again.')
      return
    }

    const enterpriseId = (profile as any).enterprise_id
    if (!enterpriseId) {
      setError('Enterprise information not found. Please contact support.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const contactData = {
        enterprise_id: enterpriseId,
        name: formData.name.trim(),
        role: formData.role.trim(),
        phone: formData.phone.trim() || null,
        radio_channel: formData.radioChannel.trim() || null,
        location: formData.location.trim() || null,
        shift_pattern: formData.shiftPattern.trim() || null,
        department_id: formData.departmentId || null,
        emergency_contact: formData.emergencyContact,
        status: 'active'
      }

      const { error: contactError } = await supabase
        .from('contacts')
        .insert(contactData)

      if (contactError) {
        console.error('Contact creation error:', contactError)
        throw contactError
      }

      // If email is provided, try to find and link existing user
      if (formData.email.trim()) {
        try {
          const { data: existingUser } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('email', formData.email.trim())
            .eq('enterprise_id', enterpriseId)
            .single()

          if (existingUser) {
            // Update the contact to link to the user
            await supabase
              .from('contacts')
              .update({ user_id: existingUser.id })
              .eq('enterprise_id', enterpriseId)
              .eq('name', formData.name.trim())
              .eq('role', formData.role.trim())
          }
        } catch (linkError) {
          // User doesn't exist, that's fine - contact is still created
          console.log('No existing user found for email:', formData.email)
        }
      }

      onContactAdded()
      onClose()
    } catch (error: any) {
      console.error('Error creating contact:', error)
      setError(error.message || 'Failed to create contact')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Add Contact</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="John Smith"
              required
            />

            <Input
              label="Email (Optional)"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john.smith@company.com"
              helper="If this person has a user account, we'll link them automatically"
            />

            <Input
              label="Role/Position"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              placeholder="Security Officer"
              required
            />

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

            <Input
              label="Phone Number (Optional)"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
            />

            <Input
              label="Radio Channel (Optional)"
              value={formData.radioChannel}
              onChange={(e) => setFormData(prev => ({ ...prev, radioChannel: e.target.value }))}
              placeholder="Channel 5"
            />

            <Input
              label="Location (Optional)"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Terminal A Security"
            />

            <Input
              label="Shift Pattern (Optional)"
              value={formData.shiftPattern}
              onChange={(e) => setFormData(prev => ({ ...prev, shiftPattern: e.target.value }))}
              placeholder="Day Shift (6AM - 6PM)"
            />

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="emergencyContact"
                checked={formData.emergencyContact}
                onChange={(e) => setFormData(prev => ({ ...prev, emergencyContact: e.target.checked }))}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="emergencyContact" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Shield className="h-4 w-4 text-red-500" />
                <span>Emergency Contact</span>
              </label>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button type="submit" loading={loading} className="flex-1">
                Add Contact
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}