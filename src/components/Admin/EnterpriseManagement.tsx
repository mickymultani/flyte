import React, { useState, useEffect } from 'react'
import { Plus, Building2, Mail, Globe, AlertCircle, CheckCircle, Archive, Trash2, Search } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card, CardContent, CardHeader } from '../ui/Card'
import { supabase, Enterprise } from '../../lib/supabase'

export const EnterpriseManagement: React.FC = () => {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showDomainForm, setShowDomainForm] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: ''
  })
  const [domainInput, setDomainInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchEnterprises()
  }, [])

  const fetchEnterprises = async () => {
    try {
      const { data, error } = await supabase
        .from('enterprises')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setEnterprises(data || [])
    } catch (error) {
      console.error('Error fetching enterprises:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEnterprise = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.contactEmail.trim()) {
      setErrors({ form: 'All fields are required' })
      return
    }

    if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      setErrors({ form: 'Please enter a valid email address' })
      return
    }

    try {
      const { error } = await supabase
        .from('enterprises')
        .insert({
          name: formData.name.trim(),
          contact_email: formData.contactEmail.trim(),
          domains: [] // Start with empty domains array
        })

      if (error) throw error

      setFormData({ name: '', contactEmail: '' })
      setShowCreateForm(false)
      setErrors({})
      await fetchEnterprises()
    } catch (error: any) {
      setErrors({ form: error.message })
    }
  }

  const handleAddDomain = async (enterpriseId: string) => {
    if (!domainInput.trim()) {
      setErrors({ domain: 'Domain is required' })
      return
    }

    // Ensure domain starts with @
    const domain = domainInput.startsWith('@') ? domainInput : `@${domainInput}`

    // Validate domain format
    if (!/^@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
      setErrors({ domain: 'Please enter a valid domain (e.g., @company.com)' })
      return
    }

    try {
      // Get current enterprise
      const enterprise = enterprises.find(e => e.id === enterpriseId)
      if (!enterprise) {
        setErrors({ domain: 'Enterprise not found' })
        return
      }

      // Check if domain already exists
      if (enterprise.domains.includes(domain.toLowerCase())) {
        setErrors({ domain: 'This domain is already whitelisted for this enterprise' })
        return
      }

      // Add domain to the array
      const updatedDomains = [...enterprise.domains, domain.toLowerCase()]

      const { error } = await supabase
        .from('enterprises')
        .update({ domains: updatedDomains })
        .eq('id', enterpriseId)

      if (error) throw error

      setDomainInput('')
      setShowDomainForm(null)
      setErrors({})
      await fetchEnterprises()
    } catch (error: any) {
      setErrors({ domain: error.message })
    }
  }

  const handleDeleteDomain = async (enterpriseId: string, domainToDelete: string) => {
    if (!confirm('Are you sure you want to remove this domain? Users with this domain will no longer be able to register.')) return

    try {
      // Get current enterprise
      const enterprise = enterprises.find(e => e.id === enterpriseId)
      if (!enterprise) return

      // Remove domain from the array
      const updatedDomains = enterprise.domains.filter(d => d !== domainToDelete)

      const { error } = await supabase
        .from('enterprises')
        .update({ domains: updatedDomains })
        .eq('id', enterpriseId)

      if (error) throw error
      await fetchEnterprises()
    } catch (error: any) {
      console.error('Error deleting domain:', error)
    }
  }

  const toggleEnterpriseStatus = async (enterpriseId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'archived' : 'active'
    
    try {
      const { error } = await supabase
        .from('enterprises')
        .update({ status: newStatus })
        .eq('id', enterpriseId)

      if (error) throw error
      await fetchEnterprises()
    } catch (error: any) {
      console.error('Error updating enterprise status:', error)
    }
  }

  const filteredEnterprises = enterprises.filter(enterprise =>
    enterprise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enterprise.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Management</h1>
          <p className="text-gray-600 mt-1">Manage airport organizations and their domain access</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Enterprise</span>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search enterprises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredEnterprises.length} of {enterprises.length} enterprises
        </div>
      </div>

      {/* Create Enterprise Form */}
      {showCreateForm && (
        <Card className="shadow-lg">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Create New Enterprise</h2>
            <p className="text-sm text-gray-600">Add a new airport organization to the platform</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateEnterprise} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Enterprise Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Toronto Pearson Airport"
                  required
                />
                <Input
                  label="Contact Email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contact@airport.com"
                  required
                />
              </div>
              
              {errors.form && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{errors.form}</span>
                </div>
              )}

              <div className="flex space-x-3">
                <Button type="submit">Create Enterprise</Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => {
                    setShowCreateForm(false)
                    setFormData({ name: '', contactEmail: '' })
                    setErrors({})
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Enterprises List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEnterprises.map((enterprise) => {
          return (
            <Card key={enterprise.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary-100 p-3 rounded-lg">
                      <Building2 className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{enterprise.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{enterprise.contact_email}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Created {new Date(enterprise.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        enterprise.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {enterprise.status}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleEnterpriseStatus(enterprise.id, enterprise.status)}
                      title={enterprise.status === 'active' ? 'Archive enterprise' : 'Activate enterprise'}
                    >
                      {enterprise.status === 'active' ? 
                        <Archive className="h-4 w-4" /> : 
                        <CheckCircle className="h-4 w-4" />
                      }
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Whitelisted Domains */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span>Whitelisted Domains ({enterprise.domains.length})</span>
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDomainForm(enterprise.id)}
                      className="text-primary-600 hover:bg-primary-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Domain
                    </Button>
                  </div>

                  {/* Add Domain Form */}
                  {showDomainForm === enterprise.id && (
                    <div className="bg-gray-50 p-4 rounded-lg space-y-3 border">
                      <div className="flex space-x-2">
                        <Input
                          placeholder="@company.com"
                          value={domainInput}
                          onChange={(e) => setDomainInput(e.target.value)}
                          error={errors.domain}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddDomain(enterprise.id)}
                        >
                          Add
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setShowDomainForm(null)
                            setDomainInput('')
                            setErrors({})
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Domain List */}
                  <div className="space-y-2">
                    {enterprise.domains.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No domains whitelisted yet</p>
                        <p className="text-xs text-gray-400">Add domains to allow user registration</p>
                      </div>
                    ) : (
                      enterprise.domains.map((domain, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-white border border-gray-200 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-green-100 p-1 rounded">
                              <Globe className="h-3 w-3 text-green-600" />
                            </div>
                            <span className="text-sm font-mono text-gray-700">{domain}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDomain(enterprise.id, domain)}
                            className="text-red-600 hover:bg-red-50"
                            title="Remove domain"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredEnterprises.length === 0 && enterprises.length === 0 && (
        <Card className="shadow-lg">
          <CardContent className="text-center py-12">
            <div className="bg-primary-100 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No enterprises yet</h3>
            <p className="text-gray-600 mb-6">Create your first enterprise to get started with managing airport organizations</p>
            <Button onClick={() => setShowCreateForm(true)} className="inline-flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Create First Enterprise
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No Search Results */}
      {filteredEnterprises.length === 0 && enterprises.length > 0 && (
        <Card className="shadow-lg">
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No enterprises found</h3>
            <p className="text-gray-600 mb-4">
              No enterprises match your search for "{searchTerm}"
            </p>
            <Button 
              variant="secondary" 
              onClick={() => setSearchTerm('')}
            >
              Clear Search
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}