import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useFeed } from '../hooks/useFeed'
import ReviewCard from '../components/ReviewCard'

type Filter = 'all' | 'reviews' | 'reading'

export default function ActivityFeed() {
  const user = useAuthStore(s => s.user)
  const { data: feed, isLoading } = useFeed(user?.id ?? '')
  const [filter, setFilter] = useState<Filter>('all')
  const [shown, setShown] = useState(10)

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <p style={{ color: '#5c3317', fontSize: '1.1rem', fontFamily: '"DM Sans", sans-serif' }}>Sign in to see your activity feed.</p>
        <Link to="/login" style={{ padding: '0.65rem 1.75rem', borderRadius: 8, background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
      </div>
    )
  }

  const allFeed = feed ?? []
  const filtered = filter === 'reviews'
    ? allFeed.filter((r: any) => r.body)
    : filter === 'reading'
    ? allFeed.filter((r: any) => !r.body && r.rating)
    : allFeed

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem 5rem', fontFamily: '"DM Sans", sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2A0F02', fontFamily: '"Playfair Display", Georgia, serif', marginBottom: '0.5rem' }}>
        Activity Feed
      </h1>
      <p style={{ color: '#7A5030', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Latest from people you follow.
      </p>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {([
          { key: 'all',     label: 'All Activity' },
          { key: 'reviews', label: 'Reviews Only' },
          { key: 'reading', label: 'Ratings Only' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setShown(10) }}
            style={{
              padding: '0.4rem 1rem', borderRadius: 20,
              border: `1.5px solid ${filter === f.key ? '#8B5E3C' : '#B8A47C'}`,
              background: filter === f.key ? 'linear-gradient(135deg, #8B5E3C, #5c3317)' : 'transparent',
              color: filter === f.key ? '#f5e6d3' : '#5c3317',
              fontWeight: filter === f.key ? 700 : 500,
              cursor: 'pointer', fontSize: '0.85rem',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#9e7a57' }}>
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Nothing here yet.</p>
          <p style={{ fontSize: '0.9rem' }}>
            Follow more readers to see their activity here.{' '}
            <Link to="/friends" style={{ color: '#8B5E3C', fontWeight: 600 }}>Find Readers →</Link>
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.slice(0, shown).map((review: any) => (
          <ReviewCard key={review.id} review={review} showBook />
        ))}
      </div>

      {shown < filtered.length && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            onClick={() => setShown(s => s + 10)}
            style={{
              padding: '0.65rem 2rem', borderRadius: 10, border: '1px solid #B8A47C',
              background: 'transparent', color: '#5c3317', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.9rem', fontFamily: '"DM Sans", sans-serif',
            }}
          >
            Load More ({filtered.length - shown} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
