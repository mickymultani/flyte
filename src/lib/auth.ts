import { supabase } from './supabase'

// Super Admin authentication functions
export const signUpSuperAdmin = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'super_admin'
      },
      emailRedirectTo: undefined
    }
  })
  
  return { data, error }
}

// User authentication functions
export const signUpUser = async (email: string, password: string, fullName: string, enterpriseId: string, phone?: string, role?: string) => {
  console.log('🔧 Signing up user:', { email, fullName, enterpriseId, phone, role })
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        user_type: 'user',
        enterprise_id: enterpriseId,
        role: role || 'staff',
        phone: phone || null
      },
      emailRedirectTo: undefined
    }
  })
  
  if (data.user) {
    console.log('✅ User created with metadata:', data.user.user_metadata)
  }
  
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  return { data, error }
}

export const signOut = async () => {
  try {
    console.log('🚪 Starting sign out process...')
    
    // Clear any local state first
    localStorage.removeItem('supabase.auth.token')
    sessionStorage.clear()
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut({
      scope: 'global' // Sign out from all sessions
    })
    
    if (error) {
      console.error('❌ Supabase sign out error:', error)
      // Don't throw - continue with cleanup
    }
    
    console.log('✅ Sign out process completed')
    
    // Small delay to ensure auth state change is processed
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return { error: null }
  } catch (error) {
    console.error('💥 Exception during sign out:', error)
    return { error }
  }
}

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// SIMPLE: Just fetch profile directly from database
export const getProfile = async (userId: string) => {
  console.log('🔍 Fetching profile for user:', userId)
  
  try {
    // Try user_profiles first
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        enterprises (
          id,
          name,
          contact_email,
          status
        ),
        departments (
          id,
          name,
          code,
          description,
          color
        )
      `)
      .eq('id', userId)
      .single()
    
    if (userData && !userError) {
      console.log('✅ Found user profile:', userData.full_name)
      return { data: userData, type: 'user' }
    }
    
    // Try admin_profiles
    const { data: adminData, error: adminError } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (adminData && !adminError) {
      console.log('✅ Found admin profile:', adminData.full_name)
      return { data: adminData, type: 'admin' }
    }
    
    console.log('❌ No profile found')
    return { data: null, type: null }
    
  } catch (error) {
    console.error('💥 Error fetching profile:', error)
    return { data: null, type: null }
  }
}

// SIMPLE: Create user profile
export const createUserProfile = async (userId: string, email: string, fullName: string, enterpriseId: string, additionalData?: {
  phone?: string
  role?: string
  departmentId?: string
}) => {
  console.log('👥 Creating user profile for:', userId)
  
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      enterprise_id: enterpriseId,
      full_name: fullName,
      email,
      phone: additionalData?.phone || null,
      role: additionalData?.role || 'staff',
      department_id: additionalData?.departmentId || null,
      status: 'active'
    })
    .select(`
      *,
      enterprises (
        id,
        name,
        contact_email,
        status
      ),
      departments (
        id,
        name,
        code,
        description,
        color
      )
    `)
    .single()
  
  if (error) {
    console.error('❌ Error creating user profile:', error)
  } else {
    console.log('✅ User profile created:', data.full_name)
  }
  
  return { data, error }
}

// SIMPLE: Create admin profile
export const createAdminProfile = async (userId: string, email: string, fullName: string) => {
  console.log('🔧 Creating admin profile for:', userId)
  
  const { data, error } = await supabase
    .from('admin_profiles')
    .insert({
      id: userId,
      full_name: fullName,
      email,
      role: 'super_admin'
    })
    .select()
    .single()
  
  if (error) {
    console.error('❌ Error creating admin profile:', error)
  } else {
    console.log('✅ Admin profile created:', data.full_name)
  }
  
  return { data, error }
}

// Domain checking function
export const checkDomainWhitelist = async (email: string) => {
  console.log('🔍 Checking domain whitelist for:', email)
  const { data, error } = await supabase
    .rpc('check_domain_whitelist', { email_address: email })
  
  if (data?.[0]) {
    console.log('✅ Domain whitelisted for enterprise:', data[0].enterprise_name)
  } else {
    console.log('❌ Domain not whitelisted or error:', error?.message)
  }
  
  return { data: data?.[0] || null, error }
}