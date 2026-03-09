import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import Avatar from '../components/Avatar'
import BookShelf from '../components/BookShelf'
import { useAuthorBooks } from '../hooks/useBook'

export default function AuthorPage() {
  const { id } = useParams<{ id: string }>()

  const { data: author, isLoading: authorLoading } = useQuery({
    queryKey: ['author', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authors')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const { data: books, isLoading: booksLoading } = useAuthorBooks(id!)

  if (authorLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!author) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#8b5e3c' }}>
        Author not found.
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #DCC9A8 0%, #CEBB96 100%)',
          border: '1px solid #B8A47C',
          borderRadius: '16px',
          padding: '2.5rem',
          display: 'flex',
          gap: '2rem',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          marginBottom: '2.5rem',
        }}
      >
        <Avatar src={author.photo_url ?? undefined} name={author.name} size={80} />
        <div style={{ flex: 1, minWidth: '220px' }}>
          <h1
            style={{
              fontSize: '2.2rem',
              fontWeight: 700,
              color: '#3a1f0d',
              marginBottom: '1rem',
              lineHeight: 1.2,
            }}
          >
            {author.name}
          </h1>
          {author.bio ? (
            <p
              style={{
                color: '#5c4030',
                lineHeight: 1.8,
                fontSize: '0.975rem',
                whiteSpace: 'pre-line',
              }}
            >
              {author.bio}
            </p>
          ) : (
            <p style={{ color: '#9e7a57', fontStyle: 'italic' }}>No biography available.</p>
          )}
        </div>
      </div>

      <BookShelf
        title={`Books by ${author.name}`}
        books={books ?? []}
        isLoading={booksLoading}
        emptyMessage={`No books found for ${author.name}.`}
      />

      <div style={{ marginTop: '1.5rem' }}>
        <Link
          to="/"
          style={{
            color: '#a0522d',
            fontWeight: 500,
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
