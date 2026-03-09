import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Avatar from '../components/Avatar'
import BookShelf from '../components/BookShelf'
import {
  useProfile,
  useProfileStats,
} from '../hooks/useProfile'
import {
  useIsFollowing,
  useFollow,
  useUnfollow,
  useFollowers,
  useFollowing,
} from '../hooks/useFollows'
import { useLibrary } from '../hooks/useLibrary'

type ProfileTab = 'read' | 'reading' | 'want_to_read'

export default function Profile() {
  const { username } = useParams<{ username: string }>()
  const currentUser = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState<ProfileTab>('read')
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)

  const { data: profile, isLoading: profileLoading } = useProfile(username!)
  const { data: stats } = useProfileStats(profile?.id ?? '')
  const { data: isFollowing } = useIsFollowing(currentUser?.id ?? '', profile?.id ?? '')
  const follow = useFollow()
  const unfollow = useUnfollow()
  const { data: followersList } = useFollowers(profile?.id ?? '')
  const { data: followingList } = useFollowing(profile?.id ?? '')

  const isOwnProfile = currentUser?.id === profile?.id

  const { data: readEntries } = useLibrary(profile?.id ?? '', 'completed')
  const { data: readingEntries } = useLibrary(profile?.id ?? '', 'reading')
  const { data: wantEntries } = useLibrary(profile?.id ?? '', 'want_to_read')

  const tabBooks: Record<ProfileTab, any[]> = {
    read: readEntries?.map((e: any) => e.books).filter(Boolean) ?? [],
    reading: readingEntries?.map((e: any) => e.books).filter(Boolean) ?? [],
    want_to_read: wantEntries?.map((e: any) => e.books).filter(Boolean) ?? [],
  }

  const tabTitles: Record<ProfileTab, string> = {
    read: 'Read',
    reading: 'Currently Reading',
    want_to_read: 'Want to Read',
  }

  if (profileLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#8b5e3c' }}>
        Profile not found.
      </div>
    )
  }

  const handleFollow = () => {
    if (!currentUser) return
    if (isFollowing) {
      unfollow.mutate({ followerId: currentUser.id, followingId: profile.id })
    } else {
      follow.mutate({ followerId: currentUser.id, followingId: profile.id })
    }
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2.5rem 1.5rem 4rem' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #DCC9A8 0%, #CEBB96 100%)',
          border: '1px solid #B8A47C',
          borderRadius: '16px',
          padding: '2.5rem',
          marginBottom: '2.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Avatar src={profile.avatar_url ?? undefined} name={profile.display_name ?? profile.username} size={80} />

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#3a1f0d', margin: 0 }}>
                {profile.display_name ?? profile.username}
              </h1>
              {isOwnProfile && (
                <Link
                  to="/settings"
                  style={{
                    padding: '0.35rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #c8a882',
                    color: '#7a4e2d',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                  }}
                >
                  Edit Profile
                </Link>
              )}
              {!isOwnProfile && currentUser && (
                <button
                  onClick={handleFollow}
                  style={{
                    padding: '0.4rem 1.1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: isFollowing ? '#e8d5c0' : '#8b5e3c',
                    color: isFollowing ? '#7a4e2d' : '#f5e6d3',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              )}
            </div>

            <p style={{ color: '#9e7a57', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              @{profile.username}
            </p>

            {profile.bio && (
              <p style={{ color: '#5c4030', lineHeight: 1.7, marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                {profile.bio}
              </p>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.875rem', color: '#9e7a57' }}>
              {profile.location && <span>📍 {profile.location}</span>}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#a0522d' }}
                >
                  🔗 {profile.website}
                </a>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.75rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#5c3317' }}>
              {stats?.booksRead ?? 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9e7a57', fontWeight: 500 }}>Books Read</div>
          </div>
          <button
            onClick={() => { setShowFollowers((v) => !v); setShowFollowing(false) }}
            style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#5c3317' }}>
              {stats?.followersCount ?? 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9e7a57', fontWeight: 500 }}>Followers</div>
          </button>
          <button
            onClick={() => { setShowFollowing((v) => !v); setShowFollowers(false) }}
            style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#5c3317' }}>
              {stats?.followingCount ?? 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#9e7a57', fontWeight: 500 }}>Following</div>
          </button>
        </div>

        {showFollowers && followersList && followersList.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #e8d5c0', paddingTop: '1rem' }}>
            <p style={{ fontWeight: 600, color: '#5c3317', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Followers</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {followersList.map((p: any) => (
                <Link
                  key={p.id}
                  to={`/profile/${p.username}`}
                  style={{ color: '#a0522d', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
                >
                  @{p.username}
                </Link>
              ))}
            </div>
          </div>
        )}

        {showFollowing && followingList && followingList.length > 0 && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #e8d5c0', paddingTop: '1rem' }}>
            <p style={{ fontWeight: 600, color: '#5c3317', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Following</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {followingList.map((p: any) => (
                <Link
                  key={p.id}
                  to={`/profile/${p.username}`}
                  style={{ color: '#a0522d', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}
                >
                  @{p.username}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', borderBottom: '2px solid #e8d5c0', marginBottom: '1.5rem' }}>
        {(['read', 'reading', 'want_to_read'] as ProfileTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.65rem 1.25rem',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #8b5e3c' : '2px solid transparent',
              marginBottom: '-2px',
              background: 'transparent',
              color: activeTab === tab ? '#5c3317' : '#9e7a57',
              fontWeight: activeTab === tab ? 700 : 400,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {tabTitles[tab]}
          </button>
        ))}
      </div>

      <BookShelf
        title=""
        books={tabBooks[activeTab]}
        emptyMessage="No books here yet."
      />
    </div>
  )
}
