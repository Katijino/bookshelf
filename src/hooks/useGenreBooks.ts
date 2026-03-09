import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type GenreSort = 'popular' | 'rated' | 'newest'

export function useGenreBooks(slug: string, sort: GenreSort = 'popular', page = 0) {
  const limit = 24
  const offset = page * limit

  return useQuery({
    queryKey: ['genre-books', slug, sort, page],
    queryFn: async () => {
      // Get genre ID
      const { data: genreRow, error: genreError } = await supabase
        .from('genres')
        .select('id, name, slug')
        .eq('slug', slug)
        .single()
      if (genreError || !genreRow) throw new Error('Genre not found')

      // Get book IDs for this genre
      const { data: bookGenres, error: bgError } = await supabase
        .from('book_genres')
        .select('book_id')
        .eq('genre_id', genreRow.id)
      if (bgError) throw bgError

      const bookIds = (bookGenres ?? []).map(bg => bg.book_id)
      if (bookIds.length === 0) return { genre: genreRow, books: [], total: 0 }

      // Get total count
      const { count } = await supabase
        .from('books')
        .select('id', { count: 'exact', head: true })
        .in('id', bookIds)

      // Build sorted query
      let q = supabase
        .from('books')
        .select('*, book_authors(role, authors(id, name)), book_ratings(avg_rating, rating_count)')
        .in('id', bookIds)
        .range(offset, offset + limit - 1)

      if (sort === 'newest') {
        q = q.order('created_at', { ascending: false })
      } else {
        q = q.order('created_at', { ascending: false })
      }

      const { data, error } = await q
      if (error) throw error

      let books = data ?? []

      // Sort in JS for popular/rated since we need join data
      if (sort === 'popular') {
        books = books.sort((a: any, b: any) =>
          (b.book_ratings?.rating_count ?? 0) - (a.book_ratings?.rating_count ?? 0))
      } else if (sort === 'rated') {
        books = books.sort((a: any, b: any) =>
          (b.book_ratings?.avg_rating ?? 0) - (a.book_ratings?.avg_rating ?? 0))
      }

      return { genre: genreRow, books, total: count ?? bookIds.length }
    },
    enabled: !!slug,
  })
}
