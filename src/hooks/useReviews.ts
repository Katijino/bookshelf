import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useReviews(bookId: string) {
  return useQuery({
    queryKey: ['reviews', bookId],
    queryFn: async () => {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false })
      if (error) throw error
      if (!reviews || reviews.length === 0) return []

      const userIds = [...new Set(reviews.map((r: any) => r.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)

      const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))
      return reviews.map((r: any) => ({ ...r, profiles: profileMap[r.user_id] ?? null }))
    },
    enabled: !!bookId,
  })
}

export function useMyReview(bookId: string, userId: string) {
  return useQuery({
    queryKey: ['my-review', bookId, userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', userId)
        .maybeSingle()
      return data
    },
    enabled: !!bookId && !!userId,
  })
}

export function useSubmitReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (review: { user_id: string; book_id: string; rating?: number; body?: string; spoiler?: boolean }) => {
      const { error } = await supabase
        .from('reviews')
        .upsert({ ...review, updated_at: new Date().toISOString() }, { onConflict: 'user_id,book_id' })
      if (error) throw error
    },
    onSuccess: (_d, { book_id }) => {
      qc.invalidateQueries({ queryKey: ['reviews', book_id] })
      qc.invalidateQueries({ queryKey: ['my-review', book_id] })
      qc.invalidateQueries({ queryKey: ['books', 'popular'] })
      qc.invalidateQueries({ queryKey: ['book', book_id] })
    },
  })
}

export function useDeleteReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, bookId }: { id: string; bookId: string }) => {
      const { error } = await supabase.from('reviews').delete().eq('id', id)
      if (error) throw error
      return bookId
    },
    onSuccess: (_d, { bookId }) => {
      qc.invalidateQueries({ queryKey: ['reviews', bookId] })
      qc.invalidateQueries({ queryKey: ['my-review', bookId] })
      qc.invalidateQueries({ queryKey: ['book', bookId] })
    },
  })
}
