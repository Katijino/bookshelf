import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import BookShelf from '../components/BookShelf'
import ReviewCard from '../components/ReviewCard'
import { usePopularBooks, useRecentBooks, useBooks } from '../hooks/useBook'
import { useFeed } from '../hooks/useFeed'
import { useRef, useEffect } from 'react'
import { useSearch } from '../hooks/useSearch'

const GENRES = [
  { label: 'All',                value: '' },
  { label: 'Fantasy',            value: 'fantasy' },
  { label: 'Science Fiction',    value: 'science-fiction' },
  { label: 'Mystery',            value: 'mystery' },
  { label: 'Romance',            value: 'romance' },
  { label: 'Thriller',           value: 'thriller' },
  { label: 'Historical Fiction', value: 'historical-fiction' },
  { label: 'Biography',          value: 'biography' },
]

// Decorative book spines for the hero shelf
const HERO_BOOKS = [
  { w: 30, h: 172, main: '#8B1E12', light: '#C43828', delay: 0.28 },
  { w: 22, h: 148, main: '#1E3866', light: '#2A50A0', delay: 0.34 },
  { w: 46, h: 192, main: '#2A5520', light: '#3C7830', delay: 0.40 },
  { w: 28, h: 158, main: '#6B3A18', light: '#9B5228', delay: 0.46 },
  { w: 38, h: 197, main: '#7A4E28', light: '#AA6835', delay: 0.52 },
  { w: 20, h: 143, main: '#3D1838', light: '#6A2A60', delay: 0.58 },
  { w: 50, h: 180, main: '#183838', light: '#285858', delay: 0.64 },
  { w: 26, h: 160, main: '#5C1818', light: '#8B2828', delay: 0.70 },
  { w: 40, h: 188, main: '#3A3818', light: '#625A22', delay: 0.76 },
  { w: 32, h: 152, main: '#281855', light: '#3D2880', delay: 0.82 },
  { w: 28, h: 176, main: '#184828', light: '#286840', delay: 0.88 },
  { w: 44, h: 194, main: '#5C4818', light: '#8B6E28', delay: 0.94 },
  { w: 24, h: 145, main: '#3A1828', light: '#622840', delay: 1.00 },
  { w: 46, h: 168, main: '#2A4818', light: '#406828', delay: 1.06 },
  { w: 30, h: 164, main: '#4A2E18', light: '#7A4828', delay: 1.12 },
  { w: 18, h: 182, main: '#182E5C', light: '#284880', delay: 1.18 },
  { w: 36, h: 156, main: '#481818', light: '#702828', delay: 1.24 },
  { w: 26, h: 190, main: '#184830', light: '#286848', delay: 1.30 },
  { w: 40, h: 162, main: '#2E1A5C', light: '#4A2880', delay: 1.36 },
  { w: 22, h: 174, main: '#183040', light: '#285060', delay: 1.42 },
  { w: 34, h: 148, main: '#5C2818', light: '#8B4028', delay: 1.48 },
  { w: 28, h: 186, main: '#1E4828', light: '#2E6840', delay: 1.54 },
]

