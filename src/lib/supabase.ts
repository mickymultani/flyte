import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions for our database schema
export interface AdminProfile {
  id: string
  full_name: string
  email: string
  role: 'super_admin'
  enterprise_id?: string
  status: 'active' | 'suspended'
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  enterprise_id: string
  full_name: string
  email: string
  department_id?: string
  role?: string
  phone?: string
  status: 'active' | 'suspended'
  created_at: string
  updated_at: string
  enterprises?: Enterprise
  departments?: Department
}

export interface Enterprise {
  id: string
  name: string
  contact_email: string
  domains: string[]  // Array of domains like ["@company.com", "@subsidiary.com"]
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  enterprise_id: string
  name: string
  code: string
  description?: string
  color: string
  created_at: string
  updated_at: string
}

export interface Channel {
  id: string
  enterprise_id: string
  department_id?: string
  name: string
  description?: string
  type: 'public' | 'private' | 'department'
  created_by: string
  created_at: string
  updated_at: string
  unread_count?: number
}

export interface Message {
  id: string
  channel_id: string
  user_id: string
  content: string
  type: 'text' | 'file' | 'image' | 'alert' | 'handover'
  file_url?: string
  metadata?: any
  created_at: string
  updated_at: string
  user_profiles?: {
    id: string
    full_name: string
    email: string
  }
}

export interface ChannelMember {
  id: string
  channel_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
  user_profiles?: {
    id: string
    full_name: string
    email: string
  }
}

export interface Shift {
  id: string
  enterprise_id: string
  department_id?: string
  name: string
  start_time: string
  end_time: string
  handover_notes?: string
  status: 'active' | 'completed' | 'cancelled'
  assigned_to?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Incident {
  id: string
  enterprise_id: string
  department_id?: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  location?: string
  reported_by: string
  assigned_to?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  enterprise_id: string
  department_id?: string
  title: string
  description?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_date?: string
  assigned_to?: string
  created_by: string
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: string
  enterprise_id: string
  department_id?: string
  name: string
  type: string
  model?: string
  serial_number?: string
  location?: string
  status: 'operational' | 'maintenance' | 'out_of_service' | 'repair'
  last_maintenance?: string
  next_maintenance?: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

export interface Announcement {
  id: string
  enterprise_id: string
  title: string
  content: string
  type: 'info' | 'warning' | 'alert' | 'emergency'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  target_departments?: string[]
  expires_at?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  enterprise_id: string
  user_id?: string
  name: string
  role: string
  department_id?: string
  phone?: string
  radio_channel?: string
  location?: string
  shift_pattern?: string
  emergency_contact: boolean
  status: 'active' | 'off_duty' | 'unavailable'
  created_at: string
  updated_at: string
}