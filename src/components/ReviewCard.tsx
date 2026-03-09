import { useState } from 'react'
import Avatar from './Avatar'
import StarRating from './StarRating'
import { Link } from 'react-router-dom'

interface Review {
  id: string
  rating?: number | null
  body?: string | null
  spoiler: boolean
  created_at: string
  profiles: { id: string; username: string; display_name?: string | null; avatar_url?: string | null }
  books?: { id: string; title: string; cover_url?: string | null }
}

interface ReviewCardProps {
  review: Review
  showBook?: boolean
}

const TRUNCATE_AT = 280

export default function ReviewCard({ review, showBook }: ReviewCardProps) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const { profiles: profile, books: book } = review
  const name = profile ? (profile.display_name || profile.username) : 'Anonymous'
  const date = new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  const body = review.body ?? ''
  const isLong = body.length > TRUNCATE_AT
  const displayBody = isLong && !expanded ? body.slice(0, TRUNCATE_AT).trimEnd() + '…' : body

  return (
    <div style={{
      background: '#DCC9A8',
      border: '1px solid #C8B490',
      borderRadius: 12,
      padding: '1rem 1.25rem',
      boxShadow: '0 2px 8px rgba(58,24,8,0.08)',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Book link */}
      {showBook && book && (
        <Link to={`/book/${book.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, textDecoration: 'none', paddingBottom: 12, borderBottom: '1px solid #C8B490' }}>
          {book.cover_url
            ? <img src={book.cover_url} alt={book.title} style={{ width: 36, height: 54, objectFit: 'cover', borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', flexShrink: 0 }} />
            : <div style={{ width: 36, height: 54, background: 'linear-gradient(135deg, #c8a882, #8b5e3c)', borderRadius: 4, flexShrink: 0 }} />
          }
          <span style={{ fontWeight: 700, color: '#2C1810', fontSize: '0.9rem', fontFamily: '"DM Sans", sans-serif', lineHeight: 1.4 }}>{book.title}</span>
        </Link>
      )}

      {/* Header: avatar + name + date */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        {profile ? (
          <Link to={`/profile/${profile.username}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <Avatar src={profile.avatar_url} name={name} size={36} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#2C1810', fontSize: '0.875rem', fontFamily: '"DM Sans", sans-serif' }}>{name}</p>
              <p style={{ margin: 0, color: '#8B7355', fontSize: '0.75rem', fontFamily: '"DM Sans", sans-serif' }}>@{profile.username}</p>
            </div>
          </Link>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar src={null} name="?" size={36} />
            <p style={{ margin: 0, fontWeight: 600, color: '#2C1810', fontSize: '0.875rem', fontFamily: '"DM Sans", sans-serif' }}>Anonymous</p>
          </div>
        )}
        <span style={{ color: '#8B7355', fontSize: '0.75rem', fontFamily: '"DM Sans", sans-serif', flexShrink: 0, marginLeft: 8 }}>{date}</span>
      </div>

      {/* Rating */}
      {review.rating != null && review.rating > 0 && (
        <div style={{ marginBottom: 8 }}>
          <StarRating rating={review.rating} size="sm" />
        </div>
      )}

      {/* Body / spoiler */}
      {body && (
        review.spoiler && !spoilerRevealed ? (
          <div style={{
            background: 'rgba(0,0,0,0.06)', borderRadius: 8,
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: '#8B7355', fontSize: '0.8rem', fontFamily: '"DM Sans", sans-serif' }}>⚠ Spoiler</span>
            <button
              onClick={() => setSpoilerRevealed(true)}
              style={{
                background: 'none', border: 'none', color: '#8B5E3C',
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                textDecoration: 'underline', fontFamily: '"DM Sans", sans-serif', padding: 0,
              }}
            >
              Reveal
            </button>
          </div>
        ) : (
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#3A1A08', lineHeight: 1.65, fontFamily: '"DM Sans", sans-serif' }}>
              {displayBody}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(v => !v)}
                style={{
                  background: 'none', border: 'none', color: '#8B5E3C',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  padding: '4px 0 0', fontFamily: '"DM Sans", sans-serif',
                }}
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )
      )}
    </div>
  )
}