export default function Home() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [query, setQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('')
  const [heroDebounced, setHeroDebounced] = useState('')
  const [heroDropOpen, setHeroDropOpen] = useState(false)
  const heroWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setHeroDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (heroWrapRef.current && !heroWrapRef.current.contains(e.target as Node)) {
        setHeroDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { data: heroSuggestions } = useSearch(heroDebounced)
  const hasHeroResults = heroSuggestions && (heroSuggestions.books.length > 0 || heroSuggestions.authors.length > 0)

  const { data: popularBooks, isLoading: popularLoading } = usePopularBooks()
  const { data: recentBooks, isLoading: recentLoading } = useRecentBooks()
  const { data: genreBooks, isLoading: genreLoading } = useBooks({
    genre: selectedGenre || undefined,
  })
  const { data: feed, isLoading: feedLoading } = useFeed(user?.id ?? '')

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const displayedPopular = selectedGenre ? (genreBooks ?? []) : (popularBooks ?? [])
  const displayedPopularLoading = selectedGenre ? genreLoading : popularLoading

  return (
    <div>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-spotlight" />

        <div className="hero-content">
          <span className="hero-eyebrow">A Library for the Modern Reader</span>

          <h1 className="hero-title">Bookshelf</h1>

          <p className="hero-tagline">Discover · Track · Share</p>

          <div className="hero-divider" />

          <div ref={heroWrapRef} style={{ position: 'relative', width: '100%', maxWidth: 580 }}>
            <form className="hero-search-wrap" onSubmit={handleSearch}>
              <input
                className="hero-search-input"
                value={query}
                onChange={e => { setQuery(e.target.value); setHeroDropOpen(true) }}
                onFocus={() => setHeroDropOpen(true)}
                placeholder="Search books or authors…"
                autoComplete="off"
              />
              <button type="submit" className="hero-search-btn">Search</button>
            </form>

            {heroDropOpen && query.length >= 2 && hasHeroResults && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', left: 0, right: 0,
                background: '#DCC9A8', border: '1px solid #B8A47C',
                borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                zIndex: 100, overflow: 'hidden', maxHeight: 420, overflowY: 'auto',
              }}>
                {heroSuggestions!.books.length > 0 && (
                  <>
                    <div style={{
                      padding: '10px 16px 4px', fontSize: '0.7rem', fontWeight: 700,
                      color: '#7A5030', letterSpacing: '0.08em', textTransform: 'uppercase',
                      fontFamily: '"DM Sans", sans-serif',
                    }}>
                      Books
                    </div>
                    {heroSuggestions!.books.slice(0, 6).map((book: any) => (
                      <Link
                        key={book.id}
                        to={`/book/${book.id}`}
                        onClick={() => { setHeroDropOpen(false); setQuery('') }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 16px', textDecoration: 'none',
                          borderBottom: '1px solid #B8A47C', transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#C8B490')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {book.cover_url
                          ? <img src={book.cover_url} alt={book.title} style={{ width: 30, height: 44, objectFit: 'cover', borderRadius: 3, flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }} />
                          : <div style={{ width: 30, height: 44, background: 'linear-gradient(135deg, #c8a882, #8b5e3c)', borderRadius: 3, flexShrink: 0 }} />
                        }
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A0A02', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"DM Sans", sans-serif' }}>
                            {book.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#7A5030', fontFamily: '"DM Sans", sans-serif' }}>
                            {book.book_authors?.[0]?.authors?.name ?? ''}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </>
                )}

                {heroSuggestions!.authors.length > 0 && (
                  <>
                    <div style={{
                      padding: '10px 16px 4px', fontSize: '0.7rem', fontWeight: 700,
                      color: '#7A5030', letterSpacing: '0.08em', textTransform: 'uppercase',
                      fontFamily: '"DM Sans", sans-serif',
                    }}>
                      Authors
                    </div>
                    {heroSuggestions!.authors.slice(0, 3).map((author: any) => (
                      <Link
                        key={author.id}
                        to={`/author/${author.id}`}
                        onClick={() => { setHeroDropOpen(false); setQuery('') }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 16px', textDecoration: 'none', transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#C8B490')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1A0A02', fontFamily: '"DM Sans", sans-serif' }}>
                          {author.name}
                        </div>
                      </Link>
                    ))}
                  </>
                )}

                <div
                  style={{
                    padding: '9px 16px', fontSize: '0.8rem', color: '#5C3A1A',
                    cursor: 'pointer', fontWeight: 600, borderTop: '1px solid #B8A47C',
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                  onMouseDown={e => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(query)}`); setHeroDropOpen(false); setQuery('') }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#C8B490')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  See all results for "{query}" →
                </div>
              </div>
            )}
          </div>

          <div className="hero-features">
            <span className="hero-feature">
              <span className="hero-feature-dot" />
              Discover Books
            </span>
            <span className="hero-feature">
              <span className="hero-feature-dot" />
              Track Reading
            </span>
            <span className="hero-feature">
              <span className="hero-feature-dot" />
              Share Reviews
            </span>
            <span className="hero-feature">
              <span className="hero-feature-dot" />
              Follow Readers
            </span>
          </div>
        </div>

        {/* Decorative shelf at bottom of hero */}
        <div className="hero-shelf">
          <div className="hero-shelf-books">
            {HERO_BOOKS.map((book, i) => (
              <div
                key={i}
                className="hero-book-spine"
                style={{
                  width: book.w,
                  height: book.h,
                  background: `linear-gradient(90deg,
                    rgba(0,0,0,0.48) 0%,
                    rgba(0,0,0,0.12) 7%,
                    ${book.main} 12%,
                    ${book.main} 75%,
                    ${book.light} 86%,
                    rgba(255,255,255,0.17) 93%,
                    rgba(0,0,0,0.14) 100%)`,
                  animationDelay: `${book.delay}s`,
                }}
              />
            ))}
          </div>
          <div className="hero-shelf-plank" />
        </div>
      </section>

      {/* ── DISCOVERY CONTENT ─────────────────────────────────── */}
      <div className="home-content">
        {/* Genre filter pills */}
        <div className="home-genre-row">
          {GENRES.map((g) => (
            <button
              key={g.value}
              className={`genre-pill${selectedGenre === g.value ? ' active' : ''}`}
              onClick={() => setSelectedGenre(g.value)}
            >
              {g.label}
            </button>
          ))}
          {selectedGenre && (
            <Link
              to={`/genre/${selectedGenre}`}
              style={{
                padding: '0.42rem 1.1rem', borderRadius: 999,
                border: '1.5px solid rgba(212,160,23,0.5)',
                background: 'rgba(212,160,23,0.08)',
                color: '#7A5030', textDecoration: 'none',
                fontSize: '0.85rem', fontWeight: 600,
                fontFamily: '"DM Sans", sans-serif',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
            >
              Browse all →
            </Link>
          )}
        </div>

        {/* Popular / Genre books */}
        <div className="home-section-head">
          <h2 className="home-section-title">
            {selectedGenre
              ? `${GENRES.find((g) => g.value === selectedGenre)?.label ?? ''} Books`
              : 'Most Popular Right Now'}
          </h2>
          <div className="home-section-rule" />
        </div>
        <BookShelf
          title=""
          books={displayedPopular}
          isLoading={displayedPopularLoading}
          emptyMessage="No books found for this genre yet."
        />

        {/* Recently Added */}
        {!selectedGenre && (
          <>
            <div className="home-section-head" style={{ marginTop: '0.5rem' }}>
              <h2 className="home-section-title">Recently Added</h2>
              <div className="home-section-rule" />
            </div>
            <BookShelf
              title=""
              books={recentBooks ?? []}
              isLoading={recentLoading}
              emptyMessage="No books added yet."
            />
          </>
        )}

        {/* Social feed */}
        {user && !feedLoading && feed && feed.length > 0 && (
          <section className="home-feed-section">
            <div className="home-section-head">
              <h2 className="home-section-title">From People You Follow</h2>
              <div className="home-section-rule" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.25rem' }}>
              {feed.map((review: any) => (
                <ReviewCard key={review.id} review={review} showBook />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
