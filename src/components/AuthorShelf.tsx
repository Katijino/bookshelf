import { useState } from 'react'
import { Link } from 'react-router-dom'

interface AuthorShelfProps {
  title: string
  books: any[]
  emptyMessage?: string
}

const BOOKS_PER_ROW = 5

function AuthorShelfBook({ book }: { book: any }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="author-shelf-book"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/book/${book.id}`} style={{ textDecoration: 'none' }}>
        {book.cover_url
          ? <img src={book.cover_url} alt={book.title} />
          : <div className="author-shelf-book-fallback">{book.title}</div>
        }
      </Link>

      {hovered && (
        <div className="author-shelf-tooltip">
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.78rem', color: '#2C1810', lineHeight: 1.3 }}>
            {book.title}
          </p>
          {book.book_authors?.[0]?.authors?.name && (
            <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#7A5C40' }}>
              {book.book_authors[0].authors.name}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function AuthorShelf({ title, books, emptyMessage = 'No other books found.' }: AuthorShelfProps) {
  const [expanded, setExpanded] = useState(false)

  if (!books || books.length === 0) {
    return (
      <section style={{ marginBottom: 40 }}>
        {title && <h2 style={{ fontSize: '1.2rem', color: '#2C1810', marginBottom: 14, fontFamily: 'Georgia, serif', fontWeight: 700 }}>{title}</h2>}
        <p style={{ color: '#7A5C40', fontStyle: 'italic' }}>{emptyMessage}</p>
      </section>
    )
  }

  const firstRow = books.slice(0, BOOKS_PER_ROW)
  const rest = books.slice(BOOKS_PER_ROW)
  const hasMore = rest.length > 0

  const extraRows: any[][] = []
  if (expanded) {
    for (let i = 0; i < rest.length; i += BOOKS_PER_ROW) {
      extraRows.push(rest.slice(i, i + BOOKS_PER_ROW))
    }
  }

  return (
    <section style={{ marginBottom: 40 }}>
      {title && (
        <h2 style={{ fontSize: '1.2rem', color: '#2C1810', marginBottom: 14, fontFamily: 'Georgia, serif', fontWeight: 700 }}>
          {title}
        </h2>
      )}

      <div className="author-shelf-wrap">
        {/* First row always visible */}
        <div className="author-shelf-row">
          {firstRow.map((book: any) => (
            <AuthorShelfBook key={book.id} book={book} />
          ))}
        </div>
        <div className="shelf-plank" style={{ marginBottom: expanded && extraRows.length > 0 ? 0 : 0 }} />

        {/* Extra rows when expanded */}
        {expanded && extraRows.map((row, i) => (
          <div key={i}>
            <div className="author-shelf-row" style={{ paddingTop: 14 }}>
              {row.map((book: any) => (
                <AuthorShelfBook key={book.id} book={book} />
              ))}
            </div>
            <div className="shelf-plank" />
          </div>
        ))}
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              padding: '0.45rem 1.5rem', borderRadius: 6,
              border: '1px solid #D4C4A8', background: 'transparent',
              color: '#6B4423', cursor: 'pointer', fontWeight: 600,
              fontSize: '0.875rem', fontFamily: 'Georgia, serif',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F2E6D0' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {expanded ? '↑ Show Less' : `↓ See More  (${rest.length} more)`}
          </button>
        </div>
      )}
    </section>
  )
}
