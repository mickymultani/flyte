import React, { useState, useEffect } from 'react'
import { UserCheck, Phone, Radio, MapPin, Clock, Search, Shield, Wrench, Users, Headphones, Plus } from 'lucide-react'
import { Button } from '../ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { supabase, Contact } from '../../lib/supabase'
import { AddContactModal } from './AddContactModal'

interface ContactsSidebarProps {
  searchTerm: string
}

export const ContactsSidebar: React.FC<ContactsSidebarProps> = ({ searchTerm }) => {
  const { profile } = useAuth()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddContact, setShowAddContact] = useState(false)

  useEffect(() => {
    if (profile) {
      fetchContacts()
    } else {
      setLoading(false)
    }
  }, [profile])

  const fetchContacts = async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          departments (
            name,
            color
          )
        `)
        .eq('enterprise_id', (profile as any).enterprise_id)
        .eq('status', 'active')
        .order('emergency_contact', { ascending: false })
        .order('name', { ascending: true })

      if (error) throw error
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact as any).departments?.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const emergencyContacts = filteredContacts.filter(c => c.emergency_contact)
  const regularContacts = filteredContacts.filter(c => !c.emergency_contact)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'off_duty': return 'bg-yellow-500'
      case 'unavailable': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getDepartmentIcon = (departmentName: string) => {
    const name = departmentName?.toLowerCase()
    if (name?.includes('security')) return Shield
    if (name?.includes('maintenance')) return Wrench
    if (name?.includes('customer')) return Headphones
    return Users
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {loading ? (
        <div className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Emergency Contacts */}
          {emergencyContacts.length > 0 && (
            <div className="p-2 border-b border-gray-100">
              <h3 className="text-sm font-medium text-red-700 px-2 py-2 mb-2 flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>Emergency Contacts</span>
              </h3>
              <div className="space-y-1">
                {emergencyContacts.map((contact) => {
                  const DepartmentIcon = getDepartmentIcon((contact as any).departments?.name)
                  return (
                    <div
                      key={contact.id}
                      className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <DepartmentIcon className="h-5 w-5 text-white" />
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(contact.status)} rounded-full border-2 border-white`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{contact.name}</p>
                          <p className="text-xs text-gray-600 truncate">{contact.role}</p>
                          {contact.phone && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                              <Phone className="h-3 w-3" />
                              <span>{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Regular Contacts */}
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-2 mb-2">
              <h3 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <UserCheck className="h-4 w-4" />
                <span>Staff Directory ({regularContacts.length})</span>
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6"
                onClick={() => setShowAddContact(true)}
                title="Add Contact"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="space-y-1">
              {regularContacts.map((contact) => {
                const DepartmentIcon = getDepartmentIcon((contact as any).departments?.name)
                return (
                  <div
                    key={contact.id}
                    className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ 
                            backgroundColor: (contact as any).departments?.color || '#6B7280' 
                          }}
                        >
                          <DepartmentIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(contact.status)} rounded-full border-2 border-white`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{contact.name}</p>
                        <p className="text-xs text-gray-600 truncate">{contact.role}</p>
                        {(contact as any).departments && (
                          <p className="text-xs text-gray-500 truncate">
                            {(contact as any).departments.name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="mt-2 space-y-1">
                      {contact.phone && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Phone className="h-3 w-3" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.radio_channel && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Radio className="h-3 w-3" />
                          <span>Channel {contact.radio_channel}</span>
                        </div>
                      )}
                      {contact.location && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <MapPin className="h-3 w-3" />
                          <span>{contact.location}</span>
                        </div>
                      )}
                      {contact.shift_pattern && (
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{contact.shift_pattern}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {filteredContacts.length === 0 && (
              <div className="p-6 text-center">
                {searchTerm ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">No contacts found</p>
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
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <UserCheck className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Contacts</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Build your team directory by adding staff contacts
                    </p>
                    <Button 
                      size="sm"
                      onClick={() => setShowAddContact(true)}
                      className="inline-flex items-center"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Contact
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onContactAdded={fetchContacts}
        />
      )}
    </div>
  )
}