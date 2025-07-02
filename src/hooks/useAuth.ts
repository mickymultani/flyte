import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, AdminProfile, UserProfile } from '../lib/supabase'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AdminProfile | UserProfile | null>(null)
  const [profileType, setProfileType] = useState<'admin' | 'user' | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let mounted = true

    // Get initial session with timeout
    const getInitialSession = async () => {
      console.log('🔄 Starting getInitialSession...')
      try {
        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Session timeout')), 5000)
          )
        ])

        console.log('📊 Session result:', { hasSession: !!session, hasUser: !!session?.user, error })

        if (error) {
          console.error('Error getting session:', error)
        }

        if (mounted) {
          const user = session?.user
          setUser(user ?? null)
          
          if (user) {
            console.log('Setting mock profile during initialization...')
            const mockProfile: UserProfile = {
              id: user.id,
              enterprise_id: '2558d36d-23df-456d-98d6-950794a3cc22',
              full_name: 'Cole Nelson',
              email: user.email || 'sales@realo.io',
              status: 'active' as const,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              department_id: undefined,
              role: 'staff' as const,
              phone: '+1 (825) 437-8070'
            }
            setProfile(mockProfile)
            setProfileType('user')
            console.log('✅ Mock profile set during initialization')
          }
          
          setInitializing(false)
          console.log('✅ Initialization completed')
        }
      } catch (error) {
        console.error('Exception getting initial session:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setProfileType(null)
          setInitializing(false)
          console.log('✅ Initialization completed (with error)')
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setProfileType(null)
          setLoading(false)
          return
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const user = session?.user
          setUser(user ?? null)
          setInitializing(false)
          
          if (user) {
            console.log('User authenticated, creating mock profile for enterprise chat demo...')
            const mockProfile: UserProfile = {
              id: user.id,
              enterprise_id: '2558d36d-23df-456d-98d6-950794a3cc22',
              full_name: 'Cole Nelson',
              email: user.email || 'sales@realo.io',
              status: 'active' as const,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              department_id: undefined,
              role: 'staff' as const,
              phone: '+1 (825) 437-8070'
            }
            
            console.log('✅ Mock profile created for enterprise chat:', mockProfile.full_name)
            setProfile(mockProfile)
            setProfileType('user')
            setLoading(false)
          } else {
            setLoading(false)
          }
          return
        }

        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Set profile manually
  const setUserProfile = (profileData: AdminProfile | UserProfile | null, type: 'admin' | 'user' | null = null) => {
    setProfile(profileData)
    setProfileType(type)
  }

  const signOut = async () => {
    try {
      console.log('🚪 Starting sign out process...')
      
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.clear()
      
      const { error } = await supabase.auth.signOut({
        scope: 'global'
      })
      
      if (error) {
        console.error('❌ Supabase sign out error:', error)
      }
      
      console.log('✅ Sign out process completed')
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      return { error: null }
    } catch (error) {
      console.error('💥 Exception during sign out:', error)
      return { error }
    }
  }

  const refreshSession = async () => {
    try {
      const { error } = await supabase.auth.refreshSession()
      if (error) throw error
      return true
    } catch (error) {
      console.error('Session refresh failed:', error)
      return false
    }
  }

  return {
    user,
    profile,
    profileType,
    loading,
    initializing,
    setUserProfile,
    signOut,
    refreshSession,
    isAuthenticated: !!user,
    isSuperAdmin: !!profile && profileType === 'admin' && (profile as AdminProfile).role === 'super_admin',
    isUser: !!profile && profileType === 'user'
  }
}
