// Auto-generate this file by running:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
// Or manually keep it updated as your schema evolves.

export type ShelfType = 'want_to_read' | 'reading' | 'completed' | 'dropped'

export interface Database {
  public: {
    Tables: {
      books: {
        Row: {
          id: string
          title: string
          subtitle: string | null
          description: string | null
          isbn_10: string | null
          isbn_13: string | null
          publish_date: number | null
          publisher: string | null
          page_count: number | null
          language: string
          cover_url: string | null
          ol_key: string | null
          google_id: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['books']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['books']['Insert']>
      }
      authors: {
        Row: {
          id: string
          name: string
          bio: string | null
          photo_url: string | null
          ol_key: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['authors']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['authors']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          favorite_book_id: string | null
          location: string | null
          website: string | null
          goodreads_id: string | null
          streak_count: number
          last_read_date: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      user_books: {
        Row: {
          id: string
          user_id: string
          book_id: string
          shelf: ShelfType
          current_page: number
          date_started: string | null
          date_finished: string | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_books']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['user_books']['Insert']>
      }
      reviews: {
        Row: {
          id: string
          user_id: string
          book_id: string
          rating: number | null
          body: string | null
          spoiler: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['follows']['Row'], 'created_at'>
        Update: never
      }
      book_authors: {
        Row: {
          book_id: string
          author_id: string
          role: string
        }
        Insert: Database['public']['Tables']['book_authors']['Row']
        Update: Partial<Database['public']['Tables']['book_authors']['Insert']>
      }
      book_genres: {
        Row: {
          book_id: string
          genre_id: string
        }
        Insert: Database['public']['Tables']['book_genres']['Row']
        Update: Partial<Database['public']['Tables']['book_genres']['Insert']>
      }
      genres: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['genres']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['genres']['Insert']>
      }
    }
    Views: {
      book_ratings: {
        Row: {
          book_id: string
          rating_count: number
          avg_rating: number
        }
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
