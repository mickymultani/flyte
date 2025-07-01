import { useState, useEffect } from 'react'
import { supabase, Message } from '../lib/supabase'
import { useAuth } from './useAuth'

export const useChatMessages = (channelId: string | null) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!channelId) {
      setMessages([])
      return
    }

    fetchMessages()
    subscribeToMessages()
  }, [channelId])

  const fetchMessages = async () => {
    if (!channelId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          user_profiles (
            id,
            full_name,
            email
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })
        .limit(100)

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    if (!channelId) return

    const subscription = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`
        },
        async (payload) => {
          // Fetch the complete message with user profile
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              user_profiles (
                id,
                full_name,
                email
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (!error && data) {
            setMessages(prev => [...prev, data])
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  const sendMessage = async (content: string) => {
    if (!channelId || !user || !content.trim()) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          content: content.trim(),
          type: 'text'
        })

      if (error) throw error
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    } finally {
      setSending(false)
    }
  }

  return {
    messages,
    loading,
    sending,
    sendMessage
  }
}