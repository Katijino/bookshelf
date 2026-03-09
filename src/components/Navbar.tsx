import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import Avatar from './Avatar'
import { useSearch } from '../hooks/useSearch'

export default function Navbar() {
  const user = useAuthStore(s => s.user)
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [socialOpen, setSocialOpen] = useState(false)
  const socialRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)

  // 300ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data: suggestions } = useSearch(debounced)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
      setOpen(false)
      setQuery('')
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const hasResults = suggestions && (suggestions.books.length > 0 || suggestions.authors.length > 0)

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'linear-gradient(180deg, #4A2010 0%, #3A1808 100%)',
      height: 62,
      display: 'flex', alignItems: 'center', padding: '0 28px', gap: 24,
      boxShadow: '0 2px 16px rgba(10,4,0,0.45), inset 0 -1px 0 rgba(212,160,23,0.12)',
      borderBottom: '1px solid rgba(212,160,23,0.08)',
    }}>
      {/* Logo */}
      <Link
        to="/"
        style={{
          color: '#D4A017',
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: '1.45rem',
          fontWeight: 700,
          textDecoration: 'none',
          flexShrink: 0,
          letterSpacing: '-0.01em',
          textShadow: '0 0 20px rgba(212,160,23,0.35)',
        }}
      >
        Bookshelf
      </Link>

      {/* Search */}
      <div ref={wrapRef} style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
        <form onSubmit={handleSearch}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            placeholder="Search books or authors…"
            style={{
              width: '100%', padding: '7px 14px', borderRadius: 22, border: '1px solid rgba(212,160,23,0.18)',
              background: 'rgba(255,235,185,0.07)', color: '#F5ECD7',
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
              fontFamily: '"DM Sans", sans-serif',
              backdropFilter: 'blur(8px)',
              transition: 'border-color 0.15s, background 0.15s',
            }}
            onFocus={e => {
              setOpen(true)
              e.currentTarget.style.borderColor = 'rgba(212,160,23,0.4)'
              e.currentTarget.style.background = 'rgba(255,235,185,0.11)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(212,160,23,0.18)'
              e.currentTarget.style.background = 'rgba(255,235,185,0.07)'
            }}
          />
        </form>

        {open && query.length >= 2 && hasResults && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 10px)', left: 0, right: 0,
            background: '#DCC9A8', border: '1px solid #B8A47C',
            borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            zIndex: 100, overflow: 'hidden', maxHeight: 420, overflowY: 'auto',
          }}>
            {suggestions!.books.length > 0 && (
              <>
                <div style={{
                  padding: '10px 16px 4px',
                  fontSize: '0.7rem', fontWeight: 700,
                  color: '#7A5030', letterSpacing: '0.08em', textTransform: 'uppercase',
                  fontFamily: '"DM Sans", sans-serif',
                }}>
                  Books
                </div>
                {suggestions!.books.slice(0, 6).map((book: any) => (
                  <Link
                    key={book.id}
                    to={`/book/${book.id}`}
                    onClick={() => { setOpen(false); setQuery('') }}
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

            {suggestions!.authors.length > 0 && (
              <>
                <div style={{
                  padding: '10px 16px 4px',
                  fontSize: '0.7rem', fontWeight: 700,
                  color: '#7A5030', letterSpacing: '0.08em', textTransform: 'uppercase',
                  fontFamily: '"DM Sans", sans-serif',
                }}>
                  Authors
                </div>
                {suggestions!.authors.slice(0, 3).map((author: any) => (
                  <Link
                    key={author.id}
                    to={`/author/${author.id}`}
                    onClick={() => { setOpen(false); setQuery('') }}
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
              onMouseDown={e => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(query)}`); setOpen(false); setQuery('') }}
              onMouseEnter={e => (e.currentTarget.style.background = '#C8B490')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              See all results for "{query}" →
            </div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
        {/* Primary nav: Home, My Library, Social, Stats */}
        <Link to="/" style={{ color: 'rgba(245,236,215,0.82)', textDecoration: 'none', fontSize: 14, fontFamily: '"DM Sans", sans-serif', fontWeight: 500, padding: '6px 10px', borderRadius: 6, transition: 'color 0.15s, background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F5ECD7'; e.currentTarget.style.background = 'rgba(255,235,185,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,236,215,0.82)'; e.currentTarget.style.background = 'transparent' }}>
          Home
        </Link>

        <Link to="/library" style={{ color: 'rgba(245,236,215,0.82)', textDecoration: 'none', fontSize: 14, fontFamily: '"DM Sans", sans-serif', fontWeight: 500, padding: '6px 10px', borderRadius: 6, transition: 'color 0.15s, background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F5ECD7'; e.currentTarget.style.background = 'rgba(255,235,185,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,236,215,0.82)'; e.currentTarget.style.background = 'transparent' }}>
          My Library
        </Link>

        {/* Social dropdown */}
        <div
          ref={socialRef}
          style={{ position: 'relative' }}
          onMouseEnter={() => setSocialOpen(true)}
          onMouseLeave={() => setSocialOpen(false)}
        >
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(245,236,215,0.82)', fontSize: 14, fontFamily: '"DM Sans", sans-serif',
            fontWeight: 500, padding: '6px 10px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4,
            transition: 'color 0.15s, background 0.15s',
            ...(socialOpen ? { color: '#F5ECD7', background: 'rgba(255,235,185,0.08)' } : {}),
          }}>
            Social
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.65, transition: 'transform 0.15s', transform: socialOpen ? 'rotate(180deg)' : 'none' }}>
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {socialOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% - 2px)', left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(180deg, #4A2010 0%, #3A1808 100%)',
              border: '1px solid rgba(212,160,23,0.15)',
              borderRadius: 10, boxShadow: '0 12px 36px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
              minWidth: 160, overflow: 'hidden', zIndex: 200,
            }}>
              {[
                { label: 'Friends',       to: '/friends',  icon: '👥' },
                { label: 'Activity Feed', to: '/activity', icon: '🔔' },
                { label: 'Groups',        to: '/groups',   icon: '📚' },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSocialOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', textDecoration: 'none', fontSize: 13,
                    color: 'rgba(245,236,215,0.85)', fontFamily: '"DM Sans", sans-serif',
                    fontWeight: 500, transition: 'background 0.12s, color 0.12s',
                    borderBottom: '1px solid rgba(212,160,23,0.08)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,235,185,0.1)'; e.currentTarget.style.color = '#F5ECD7' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(245,236,215,0.85)' }}
                >
                  <span style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link to="/stats" style={{ color: 'rgba(245,236,215,0.82)', textDecoration: 'none', fontSize: 14, fontFamily: '"DM Sans", sans-serif', fontWeight: 500, padding: '6px 10px', borderRadius: 6, transition: 'color 0.15s, background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F5ECD7'; e.currentTarget.style.background = 'rgba(255,235,185,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(245,236,215,0.82)'; e.currentTarget.style.background = 'transparent' }}>
          Stats
        </Link>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: 'rgba(245,236,215,0.15)', margin: '0 6px' }} />

        {user ? (
          <>
            <Link to="/add-book" style={{
              color: '#D4A017', textDecoration: 'none', fontSize: 14,
              fontWeight: 600, fontFamily: '"DM Sans", sans-serif',
              border: '1px solid rgba(212,160,23,0.3)', padding: '4px 12px', borderRadius: 20,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(212,160,23,0.1)'; e.currentTarget.style.borderColor = 'rgba(212,160,23,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(212,160,23,0.3)' }}>
              + Add Book
            </Link>
            <Link to={`/profile/${user.user_metadata?.username || user.id}`}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
              <Avatar src={user.user_metadata?.avatar_url} name={user.user_metadata?.username || user.email || ''} size={30} />
            </Link>
            <Link to="/import" style={{ color: 'rgba(245,236,215,0.82)', textDecoration: 'none', fontSize: 14, fontFamily: '"DM Sans", sans-serif', padding: '6px 8px', borderRadius: 6, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F5ECD7')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,236,215,0.82)')}>
              Import
            </Link>
            <Link to="/settings" style={{ color: 'rgba(245,236,215,0.82)', textDecoration: 'none', fontSize: 14, fontFamily: '"DM Sans", sans-serif', padding: '6px 8px', borderRadius: 6, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F5ECD7')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(245,236,215,0.82)')}>
              Settings
            </Link>
            <button onClick={logout} style={{
              background: 'none', border: '1px solid rgba(245,236,215,0.22)',
              color: 'rgba(245,236,215,0.7)', padding: '4px 12px', borderRadius: 6,
              cursor: 'pointer', fontSize: 14, fontFamily: '"DM Sans", sans-serif',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,236,215,0.4)'; e.currentTarget.style.color = '#F5ECD7' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(245,236,215,0.22)'; e.currentTarget.style.color = 'rgba(245,236,215,0.7)' }}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/add-book" style={{
              color: '#D4A017', textDecoration: 'none', fontSize: 14, fontWeight: 600,
              fontFamily: '"DM Sans", sans-serif',
              border: '1px solid rgba(212,160,23,0.3)', padding: '4px 12px', borderRadius: 20,
            }}>
              + Add Book
            </Link>
            <Link to="/login" style={{
              color: '#1A0A02', textDecoration: 'none',
              background: 'linear-gradient(135deg, #E8A030 0%, #C48020 100%)',
              padding: '7px 18px', borderRadius: 8, fontSize: 14,
              fontWeight: 600, fontFamily: '"DM Sans", sans-serif',
              boxShadow: '0 2px 8px rgba(200,120,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
            }}>
              Sign in
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
