import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import AuthorShelf from '../components/AuthorShelf'
import StarRating from '../components/StarRating'
import ReviewCard from '../components/ReviewCard'
import ShelfSelector from '../components/ShelfSelector'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useBook, useAuthorBooks } from '../hooks/useBook'
import { useReviews, useMyReview, useSubmitReview, useDeleteReview } from '../hooks/useReviews'

export default function BookPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore((s) => s.user)

  const { data: book, isLoading, error } = useBook(id!)
  const { data: reviews } = useReviews(id!)
  const { data: myReview } = useMyReview(id!, user?.id ?? '')
  const submitReview = useSubmitReview()
  const deleteReview = useDeleteReview()

  const { data: userBook } = useQuery({
    queryKey: ['user-book', id, user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data } = await supabase
        .from('user_books')
        .select('shelf')
        .eq('book_id', id!)
        .eq('user_id', user.id)
        .maybeSingle()
      return data
    },
    enabled: !!id && !!user,
  })
  const { data: ratings } = useQuery({
    queryKey: ['book-ratings', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_ratings')
        .select('*')
        .eq('book_id', id)
        .maybeSingle()
  
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  const firstAuthorId = book?.book_authors?.[0]?.authors?.id ?? ''
  const { data: authorBooks } = useAuthorBooks(firstAuthorId)

  const [descExpanded, setDescExpanded] = useState(false)
  const [rating, setRating] = useState<number>(myReview?.rating ?? 0)
  const [body, setBody] = useState(myReview?.body ?? '')
  const [spoiler, setSpoiler] = useState(myReview?.spoiler ?? false)
  const [editing, setEditing] = useState(false)

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (error || !book) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#8b5e3c' }}>
        Book not found.
      </div>
    )
  }

  const avgRating = ratings?.avg_rating ?? 0
  const ratingCount = ratings?.rating_count ?? 0
  const authors = book.book_authors?.map((ba: any) => ba.authors) ?? []
  const genres = (book.book_genres?.map((bg: any) => bg.genres) ?? [])
    .filter(Boolean)
    .sort((a: any, b: any) => (b.book_count ?? 0) - (a.book_count ?? 0))
  const description = book.description ?? ''
  const descShort = description.split(' ').slice(0, 60).join(' ')
  const isLong = description.split(' ').length > 60

  const handleSubmitReview = () => {
    if (!user || !id) return
    submitReview.mutate({
      user_id: user.id,
      book_id: id,
      rating,
      body,
      spoiler,
    })
    setEditing(false)
  }

  const handleDeleteReview = () => {
    if (!myReview) return
    deleteReview.mutate({ id: myReview.id, bookId: id! })
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        <div style={{ flexShrink: 0 }}>
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              style={{
                width: '200px',
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(92,51,23,0.25)',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '200px',
                height: '290px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #c8a882, #8b5e3c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f5e6d3',
                fontSize: '0.9rem',
                textAlign: 'center',
                padding: '1rem',
              }}
            >
              No Cover
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: '260px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#3a1f0d', marginBottom: '0.25rem' }}>
            {book.title}
          </h1>
          {book.subtitle && (
            <p style={{ fontSize: '1.1rem', color: '#8b5e3c', marginBottom: '0.75rem' }}>
              {book.subtitle}
            </p>
          )}

          <div style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>
            {authors.map((a: any, i: number) => (
              <span key={a.id}>
                <Link to={`/author/${a.id}`} style={{ color: '#a0522d', fontWeight: 600 }}>
                  {a.name}
                </Link>
                {i < authors.length - 1 && ', '}
              </span>
            ))}
          </div>

          <div style={{ color: '#7a5c40', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.7 }}>
            {book.publisher && <div><strong>Publisher:</strong> {book.publisher}</div>}
            {book.publish_date && <div><strong>Published:</strong> {book.publish_date}</div>}
            {book.page_count && <div><strong>Pages:</strong> {book.page_count}</div>}
            {book.language && <div><strong>Language:</strong> {book.language.toUpperCase()}</div>}
          </div>

          {genres.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {genres.map((g: any) => (
                <span
                  key={g.id}
                  style={{
                    padding: '0.2rem 0.75rem',
                    borderRadius: '999px',
                    background: '#f0ddc8',
                    color: '#7a4e2d',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                  }}
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <StarRating rating={avgRating} size="lg" />
            <span style={{ color: '#5c3317', fontWeight: 700, fontSize: '1.1rem' }}>
              {avgRating.toFixed(1)}
            </span>
            <span style={{ color: '#9e7a57', fontSize: '0.9rem' }}>
              {ratingCount.toLocaleString()} rating{ratingCount !== 1 ? 's' : ''}
            </span>
          </div>

          <ShelfSelector bookId={id!} currentShelf={userBook?.shelf as any} />
        </div>
      </div>

      {description && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ color: '#5c3317', fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.75rem' }}>
            Description
          </h2>
          <p style={{ color: '#4a3020', lineHeight: 1.75, fontSize: '0.975rem' }}>
            {descExpanded || !isLong ? description : `${descShort}...`}
          </p>
          {isLong && (
            <button
              onClick={() => setDescExpanded((v) => !v)}
              style={{
                background: 'none',
                border: 'none',
                color: '#a0522d',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '0.25rem 0',
                fontSize: '0.9rem',
              }}
            >
              {descExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </section>
      )}

      {user && (
        <section
          style={{
            background: '#DCC9A8',
            border: '1px solid #B8A47C',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2.5rem',
          }}
        >
          <h2 style={{ color: '#5c3317', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem' }}>
            My Rating & Review
          </h2>

          {myReview && !editing ? (
            <div>
              <StarRating rating={myReview.rating ?? 0} size="md" />
              {myReview.body && (
                <p style={{ color: '#4a3020', marginTop: '0.75rem', lineHeight: 1.7 }}>{myReview.body}</p>
              )}
              {myReview.spoiler && (
                <span
                  style={{
                    background: '#e8d5c0',
                    color: '#7a4e2d',
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 600,
                  }}
                >
                  Spoiler
                </span>
              )}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  onClick={() => {
                    setRating(myReview.rating ?? 0)
                    setBody(myReview.body ?? '')
                    setSpoiler(myReview.spoiler)
                    setEditing(true)
                  }}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #c8a882',
                    background: 'transparent',
                    color: '#7a4e2d',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteReview}
                  style={{
                    padding: '0.4rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #e8a090',
                    background: 'transparent',
                    color: '#c0392b',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <StarRating rating={rating} onChange={setRating} size="lg" />
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your review... (optional)"
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #B8A47C',
                  background: '#EAE0CC',
                  color: '#1A0A02',
                  fontSize: '0.9rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#7a4e2d', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={spoiler}
                    onChange={(e) => setSpoiler(e.target.checked)}
                  />
                  Contains spoilers
                </label>
                <button
                  onClick={handleSubmitReview}
                  disabled={rating === 0}
                  style={{
                    marginLeft: 'auto',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: rating === 0 ? '#c8a882' : '#8b5e3c',
                    color: '#f5e6d3',
                    fontWeight: 600,
                    cursor: rating === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  {editing ? 'Update Review' : 'Submit Review'}
                </button>
                {editing && (
                  <button
                    onClick={() => setEditing(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid #c8a882',
                      background: 'transparent',
                      color: '#7a4e2d',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ color: '#5c3317', fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem' }}>
          Community Reviews
          {reviews && reviews.length > 0 && (
            <span style={{ color: '#9e7a57', fontWeight: 400, fontSize: '0.9rem', marginLeft: '0.5rem' }}>
              ({reviews.length})
            </span>
          )}
        </h2>
        {!reviews || reviews.length === 0 ? (
          <p style={{ color: '#9e7a57', fontStyle: 'italic' }}>No reviews yet. Be the first!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reviews.map((review: any) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        )}
      </section>

      {firstAuthorId && authorBooks && authorBooks.length > 0 && (
        <AuthorShelf
          title={`More by ${authors[0]?.name ?? 'this Author'}`}
          books={authorBooks.filter((b: any) => b.id !== id)}
          emptyMessage="No other books found."
        />
      )}
    </div>
  )
}
