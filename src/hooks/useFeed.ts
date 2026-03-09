import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useFeed(userId: string) {
  return useQuery({
    queryKey: ['feed', userId],
    queryFn: async () => {
      const { data: followingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      const followingIds = (followingData ?? []).map(f => f.following_id)
      if (followingIds.length === 0) return []

      const { data, error } = await supabase
        .from('reviews')
        .select('*, profiles(id, username, display_name, avatar_url), books(id, title, cover_url)')
        .in('user_id', followingIds)
        .order('created_at', { ascending: false })
        .limit(30)

      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })
}
