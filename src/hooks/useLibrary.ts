import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type ShelfType = 'want_to_read' | 'reading' | 'completed' | 'dropped'

export function useLibrary(userId: string, shelf?: ShelfType) {
  return useQuery({
    queryKey: ['library', userId, shelf],
    queryFn: async () => {
      let q = supabase
        .from('user_books')
        .select('*, books(id, title, cover_url, page_count, book_authors(role, authors(id, name)), book_ratings(avg_rating, rating_count))')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (shelf) q = q.eq('shelf', shelf)

      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    enabled: !!userId,
  })
}

export function useAddToShelf() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ bookId, shelf, userId }: { bookId: string; shelf: ShelfType; userId: string }) => {
      const { error } = await supabase.from('user_books').upsert(
        { user_id: userId, book_id: bookId, shelf, current_page: 0, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,book_id' }
      )
      if (error) throw error
    },
    onSuccess: (_d, { userId }) => {
      qc.invalidateQueries({ queryKey: ['library', userId] })
    },
  })
}

export function useUpdateProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, bookId, currentPage }: { userId: string; bookId: string; currentPage: number }) => {
      const { error } = await supabase
        .from('user_books')
        .update({ current_page: currentPage, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('book_id', bookId)
      if (error) throw error
    },
    onSuccess: (_d, { userId }) => {
      qc.invalidateQueries({ queryKey: ['library', userId] })
    },
  })
}

export function useRemoveFromShelf() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, bookId }: { userId: string; bookId: string }) => {
      const { error } = await supabase
        .from('user_books')
        .delete()
        .eq('user_id', userId)
        .eq('book_id', bookId)
      if (error) throw error
    },
    onSuccess: (_d, { userId }) => {
      qc.invalidateQueries({ queryKey: ['library', userId] })
    },
  })
}
