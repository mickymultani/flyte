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

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
        }

        if (mounted) {
          setUser(session?.user ?? null)
          setInitializing(false)
        }
      } catch (error) {
        console.error('Exception getting initial session:', error)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setProfileType(null)
          setInitializing(false)
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
          setUser(session?.user ?? null)
          setLoading(false)
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

  return {
    user,
    profile,
    profileType,
    loading,
    initializing,
    setUserProfile,
    isAuthenticated: !!user,
    isSuperAdmin: !!profile && profileType === 'admin' && (profile as AdminProfile).role === 'super_admin',
    isUser: !!profile && profileType === 'user'
  }
}