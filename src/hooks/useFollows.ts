import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useIsFollowing(followerId: string, followingId: string) {
  return useQuery({
    queryKey: ['is-following', followerId, followingId],
    queryFn: async () => {
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .maybeSingle()
      return !!data
    },
    enabled: !!followerId && !!followingId && followerId !== followingId,
  })
}

export function useFollowers(userId: string) {
  return useQuery({
    queryKey: ['followers', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('profiles!follows_follower_id_fkey(id, username, display_name, avatar_url)')
        .eq('following_id', userId)
      if (error) throw error
      return (data ?? []).map((r: any) => r.profiles).filter(Boolean)
    },
    enabled: !!userId,
  })
}

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: ['following', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follows')
        .select('profiles!follows_following_id_fkey(id, username, display_name, avatar_url)')
        .eq('follower_id', userId)
      if (error) throw error
      return (data ?? []).map((r: any) => r.profiles).filter(Boolean)
    },
    enabled: !!userId,
  })
}

export function useFollow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ followerId, followingId }: { followerId: string; followingId: string }) => {
      const { error } = await supabase.from('follows').insert({ follower_id: followerId, following_id: followingId })
      if (error) throw error
    },
    onSuccess: (_d, { followerId, followingId }) => {
      qc.invalidateQueries({ queryKey: ['is-following', followerId, followingId] })
      qc.invalidateQueries({ queryKey: ['followers', followingId] })
      qc.invalidateQueries({ queryKey: ['profile-stats'] })
    },
  })
}

export function useUnfollow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ followerId, followingId }: { followerId: string; followingId: string }) => {
      const { error } = await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)
      if (error) throw error
    },
    onSuccess: (_d, { followerId, followingId }) => {
      qc.invalidateQueries({ queryKey: ['is-following', followerId, followingId] })
      qc.invalidateQueries({ queryKey: ['followers', followingId] })
      qc.invalidateQueries({ queryKey: ['profile-stats'] })
    },
  })
}
