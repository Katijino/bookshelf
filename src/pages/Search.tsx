import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import BookCard from '../components/BookCard'
import Avatar from '../components/Avatar'
import { useSearch } from '../hooks/useSearch'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(initialQuery)

  const { data, isLoading } = useSearch(initialQuery)

  useEffect(() => {
    setInputValue(initialQuery)
  }, [initialQuery])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (inputValue.trim()) {
      setSearchParams({ q: inputValue.trim() })
    }
  }

  const books = data?.books ?? []
  const authors = data?.authors ?? []

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <h1 style={{ color: '#3a1f0d', fontWeight: 700, fontSize: '2rem', marginBottom: '1.5rem' }}>
        Search
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2.5rem', maxWidth: '600px' }}>
        <input
          type="text"
          placeholder="Search books, authors, ISBN..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          autoFocus
          style={{
            flex: 1,
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #c8a882',
            background: '#EAE0CC',
            color: '#1A0A02',
            fontSize: '1rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            border: 'none',
            background: '#8b5e3c',
            color: '#f5e6d3',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Search
        </button>
      </form>

      {!initialQuery && (
        <div
          style={{
            textAlign: 'center',
            color: '#9e7a57',
            padding: '4rem 1rem',
            fontSize: '1.1rem',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
          <p>Enter a search term to find books and authors.</p>
        </div>
      )}

      {initialQuery && isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" />
        </div>
      )}

      {initialQuery && !isLoading && (
        <>
          {books.length === 0 && authors.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9e7a57', padding: '3rem', fontStyle: 'italic' }}>
              No results found for "{initialQuery}".
            </div>
          )}

          {books.length > 0 && (
            <section style={{ marginBottom: '3rem' }}>
              <h2
                style={{
                  color: '#5c3317',
                  fontWeight: 700,
                  fontSize: '1.4rem',
                  marginBottom: '1rem',
                  borderBottom: '2px solid #e8d5c0',
                  paddingBottom: '0.5rem',
                }}
              >
                Books
                <span style={{ color: '#9e7a57', fontWeight: 400, fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                  ({books.length} result{books.length !== 1 ? 's' : ''})
                </span>
              </h2>
              <div className="grid-books">
                {books.map((book: any) => (
                  <BookCard key={book.id} book={book} showRating />
                ))}
              </div>
            </section>
          )}

          {authors.length > 0 && (
            <section>
              <h2
                style={{
                  color: '#5c3317',
                  fontWeight: 700,
                  fontSize: '1.4rem',
                  marginBottom: '1rem',
                  borderBottom: '2px solid #e8d5c0',
                  paddingBottom: '0.5rem',
                }}
              >
                Authors
                <span style={{ color: '#9e7a57', fontWeight: 400, fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                  ({authors.length} result{authors.length !== 1 ? 's' : ''})
                </span>
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {authors.map((author: any) => (
                  <Link
                    key={author.id}
                    to={`/author/${author.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '1rem 1.25rem',
                        background: '#DCC9A8',
                        border: '1px solid #B8A47C',
                        borderRadius: '10px',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#c8a882'
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = '#e8d5c0'
                      }}
                    >
                      <Avatar src={author.photo_url ?? undefined} name={author.name} size={48} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#3a1f0d', fontSize: '1rem' }}>
                          {author.name}
                        </div>
                        {author.bio && (
                          <div
                            style={{
                              color: '#9e7a57',
                              fontSize: '0.85rem',
                              marginTop: '0.2rem',
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {author.bio}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
