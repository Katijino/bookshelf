import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useGenreBooks, type GenreSort } from '../hooks/useGenreBooks'
import BookCard from '../components/BookCard'

const SORT_OPTIONS: { value: GenreSort; label: string }[] = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'rated',   label: 'Highest Rated' },
  { value: 'newest',  label: 'Newest' },
]

export default function Genre() {
  const { slug } = useParams<{ slug: string }>()
  const [sort, setSort] = useState<GenreSort>('popular')
  const [page, setPage] = useState(0)

  const { data, isLoading, error } = useGenreBooks(slug ?? '', sort, page)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#8b5e3c', fontFamily: '"DM Sans", sans-serif' }}>
        Genre not found.{' '}
        <Link to="/" style={{ color: '#8B5E3C', fontWeight: 600 }}>← Back to Home</Link>
      </div>
    )
  }

  const { genre, books, total } = data
  const limit = 24
  const totalPages = Math.ceil(total / limit)

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem 5rem', fontFamily: '"DM Sans", sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          to="/"
          style={{ fontSize: '0.875rem', color: '#7A5030', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1rem' }}
        >
          ← Back to Home
        </Link>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
          <h1 style={{
            fontSize: '2.25rem', fontWeight: 800, color: '#2A0F02',
            fontFamily: '"Playfair Display", Georgia, serif', margin: 0,
          }}>
            {genre.name}
          </h1>
          <span style={{ color: '#9e7a57', fontSize: '1rem' }}>
            {total.toLocaleString()} books
          </span>
        </div>
        <div style={{ width: 60, height: 3, background: 'linear-gradient(90deg, #D4A017, transparent)', marginTop: 12, borderRadius: 2 }} />
      </div>

      {/* Sort controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: '#7A5030', fontSize: '0.875rem', fontWeight: 500 }}>Sort by:</span>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setSort(opt.value); setPage(0) }}
            style={{
              padding: '0.4rem 1rem', borderRadius: 20,
              border: `1.5px solid ${sort === opt.value ? '#8B5E3C' : '#B8A47C'}`,
              background: sort === opt.value ? 'linear-gradient(135deg, #8B5E3C, #5c3317)' : 'transparent',
              color: sort === opt.value ? '#f5e6d3' : '#5c3317',
              fontWeight: sort === opt.value ? 700 : 500,
              cursor: 'pointer', fontSize: '0.85rem',
              fontFamily: '"DM Sans", sans-serif',
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Book grid */}
      {books.length === 0 ? (
        <p style={{ color: '#9e7a57', fontStyle: 'italic' }}>No books found for this genre yet.</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}>
          {books.map((book: any) => (
            <BookCard key={book.id} book={book} size="md" />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 8,
              border: '1px solid #B8A47C', background: 'transparent',
              color: page === 0 ? '#C8A47C' : '#5c3317',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              fontFamily: '"DM Sans", sans-serif', fontWeight: 600,
            }}
          >
            ← Prev
          </button>
          <span style={{ padding: '0.5rem 1rem', color: '#7A5030', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: 8,
              border: '1px solid #B8A47C', background: 'transparent',
              color: page >= totalPages - 1 ? '#C8A47C' : '#5c3317',
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              fontFamily: '"DM Sans", sans-serif', fontWeight: 600,
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
