import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { validateCSV, parseGoodreadsCSV, type GoodreadsRow } from '../lib/goodreadsParser'

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = 'idle' | 'preview' | 'importing' | 'done'

interface ImportStats {
  total:     number
  imported:  number
  matched:   number   // found in DB, not created
  created:   number   // new book inserted
  skipped:   number   // already on shelf
  errors:    number
}

// ── Supabase helpers ────────────────────────────────────────────────────────

async function findOrCreateAuthor(name: string): Promise<string | null> {
  if (!name) return null
  const { data: existing } = await supabase
    .from('authors')
    .select('id')
    .ilike('name', name.trim())
    .maybeSingle()
  if (existing) return existing.id

  const { data: created } = await supabase
    .from('authors')
    .insert({ name: name.trim() })
    .select('id')
    .single()
  return created?.id ?? null
}

async function findOrCreateBook(row: GoodreadsRow): Promise<{ id: string; created: boolean } | null> {
  // 1) Match by ISBN-13
  if (row.isbn13) {
    const { data } = await supabase.from('books').select('id').eq('isbn_13', row.isbn13).maybeSingle()
    if (data) return { id: data.id, created: false }
  }
  // 2) Match by ISBN-10
  if (row.isbn10) {
    const { data } = await supabase.from('books').select('id').eq('isbn_10', row.isbn10).maybeSingle()
    if (data) return { id: data.id, created: false }
  }
  // 3) Match by exact title (case-insensitive)
  if (row.title) {
    const { data } = await supabase.from('books').select('id').ilike('title', row.title.trim()).maybeSingle()
    if (data) return { id: data.id, created: false }
  }
  // 4) Create new book
  const insert: Record<string, unknown> = {
    title:        row.title,
    isbn_10:      row.isbn10  ?? null,
    isbn_13:      row.isbn13  ?? null,
    publisher:    row.publisher || null,
    page_count:   row.pageCount ?? null,
    language:     'en',
  }
  if (row.yearPublished) {
    insert.publish_date = Number(row.yearPublished)
  }
  const { data: created, error: bookError } = await supabase.from('books').insert(insert).select('id').single()
  if (bookError) throw new Error(`Book insert error: ${bookError.message}`)
  if (!created) return null

  // Link primary author
  if (row.author) {
    const authorId = await findOrCreateAuthor(row.author)
    if (authorId) {
      await supabase.from('book_authors').insert({ book_id: created.id, author_id: authorId, role: 'author' })
    }
  }
  return { id: created.id, created: true }
}

async function isAlreadyOnShelf(userId: string, bookId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_books')
    .select('id')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle()
  return !!data
}

async function addToShelf(userId: string, bookId: string, row: GoodreadsRow): Promise<void> {
  const upsertData: Record<string, unknown> = {
    user_id:      userId,
    book_id:      bookId,
    shelf:        row.shelf,
    current_page: 0,
    updated_at:   new Date().toISOString(),
  }
  if (row.dateAdded) upsertData.date_started  = row.dateAdded
  if (row.dateRead)  upsertData.date_finished = row.dateRead

  const { error: shelfError } = await supabase.from('user_books').upsert(upsertData, { onConflict: 'user_id,book_id' })
  if (shelfError) throw new Error(`Shelf error: ${shelfError.message}`)

  if (row.myRating > 0 || row.reviewText) {
    const { error: reviewError } = await supabase.from('reviews').upsert(
      {
        user_id: userId,
        book_id: bookId,
        rating:  row.myRating > 0 ? row.myRating : null,
        body:    row.reviewText || null,
        spoiler: row.isSpoiler,
      },
      { onConflict: 'user_id,book_id' }
    )
    if (reviewError) throw new Error(`Review error: ${reviewError.message}`)
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ShelfBadge({ shelf }: { shelf: GoodreadsRow['shelf'] }) {
  const map = {
    want_to_read: { label: 'Want to Read', color: '#5b8dd9', bg: 'rgba(91,141,217,0.12)' },
    reading:      { label: 'Reading',      color: '#d97b5b', bg: 'rgba(217,123,91,0.12)' },
    completed:    { label: 'Read',         color: '#5bba7a', bg: 'rgba(91,186,122,0.12)' },
  }
  const { label, color, bg } = map[shelf]
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 20,
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em',
      color, background: bg, border: `1px solid ${color}33`,
      fontFamily: '"DM Sans", sans-serif',
    }}>
      {label}
    </span>
  )
}

