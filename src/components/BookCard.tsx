import { useState } from 'react'
import { Link } from 'react-router-dom'
import StarRating from './StarRating'

const widths  = { sm: 120, md: 150, lg: 180 }
const heights = { sm: 180, md: 225, lg: 270 }

interface BookCardBook {
  id: string
  title: string
  cover_url?: string | null
  book_authors?: { authors: { name: string } }[]
  book_ratings?: { avg_rating: number; rating_count: number } | null
}

interface BookCardProps {
  book: BookCardBook
  size?: 'sm' | 'md' | 'lg'
  showRating?: boolean
}

export default function BookCard({ book, size = 'md', showRating = true }: BookCardProps) {
  const [hovered, setHovered] = useState(false)
  const w = widths[size]
  const h = heights[size]
  const author = book.book_authors?.[0]?.authors?.name

  return (
    <Link to={`/book/${book.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{ width: w, flexShrink: 0, cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{
          position: 'relative',
          transform: hovered ? 'translateY(-6px) scale(1.03)' : 'none',
          transition: 'transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}>
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              style={{
                width: w, height: h, objectFit: 'cover', borderRadius: 6, display: 'block',
                boxShadow: hovered
                  ? '0 12px 28px rgba(58,24,8,0.4), 0 4px 8px rgba(58,24,8,0.25)'
                  : '0 4px 12px rgba(44,24,16,0.2)',
                transition: 'box-shadow 0.22s ease',
              }}
            />
          ) : (
            <div style={{
              width: w, height: h, borderRadius: 6,
              background: 'linear-gradient(135deg, #c8a882 0%, #8B5E3C 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 12, boxSizing: 'border-box',
              boxShadow: hovered
                ? '0 12px 28px rgba(58,24,8,0.4), 0 4px 8px rgba(58,24,8,0.25)'
                : '0 4px 12px rgba(44,24,16,0.2)',
              transition: 'box-shadow 0.22s ease',
            }}>
              <span style={{ color: '#F5ECD7', fontSize: 11, textAlign: 'center', fontWeight: 600, lineHeight: 1.4, fontFamily: '"DM Sans", sans-serif' }}>
                {book.title}
              </span>
            </div>
          )}
          {/* Shine overlay on hover */}
          {hovered && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 6,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
              pointerEvents: 'none',
            }} />
          )}
        </div>
        <div style={{ marginTop: 8 }}>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 700,
            color: hovered ? '#8B5E3C' : '#2C1810',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            lineHeight: 1.4, fontFamily: '"DM Sans", sans-serif',
            transition: 'color 0.15s',
          }}>{book.title}</p>
          {author && (
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6B4423', fontWeight: 500, fontFamily: '"DM Sans", sans-serif' }}>{author}</p>
          )}
          {showRating && book.book_ratings && book.book_ratings.avg_rating > 0 && (
            <div style={{ marginTop: 4 }}>
              <StarRating rating={book.book_ratings.avg_rating} size="sm" />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
