import { Link } from 'react-router-dom'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{
      background: '#3D1F0A',
      color: '#C4924F',
      padding: '48px 24px 32px',
      marginTop: 'auto',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 40 }}>

          <div>
            <h3 style={{ color: '#D4A96A', fontFamily: 'Georgia, serif', fontSize: '1.3rem', marginBottom: 12 }}>Bookshelf</h3>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: '#A0784A' }}>
              A community for readers. Track what you've read, discover what's next, and connect with fellow book lovers.
            </p>
          </div>

          <div>
            <h4 style={{ color: '#D4A96A', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Explore</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { to: '/', label: 'Home' },
                { to: '/search', label: 'Search Books' },
                { to: '/challenges', label: 'Reading Challenges' },
                { to: '/groups', label: 'Reading Groups' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} style={{ color: '#A0784A', textDecoration: 'none', fontSize: 14, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#D4A96A')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#A0784A')}
                >{label}</Link>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#D4A96A', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Your Library</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { to: '/library', label: 'My Books' },
                { to: '/settings', label: 'Settings' },
                { to: '/settings', label: 'Import from Goodreads' },
              ].map(({ to, label }) => (
                <Link key={label} to={to} style={{ color: '#A0784A', textDecoration: 'none', fontSize: 14, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#D4A96A')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#A0784A')}
                >{label}</Link>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ color: '#D4A96A', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Reading Stats</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['Track your reading progress', 'Set yearly goals', 'Review books you love', 'Follow fellow readers'].map(stat => (
                <p key={stat} style={{ fontSize: 13, color: '#A0784A', margin: 0 }}>· {stat}</p>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #5C3317', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#6B4423', margin: 0 }}>
            © {year} Bookshelf. All rights reserved.
          </p>
          <p style={{ fontSize: 13, color: '#6B4423', margin: 0 }}>
            Book data provided by <a href="https://openlibrary.org" target="_blank" rel="noopener noreferrer" style={{ color: '#A0784A', textDecoration: 'none' }}>Open Library</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
