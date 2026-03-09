import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useFollowers, useFollowing, useFollow, useUnfollow } from '../hooks/useFollows'
import { supabase } from '../lib/supabase'
import Avatar from '../components/Avatar'

function UserRow({ profile, onFollow, onUnfollow, isFollowing }: {
  profile: { id: string; username: string; display_name?: string | null; avatar_url?: string | null }
  onFollow?: () => void
  onUnfollow?: () => void
  isFollowing?: boolean
}) {
  const name = profile.display_name || profile.username
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 10,
      background: '#DCC9A8', border: '1px solid #B8A47C',
      transition: 'background 0.15s',
    }}>
      <Link to={`/profile/${profile.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1 }}>
        <Avatar src={profile.avatar_url} name={name} size={42} />
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: '#2A0F02', fontSize: '0.95rem', fontFamily: '"DM Sans", sans-serif' }}>{name}</p>
          <p style={{ margin: 0, color: '#8B7355', fontSize: '0.8rem', fontFamily: '"DM Sans", sans-serif' }}>@{profile.username}</p>
        </div>
      </Link>
      {onUnfollow && isFollowing && (
        <button
          onClick={onUnfollow}
          style={{
            padding: '5px 14px', borderRadius: 20, border: '1px solid #B8A47C',
            background: 'transparent', color: '#5c3317', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, fontFamily: '"DM Sans", sans-serif',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#c04030'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#c04030' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5c3317'; e.currentTarget.style.borderColor = '#B8A47C' }}
        >
          Following
        </button>
      )}
      {onFollow && !isFollowing && (
        <button
          onClick={onFollow}
          style={{
            padding: '5px 14px', borderRadius: 20, border: 'none',
            background: 'linear-gradient(135deg, #8B5E3C, #5c3317)',
            color: '#f5e6d3', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, fontFamily: '"DM Sans", sans-serif',
          }}
        >
          Follow
        </button>
      )}
    </div>
  )
}

export default function Friends() {
  const user = useAuthStore(s => s.user)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [tab, setTab] = useState<'search' | 'following' | 'followers'>('following')

  const { data: following } = useFollowing(user?.id ?? '')
  const { data: followers } = useFollowers(user?.id ?? '')
  const follow = useFollow()
  const unfollow = useUnfollow()

  const followingIds = new Set((following ?? []).map((p: any) => p.id))

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`username.ilike.%${searchQuery.trim()}%,display_name.ilike.%${searchQuery.trim()}%`)
      .neq('id', user?.id ?? '')
      .limit(20)
    setSearchResults(data ?? [])
    setSearching(false)
  }, [searchQuery, user?.id])

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <p style={{ color: '#5c3317', fontSize: '1.1rem', fontFamily: '"DM Sans", sans-serif' }}>Sign in to find and follow readers.</p>
        <Link to="/login" style={{ padding: '0.65rem 1.75rem', borderRadius: 8, background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem 5rem', fontFamily: '"DM Sans", sans-serif' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2A0F02', fontFamily: '"Playfair Display", Georgia, serif', marginBottom: '0.5rem' }}>
        Friends & Readers
      </h1>
      <p style={{ color: '#7A5030', fontSize: '0.9rem', marginBottom: '2rem' }}>
        Discover readers and see what they're reading.
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '2px solid #B8A47C', marginBottom: '1.5rem', gap: 4 }}>
        {([
          { key: 'following', label: `Following (${following?.length ?? 0})` },
          { key: 'followers', label: `Followers (${followers?.length ?? 0})` },
          { key: 'search',    label: 'Find Readers' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.6rem 1.1rem', border: 'none',
              borderBottom: tab === t.key ? '2px solid #8B5E3C' : '2px solid transparent',
              marginBottom: -2, background: 'transparent',
              color: tab === t.key ? '#5c3317' : '#9e7a57',
              fontWeight: tab === t.key ? 700 : 400,
              cursor: 'pointer', fontSize: '0.9rem',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Following tab */}
      {tab === 'following' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!following || following.length === 0 ? (
            <p style={{ color: '#9e7a57', fontStyle: 'italic', padding: '2rem 0' }}>
              You're not following anyone yet. Use "Find Readers" to discover people.
            </p>
          ) : (
            (following as any[]).map((profile: any) => (
              <UserRow
                key={profile.id}
                profile={profile}
                isFollowing
                onUnfollow={() => unfollow.mutate({ followerId: user.id, followingId: profile.id })}
              />
            ))
          )}
        </div>
      )}

      {/* Followers tab */}
      {tab === 'followers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!followers || followers.length === 0 ? (
            <p style={{ color: '#9e7a57', fontStyle: 'italic', padding: '2rem 0' }}>
              No followers yet. Share your profile to get discovered!
            </p>
          ) : (
            (followers as any[]).map((profile: any) => (
              <UserRow
                key={profile.id}
                profile={profile}
                isFollowing={followingIds.has(profile.id)}
                onFollow={() => follow.mutate({ followerId: user.id, followingId: profile.id })}
                onUnfollow={() => unfollow.mutate({ followerId: user.id, followingId: profile.id })}
              />
            ))
          )}
        </div>
      )}

      {/* Search tab */}
      {tab === 'search' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="Search by username or name…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{
                flex: 1, padding: '0.65rem 1rem', borderRadius: 8,
                border: '1px solid #B8A47C', background: '#EAE0CC',
                color: '#1A0A02', fontSize: '0.95rem', outline: 'none',
                fontFamily: '"DM Sans", sans-serif',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={searching}
              style={{
                padding: '0.65rem 1.25rem', borderRadius: 8, border: 'none',
                background: 'linear-gradient(135deg, #8B5E3C, #5c3317)',
                color: '#f5e6d3', fontWeight: 600, cursor: 'pointer',
                fontSize: '0.9rem', fontFamily: '"DM Sans", sans-serif',
              }}
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {searchResults.map((profile: any) => (
              <UserRow
                key={profile.id}
                profile={profile}
                isFollowing={followingIds.has(profile.id)}
                onFollow={() => {
                  follow.mutate({ followerId: user.id, followingId: profile.id })
                  setSearchResults(prev => [...prev]) // force re-render
                }}
                onUnfollow={() => unfollow.mutate({ followerId: user.id, followingId: profile.id })}
              />
            ))}
            {searchQuery && searchResults.length === 0 && !searching && (
              <p style={{ color: '#9e7a57', fontStyle: 'italic' }}>No readers found for "{searchQuery}".</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