function StarRatingDisplay({ rating }: { rating: number }) {
  if (!rating) return <span style={{ color: '#9e8060', fontSize: '0.8rem', fontFamily: '"DM Sans", sans-serif' }}>—</span>
  return (
    <span style={{ color: '#D4A017', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

// ── Progress bar component ─────────────────────────────────────────────────

function ImportProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ width: '100%', height: 8, background: 'rgba(0,0,0,0.12)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`,
        background: 'linear-gradient(90deg, #8B5E3C, #D4A017)',
        borderRadius: 4,
        transition: 'width 0.3s ease',
      }} />
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function GoodreadsImport() {
  const user = useAuthStore(s => s.user)

  const [phase, setPhase]         = useState<Phase>('idle')
  const [dragging, setDragging]   = useState(false)
  const [rows, setRows]           = useState<GoodreadsRow[]>([])
  const [error, setError]         = useState<string | null>(null)
  const [stats, setStats]         = useState<ImportStats>({ total: 0, imported: 0, matched: 0, created: 0, skipped: 0, errors: 0 })
  const [currentBook, setCurrentBook] = useState<string>('')
  const [currentIdx, setCurrentIdx]   = useState(0)
  const errorLogRef = useRef<string[]>([])
  const [errorLog, setErrorLog]   = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef     = useRef(false)

  // ── File handling ─────────────────────────────────────────────────────────

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv' && !file.type.includes('comma')) {
      setError('Please upload a .csv file.')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const validation = validateCSV(text)
      if (!validation.valid) {
        setError(validation.error ?? 'Invalid file.')
        return
      }
      const parsed = parseGoodreadsCSV(text)
      if (parsed.length === 0) {
        setError('No books found in this file.')
        return
      }
      setError(null)
      setRows(parsed)
      setPhase('preview')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  // ── Import logic ──────────────────────────────────────────────────────────

  const runImport = async () => {
    if (!user) return
    abortRef.current = false
    setPhase('importing')
    const s: ImportStats = { total: rows.length, imported: 0, matched: 0, created: 0, skipped: 0, errors: 0 }
    setStats({ ...s })
    errorLogRef.current = []

    for (let i = 0; i < rows.length; i++) {
      if (abortRef.current) break
      const row = rows[i]
      setCurrentIdx(i + 1)
      setCurrentBook(row.title)

      try {
        const result = await findOrCreateBook(row)
        if (!result) { s.errors++; setStats({ ...s }); continue }

        const already = await isAlreadyOnShelf(user.id, result.id)
        if (already) { s.skipped++; setStats({ ...s }); continue }

        await addToShelf(user.id, result.id, row)

        s.imported++
        if (result.created) s.created++
        else s.matched++
      } catch (e) {
        s.errors++
        const msg = e instanceof Error ? e.message : String(e)
        errorLogRef.current.push(`"${row.title}": ${msg}`)
      }
      setStats({ ...s })
    }
    setPhase('done')
    setErrorLog([...errorLogRef.current])
    setCurrentBook('')
  }

  const reset = () => {
    setPhase('idle')
    setRows([])
    setError(null)
    setStats({ total: 0, imported: 0, matched: 0, created: 0, skipped: 0, errors: 0 })
    setCurrentBook('')
    setCurrentIdx(0)
    setErrorLog([])
    errorLogRef.current = []
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Auth guard ─────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <p style={{ color: '#5c3317', fontSize: '1.1rem', fontFamily: '"DM Sans", sans-serif' }}>
          Please sign in to import your Goodreads library.
        </p>
        <Link to="/login" style={{ padding: '0.65rem 1.75rem', borderRadius: 8, background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600, textDecoration: 'none', fontFamily: '"DM Sans", sans-serif' }}>
          Sign In
        </Link>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.5rem 5rem', fontFamily: '"DM Sans", sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #8B5E3C, #5c3317)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(139,94,60,0.35)',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f5e6d3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#2A0F02', fontFamily: '"Playfair Display", Georgia, serif', lineHeight: 1.2 }}>
              Import from Goodreads
            </h1>
            <p style={{ margin: 0, color: '#7A5030', fontSize: '0.92rem', marginTop: 2 }}>
              Bring your entire reading history into Bookshelf in seconds.
            </p>
          </div>
        </div>
      </div>

      {/* How to export instructions */}
      {phase === 'idle' && (
        <div style={{
          background: 'linear-gradient(135deg, #CEBB96, #B8A47C)',
          border: '1px solid #A89060',
          borderRadius: 14,
          padding: '1.5rem 1.75rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{ margin: '0 0 1rem', fontSize: '1.05rem', fontWeight: 700, color: '#2A0F02', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5c3317" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            How to export your Goodreads library
          </h2>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', color: '#3A1808' }}>
            <li style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Sign in to <strong>Goodreads.com</strong> and go to <strong>My Books</strong>
            </li>
            <li style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Click <strong>Import and Export</strong> in the left sidebar, or go to{' '}
              <code style={{ background: 'rgba(0,0,0,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: '0.82rem' }}>
                goodreads.com/review/import
              </code>
            </li>
            <li style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Click <strong>Export Library</strong> at the top of the page
            </li>
            <li style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              Wait a moment, then click <strong>Your export from … (click here to download)</strong>
            </li>
            <li style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
              You'll have a file called <code style={{ background: 'rgba(0,0,0,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: '0.82rem' }}>goodreads_library_export.csv</code> — upload it below.
            </li>
          </ol>
        </div>
      )}

      {/* Upload zone */}
      {phase === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#D4A017' : '#B8A47C'}`,
            borderRadius: 18,
            padding: '3.5rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'rgba(212,160,23,0.06)' : 'rgba(220,201,168,0.25)',
            transition: 'border-color 0.2s, background 0.2s',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 14, margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, #DCC9A8, #C8B490)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(139,94,60,0.2)',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5c3317" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 700, color: '#2A0F02' }}>
            {dragging ? 'Drop it here!' : 'Drop your CSV file here'}
          </p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#7A5030' }}>
            or click to browse — <em>goodreads_library_export.csv</em>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(192,57,43,0.08)', border: '1px solid rgba(192,57,43,0.3)',
          borderRadius: 10, padding: '0.9rem 1.25rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ color: '#8B2020', fontSize: '0.9rem', lineHeight: 1.5 }}>{error}</span>
        </div>
      )}

      {/* Preview table */}
      {phase === 'preview' && rows.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#2A0F02' }}>
                {rows.length.toLocaleString()} books found
              </h2>
              <p style={{ margin: '4px 0 0', color: '#7A5030', fontSize: '0.875rem' }}>
                Review the list below, then click Import to add them to your shelves.
              </p>
            </div>
            <button
              onClick={reset}
              style={{
                background: 'none', border: '1px solid #B8A47C', borderRadius: 8,
                padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem',
                color: '#5c3317', fontFamily: '"DM Sans", sans-serif',
              }}
            >
              Change file
            </button>
          </div>

          {/* Summary chips */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {[
              { label: 'Read', count: rows.filter(r => r.shelf === 'completed').length, color: '#5bba7a' },
              { label: 'Reading', count: rows.filter(r => r.shelf === 'reading').length, color: '#d97b5b' },
              { label: 'Want to Read', count: rows.filter(r => r.shelf === 'want_to_read').length, color: '#5b8dd9' },
              { label: 'Rated', count: rows.filter(r => r.myRating > 0).length, color: '#D4A017' },
            ].map(({ label, count, color }) => (
              <div key={label} style={{
                background: `${color}18`, border: `1px solid ${color}44`,
                borderRadius: 20, padding: '4px 12px', fontSize: '0.82rem',
                fontWeight: 600, color,
              }}>
                {count.toLocaleString()} {label}
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{
            border: '1px solid #B8A47C', borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              maxHeight: 420, overflowY: 'auto',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(180deg, #C8B490, #B8A47C)', position: 'sticky', top: 0, zIndex: 1 }}>
                    {['Title', 'Author', 'Shelf', 'Rating', 'Date Read'].map(h => (
                      <th key={h} style={{
                        padding: '10px 14px', textAlign: 'left', fontWeight: 700,
                        fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: '#2A0F02', borderBottom: '1px solid #A89060',
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      style={{ background: i % 2 === 0 ? '#DCC9A8' : '#D4BE98' }}
                    >
                      <td style={{ padding: '9px 14px', color: '#1A0A02', fontWeight: 600, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.title}
                      </td>
                      <td style={{ padding: '9px 14px', color: '#5c3317', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.author}
                      </td>
                      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                        <ShelfBadge shelf={row.shelf} />
                      </td>
                      <td style={{ padding: '9px 14px', whiteSpace: 'nowrap' }}>
                        <StarRatingDisplay rating={row.myRating} />
                      </td>
                      <td style={{ padding: '9px 14px', color: '#7A5030', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {row.dateRead ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: '1.25rem', alignItems: 'center' }}>
            <button
              onClick={runImport}
              style={{
                padding: '0.7rem 2rem', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #8B5E3C, #5c3317)',
                color: '#f5e6d3', fontWeight: 700, cursor: 'pointer',
                fontSize: '0.95rem', fontFamily: '"DM Sans", sans-serif',
                boxShadow: '0 4px 14px rgba(139,94,60,0.4)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(139,94,60,0.5)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(139,94,60,0.4)' }}
            >
              Import {rows.length.toLocaleString()} Books
            </button>
            <button
              onClick={reset}
              style={{
                padding: '0.7rem 1.5rem', borderRadius: 10,
                border: '1px solid #B8A47C', background: 'transparent',
                color: '#5c3317', fontWeight: 600, cursor: 'pointer',
                fontSize: '0.95rem', fontFamily: '"DM Sans", sans-serif',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Importing progress */}
      {phase === 'importing' && (
        <div style={{
          background: '#DCC9A8', border: '1px solid #B8A47C',
          borderRadius: 14, padding: '2rem', marginBottom: '1.5rem',
        }}>
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.15rem', fontWeight: 700, color: '#2A0F02' }}>
            Importing your library…
          </h2>

          <ImportProgressBar value={currentIdx} max={stats.total} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#7A5030' }}>
              {currentIdx} of {stats.total}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#7A5030', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
              {currentBook}
            </span>
          </div>

          {/* Live counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Imported',  value: stats.imported,  color: '#5bba7a' },
              { label: 'New Books', value: stats.created,   color: '#5b8dd9' },
              { label: 'Skipped',   value: stats.skipped,   color: '#D4A017' },
              { label: 'Errors',    value: stats.errors,    color: '#c0392b' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: `${color}10`, border: `1px solid ${color}30`,
                borderRadius: 10, padding: '0.85rem 1rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#7A5030', marginTop: 4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => { abortRef.current = true }}
            style={{
              marginTop: '1.25rem', padding: '0.5rem 1.25rem', borderRadius: 8,
              border: '1px solid rgba(192,57,43,0.35)', background: 'transparent',
              color: '#c0392b', cursor: 'pointer', fontSize: '0.875rem',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            Cancel import
          </button>
        </div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div style={{
          background: '#DCC9A8', border: '1px solid #B8A47C',
          borderRadius: 14, padding: '2rem', marginBottom: '1.5rem',
        }}>
          {/* Success banner */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(91,186,122,0.15), rgba(91,186,122,0.08))',
            border: '1px solid rgba(91,186,122,0.4)',
            borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(91,186,122,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5bba7a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#1A5C30', fontSize: '0.95rem' }}>
                Import complete!
              </div>
              <div style={{ color: '#2A7040', fontSize: '0.82rem', marginTop: 2 }}>
                {stats.imported} books added to your shelves
              </div>
            </div>
          </div>

          {/* Final stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '1.5rem' }}>
            {[
              { label: 'Total Books',  value: stats.total,    color: '#5c3317' },
              { label: 'Imported',     value: stats.imported, color: '#5bba7a' },
              { label: 'Already Had',  value: stats.skipped,  color: '#D4A017' },
              { label: 'Errors',       value: stats.errors,   color: stats.errors > 0 ? '#c0392b' : '#9e8060' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'rgba(0,0,0,0.04)', border: '1px solid #B8A47C',
                borderRadius: 10, padding: '0.85rem 1rem', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: '#7A5030', marginTop: 4, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Breakdown */}
          {stats.imported > 0 && (
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#5c3317', lineHeight: 1.6 }}>
              <strong>{stats.matched}</strong> matched existing books in our database ·{' '}
              <strong>{stats.created}</strong> new books created
            </p>
          )}

          {errorLog.length > 0 && (
            <details style={{ marginBottom: '1.25rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: '#c0392b', marginBottom: '0.5rem' }}>
                {errorLog.length} error{errorLog.length !== 1 ? 's' : ''} — click to see details
              </summary>
              <div style={{
                background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)',
                borderRadius: 8, padding: '0.75rem 1rem', maxHeight: 200, overflowY: 'auto',
              }}>
                {errorLog.map((msg, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: '#8B2020', marginBottom: 4, lineHeight: 1.5 }}>
                    {msg}
                  </div>
                ))}
              </div>
            </details>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <Link
              to="/library"
              style={{
                padding: '0.65rem 1.5rem', borderRadius: 10,
                background: 'linear-gradient(135deg, #8B5E3C, #5c3317)',
                color: '#f5e6d3', fontWeight: 700, textDecoration: 'none',
                fontSize: '0.9rem', fontFamily: '"DM Sans", sans-serif',
              }}
            >
              View My Library
            </Link>
            <button
              onClick={reset}
              style={{
                padding: '0.65rem 1.25rem', borderRadius: 10,
                border: '1px solid #B8A47C', background: 'transparent',
                color: '#5c3317', fontWeight: 600, cursor: 'pointer',
                fontSize: '0.9rem', fontFamily: '"DM Sans", sans-serif',
              }}
            >
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
