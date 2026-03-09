import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useProfile(identifier: string) {
  return useQuery({
    queryKey: ['profile', identifier],
    queryFn: async () => {
      const isUuid = /^[0-9a-f-]{36}$/i.test(identifier)
      const q = supabase.from('profiles').select('*, favorite_book:favorite_book_id(id, title, cover_url)')
      const { data, error } = isUuid
        ? await q.eq('id', identifier).single()
        : await q.eq('username', identifier).single()
      if (error) throw error
      return data
    },
    enabled: !!identifier,
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useProfileStats(userId: string) {
  return useQuery({
    queryKey: ['profile-stats', userId],
    queryFn: async () => {
      const [booksRes, followersRes, followingRes] = await Promise.all([
        supabase.from('user_books').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('shelf', 'completed'),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
      ])
      return {
        booksRead: booksRes.count ?? 0,
        followersCount: followersRes.count ?? 0,
        followingCount: followingRes.count ?? 0,
      }
    },
    enabled: !!userId,
  })
}
