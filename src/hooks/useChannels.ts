import { useState, useEffect } from 'react'
import { supabase, Channel } from '../lib/supabase'
import { useAuth } from './useAuth'

export const useChannels = () => {
  const { user, profile, profileType } = useAuth()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && profile && profileType) {
      fetchChannels()
    } else {
      setLoading(false)
    }
  }, [user, profile, profileType])

  const fetchChannels = async () => {
    if (!user || !profile) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      console.log('🔍 Fetching channels for user:', user.id, 'profile type:', profileType)
      
      // For users, get channels they're members of
      if (profileType === 'user') {
        const enterpriseId = (profile as any).enterprise_id
        console.log('🏢 Enterprise ID:', enterpriseId)

        if (!enterpriseId) {
          setError('No enterprise found for user')
          setLoading(false)
          return
        }

        // Get channels that the user is a member of
        const { data, error } = await supabase
          .from('channels')
          .select(`
            *,
            channel_members!inner (
              user_id,
              role
            )
          `)
          .eq('channel_members.user_id', user.id)
          .eq('enterprise_id', enterpriseId)
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching user channels:', error)
          
          // If no channels found, try to auto-join public channels
          if (error.code === 'PGRST116') { // No rows returned
            console.log('🔄 No channels found, attempting to auto-join public channels...')
            await autoJoinPublicChannels(enterpriseId, user.id)
            // Retry fetching channels
            const { data: retryData, error: retryError } = await supabase
              .from('channels')
              .select(`
                *,
                channel_members!inner (
                  user_id,
                  role
                )
              `)
              .eq('channel_members.user_id', user.id)
              .eq('enterprise_id', enterpriseId)
              .order('created_at', { ascending: true })

            if (retryError) {
              console.error('Retry error:', retryError)
              setError('Failed to load channels')
              return
            }
            setChannels(retryData || [])
            return
          }
          
          setError('Failed to load channels')
          return
        }

        console.log('✅ Channels loaded:', data?.length || 0)
        setChannels(data || [])
      } 
      // For super admins, get all channels (for debugging/management)
      else if (profileType === 'admin') {
        const { data, error } = await supabase
          .from('channels')
          .select('*')
          .order('created_at', { ascending: true })

        if (error) {
          console.error('Error fetching admin channels:', error)
          setError('Failed to load channels')
          return
        }

        setChannels(data || [])
      }
    } catch (error) {
      console.error('Exception fetching channels:', error)
      setError('Failed to load channels')
    } finally {
      setLoading(false)
    }
  }

  const autoJoinPublicChannels = async (enterpriseId: string, userId: string) => {
    try {
      console.log('🔄 Auto-joining public channels for enterprise:', enterpriseId)
      
      // Get all public channels for this enterprise
      const { data: publicChannels, error: channelsError } = await supabase
        .from('channels')
        .select('id')
        .eq('enterprise_id', enterpriseId)
        .eq('type', 'public')

      if (channelsError) {
        console.error('Error fetching public channels:', channelsError)
        return
      }

      console.log('📢 Found public channels:', publicChannels?.length || 0)

      if (publicChannels && publicChannels.length > 0) {
        // Join all public channels
        const memberships = publicChannels.map(channel => ({
          channel_id: channel.id,
          user_id: userId,
          role: 'member' as const
        }))

        const { error: joinError } = await supabase
          .from('channel_members')
          .insert(memberships)

        if (joinError) {
          console.error('Error joining public channels:', joinError)
        } else {
          console.log('✅ Successfully joined public channels')
        }
      }
    } catch (error) {
      console.error('Exception in autoJoinPublicChannels:', error)
    }
  }

  return {
    channels,
    loading,
    error,
    refetch: fetchChannels
  }
}