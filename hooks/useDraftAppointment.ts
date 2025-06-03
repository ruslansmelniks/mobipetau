import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { useState, useEffect } from 'react'
import { getOrCreateDraft, updateDraft } from '@/lib/draftService'

export function useDraftAppointment() {
  const supabase = useSupabaseClient()
  const user = useUser()
  const [draftAppointment, setDraftAppointment] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDraft = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const draft = await getOrCreateDraft(supabase, user.id)
        setDraftAppointment(draft)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadDraft()
  }, [user, supabase])

  const updateDraftAppointment = async (updates: any) => {
    if (!draftAppointment) return
    
    try {
      const updated = await updateDraft(supabase, draftAppointment.id, updates)
      setDraftAppointment(updated)
      return updated
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  return {
    draftAppointment,
    isLoading,
    error,
    updateDraftAppointment,
    refetch: async () => {
      if (user) {
        const draft = await getOrCreateDraft(supabase, user.id)
        setDraftAppointment(draft)
      }
    }
  }
} 