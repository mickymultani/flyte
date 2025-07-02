import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, AdminProfile, UserProfile } from '../lib/supabase'
import { getProfile } from '../lib/auth'

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
            console.log('Initial session found, fetching profile from database...')
            setLoading(true)
            
            try {
              const { data: profileData, type: profileType } = await getProfile(user.id)
              
              if (profileData && profileType) {
                console.log('✅ Profile loaded from database:', profileData.full_name)
                setProfile(profileData)
                setProfileType(profileType as 'admin' | 'user')
              } else {
                console.log('❌ No profile found for user:', user.id)
                setProfile(null)
                setProfileType(null)
              }
            } catch (error) {
              console.error('💥 Error fetching profile:', error)
              setProfile(null)
              setProfileType(null)
            } finally {
              setLoading(false)
            }
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
            console.log('User authenticated, fetching profile from database...')
            setLoading(true)
            
            try {
              const { data: profileData, type: profileType } = await getProfile(user.id)
              
              if (profileData && profileType) {
                console.log('✅ Profile loaded from database:', profileData.full_name)
                setProfile(profileData)
                setProfileType(profileType as 'admin' | 'user')
              } else {
                console.log('❌ No profile found for user:', user.id)
                setProfile(null)
                setProfileType(null)
              }
            } catch (error) {
              console.error('💥 Error fetching profile:', error)
              setProfile(null)
              setProfileType(null)
            } finally {
              setLoading(false)
            }
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
