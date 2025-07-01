import { useState, useEffect } from 'react'
import { supabase, ChannelMember } from '../lib/supabase'

export const useChannelMembers = (channelId: string) => {
  const [members, setMembers] = useState<ChannelMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (channelId) {
      fetchMembers()
    }
  }, [channelId])

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('channel_members')
        .select(`
          *,
          user_profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('channel_id', channelId)
        .order('role', { ascending: false }) // Admins first

      if (error) throw error
      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching channel members:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    members,
    loading,
    refetch: fetchMembers
  }
}