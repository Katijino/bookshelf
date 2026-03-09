import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

const BOOK_SELECT = `
  *,
  book_authors ( role, authors ( id, name, photo_url, bio, ol_key ) ),
  book_genres  ( genres ( id, name, slug, book_count ) ),
  book_ratings ( avg_rating, rating_count ),
  editions     ( * )
`

export function useBook(id: string) {
  return useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(BOOK_SELECT)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useBooks(options: { genre?: string; search?: string; limit?: number } = {}) {
  const { genre, search, limit = 40 } = options
  return useQuery({
    queryKey: ['books', options],
    queryFn: async () => {
      let q = supabase.from('books').select('*, book_authors(role, authors(id, name)), book_ratings(avg_rating, rating_count)')

      if (search) q = q.ilike('title', `%${search}%`)
      if (genre) {
        const { data: genreRow } = await supabase.from('genres').select('id').eq('slug', genre).single()
        if (genreRow) {
          const { data: bookIds } = await supabase.from('book_genres').select('book_id').eq('genre_id', genreRow.id)
          if (bookIds) q = q.in('id', bookIds.map(b => b.book_id))
        }
      }

      const { data, error } = await q.limit(limit).order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function usePopularBooks() {
  return useQuery({
    queryKey: ['books', 'popular'],
    queryFn: async () => {
      // First try books that have ratings
      const { data: ratedBooks } = await supabase
        .from('book_ratings')
        .select('book_id, rating_count, avg_rating')
        .order('rating_count', { ascending: false })
        .limit(20)

      if (ratedBooks && ratedBooks.length >= 5) {
        const ids = ratedBooks.map((r: any) => r.book_id)
        const { data } = await supabase
          .from('books')
          .select('*, book_authors(role, authors(id, name)), book_ratings(avg_rating, rating_count)')
          .in('id', ids)
        return (data ?? []).sort((a: any, b: any) =>
          (b.book_ratings?.rating_count ?? 0) - (a.book_ratings?.rating_count ?? 0))
      }

      // Fall back to most-shelved by querying user_books
      const { data: shelved } = await supabase
        .from('user_books')
        .select('book_id')

      if (shelved && shelved.length > 0) {
        const counts: Record<string, number> = {}
        for (const row of shelved as any[]) {
          counts[row.book_id] = (counts[row.book_id] ?? 0) + 1
        }
        const topIds = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([id]) => id)
        if (topIds.length) {
          const { data } = await supabase
            .from('books')
            .select('*, book_authors(role, authors(id, name)), book_ratings(avg_rating, rating_count)')
            .in('id', topIds)
          return (data ?? []).sort((a: any, b: any) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0))
        }
      }

      // Final fallback: newest added
      const { data, error } = await supabase
        .from('books')
        .select('*, book_authors(role, authors(id, name)), book_ratings(avg_rating, rating_count)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useRecentBooks() {
  return useQuery({
    queryKey: ['books', 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*, book_authors(role, authors(id, name)), book_ratings(avg_rating, rating_count)')
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAuthorBooks(authorId: string) {
  return useQuery({
    queryKey: ['author-books', authorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_authors')
        .select('books(*, book_authors(role, authors(id, name)), book_ratings(avg_rating, rating_count))')
        .eq('author_id', authorId)
      if (error) throw error
      return (data ?? []).map((row: any) => row.books).filter(Boolean)
    },
    enabled: !!authorId,
  })
}
