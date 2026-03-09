import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import ProgressBar from '../components/ProgressBar'
import { useLibrary, useUpdateProgress, useRemoveFromShelf, useAddToShelf } from '../hooks/useLibrary'
import type { ShelfType } from '../types/database'

const TABS: { label: string; shelf: ShelfType }[] = [
  { label: 'Want to Read', shelf: 'want_to_read' },
  { label: 'Reading',      shelf: 'reading' },
  { label: 'Completed',    shelf: 'completed' },
  { label: 'Dropped',      shelf: 'dropped' },
]

const BOOKS_PER_ROW = 10

function ShelfBook({
  entry,
  shelf,
  userId,
  onDragStart,
}: {
  entry: any
  shelf: ShelfType
  userId: string
  onDragStart: (bookId: string, fromShelf: ShelfType) => void
}) {
  const [hovered, setHovered] = useState(false)
  const [pageInput, setPageInput] = useState('')
  const removeFromShelf = useRemoveFromShelf()
  const updateProgress = useUpdateProgress()
  const book = entry.books
  if (!book) return null

  const pageCount = book.page_count ?? 0
  const currentPage = entry.current_page ?? 0

  return (
    <div
      className="shelf-book"
      draggable
      onDragStart={() => onDragStart(book.id, shelf)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/book/${book.id}`} style={{ textDecoration: 'none' }}>
        {book.cover_url
          ? <img src={book.cover_url} alt={book.title} className="shelf-book-cover" />
          : <div className="shelf-book-spine">{book.title}</div>
        }
      </Link>

      {hovered && (
        <div className="shelf-book-tooltip">
          <p style={{ fontWeight: 700, fontSize: '0.78rem', color: '#3a1f0d', marginBottom: 6, lineHeight: 1.3 }}>
            <Link to={`/book/${book.id}`} style={{ color: '#3a1f0d', textDecoration: 'none' }}>
              {book.title}
            </Link>
          </p>

          {shelf === 'reading' && (
            <div style={{ marginBottom: 8 }}>
              <ProgressBar current={currentPage} total={pageCount} />
              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem' }}>
                <input
                  type="number"
                  min={0}
                  max={pageCount || undefined}
                  placeholder="Page #"
                  value={pageInput}
                  onChange={e => setPageInput(e.target.value)}
                  onClick={e => e.preventDefault()}
                  style={{
                    width: 60, padding: '0.2rem 0.4rem', borderRadius: 4,
                    border: '1px solid #c8a882', fontSize: '0.75rem',
                    outline: 'none', color: '#3a1f0d',
                  }}
                />
                <button
                  onClick={e => {
                    e.preventDefault()
                    const page = parseInt(pageInput, 10)
                    if (!isNaN(page)) {
                      updateProgress.mutate({ userId, bookId: book.id, currentPage: page })
                      setPageInput('')
                    }
                  }}
                  style={{
                    padding: '0.2rem 0.5rem', borderRadius: 4, border: 'none',
                    background: '#8b5e3c', color: '#f5e6d3', fontSize: '0.7rem', cursor: 'pointer',
                  }}
                >Save</button>
              </div>
            </div>
          )}

          <button
            onClick={e => {
              e.preventDefault()
              removeFromShelf.mutate({ userId, bookId: book.id })
            }}
            style={{
              width: '100%', padding: '0.25rem', borderRadius: 4,
              border: '1px solid #e8a090', background: 'transparent',
              color: '#c0392b', fontSize: '0.75rem', cursor: 'pointer',
            }}
          >Remove</button>
        </div>
      )}
    </div>
  )
}

function ShelfTab({
  userId,
  shelf,
  onDragStart,
}: {
  userId: string
  shelf: ShelfType
  onDragStart: (bookId: string, fromShelf: ShelfType) => void
}) {
  const { data: entries, isLoading } = useLibrary(userId, shelf)

  if (isLoading) {
    return (
      <div className="bookshelf-wrap" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="bookshelf-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 1.5rem' }}>
        <p style={{ color: '#D4A96A', fontStyle: 'italic', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          No books here yet — start adding some!
        </p>
      </div>
    )
  }

  const rows: any[][] = []
  for (let i = 0; i < entries.length; i += BOOKS_PER_ROW) {
    rows.push(entries.slice(i, i + BOOKS_PER_ROW))
  }

  return (
    <div className="bookshelf-wrap">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx}>
          <div className="bookshelf-row">
            {row.map((entry: any) => (
              <ShelfBook
                key={entry.id}
                entry={entry}
                shelf={shelf}
                userId={userId}
                onDragStart={onDragStart}
              />
            ))}
          </div>
          <div className="shelf-plank" />
        </div>
      ))}
    </div>
  )
}

export default function Library() {
  const user = useAuthStore(s => s.user)
  const [activeTab, setActiveTab] = useState<ShelfType>('want_to_read')
  const [dragOver, setDragOver] = useState<ShelfType | null>(null)
  const [dragging, setDragging] = useState<{ bookId: string; fromShelf: ShelfType } | null>(null)

  const addToShelf = useAddToShelf()

  const { data: wantEntries }      = useLibrary(user?.id ?? '', 'want_to_read')
  const { data: readingEntries }   = useLibrary(user?.id ?? '', 'reading')
  const { data: completedEntries } = useLibrary(user?.id ?? '', 'completed')
  const { data: droppedEntries }   = useLibrary(user?.id ?? '', 'dropped')

  const counts: Record<ShelfType, number> = {
    want_to_read: wantEntries?.length ?? 0,
    reading:      readingEntries?.length ?? 0,
    completed:    completedEntries?.length ?? 0,
    dropped:      droppedEntries?.length ?? 0,
  }

  function handleDragStart(bookId: string, fromShelf: ShelfType) {
    setDragging({ bookId, fromShelf })
  }

  function handleDrop(targetShelf: ShelfType) {
    if (!dragging || !user || dragging.fromShelf === targetShelf) {
      setDragOver(null)
      setDragging(null)
      return
    }
    addToShelf.mutate({ bookId: dragging.bookId, shelf: targetShelf, userId: user.id })
    setActiveTab(targetShelf)
    setDragOver(null)
    setDragging(null)
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: '#d4a96a' }}>
        <p style={{ fontSize: '1.2rem' }}>Please log in to view your library.</p>
        <Link to="/login" style={{ padding: '0.6rem 1.5rem', borderRadius: 8, background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600, textDecoration: 'none' }}>
          Log In
        </Link>
      </div>
    )
  }

  return (
    <div style={{ background: '#3a1c08', minHeight: 'calc(100vh - 60px)' }}>
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <h1 style={{ color: '#f5e6d3', fontWeight: 700, fontSize: '2rem', marginBottom: '1.5rem', textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>
        My Library
      </h1>

      {dragging && (
        <p style={{ color: '#d4a96a', fontSize: 13, marginBottom: 8, fontStyle: 'italic' }}>
          Drag to a tab to move this book
        </p>
      )}

      <div style={{ display: 'flex', borderBottom: '2px solid rgba(212,169,106,0.4)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.shelf}
            onClick={() => setActiveTab(tab.shelf)}
            onDragOver={e => { e.preventDefault(); setDragOver(tab.shelf) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(tab.shelf)}
            style={{
              padding: '0.75rem 1.25rem', border: 'none',
              borderBottom: activeTab === tab.shelf ? '2px solid #d4a96a' : '2px solid transparent',
              marginBottom: -2,
              background: dragOver === tab.shelf ? 'rgba(212,169,106,0.15)' : 'transparent',
              color: activeTab === tab.shelf ? '#f5e6d3' : dragOver === tab.shelf ? '#d4a96a' : 'rgba(245,236,215,0.55)',
              fontWeight: activeTab === tab.shelf ? 700 : 400,
              cursor: 'pointer', fontSize: '0.95rem', transition: 'all 0.15s',
              borderRadius: dragOver === tab.shelf ? '8px 8px 0 0' : 0,
            }}
          >
            {tab.label}
            <span style={{
              marginLeft: '0.4rem',
              background: activeTab === tab.shelf ? '#d4a96a' : 'rgba(212,169,106,0.2)',
              color: activeTab === tab.shelf ? '#3a1f0d' : '#d4a96a',
              borderRadius: '999px', padding: '0.1rem 0.5rem',
              fontSize: '0.75rem', fontWeight: 600,
            }}>{counts[tab.shelf]}</span>
          </button>
        ))}

        <Link
          to="/add-book"
          style={{
            marginLeft: 'auto', alignSelf: 'center',
            padding: '0.4rem 1rem', borderRadius: 6,
            background: '#8b5e3c', color: '#f5e6d3',
            textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
          }}
        >+ Add Book</Link>
      </div>

      <ShelfTab userId={user.id} shelf={activeTab} onDragStart={handleDragStart} />
    </div>
    </div>
  )
}
