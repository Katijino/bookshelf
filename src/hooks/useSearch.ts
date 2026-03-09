import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      const [booksRes, authorsRes] = await Promise.all([
        supabase
          .from('books')
          .select('*, book_authors(role, authors(id, name)), book_ratings(avg_rating, rating_count)')
          .ilike('title', `%${query}%`)
          .limit(12),
        supabase
          .from('authors')
          .select('*')
          .ilike('name', `%${query}%`)
          .limit(6),
      ])
      return {
        books: booksRes.data ?? [],
        authors: authorsRes.data ?? [],
      }
    },
    enabled: query.length >= 2,
  })
}
