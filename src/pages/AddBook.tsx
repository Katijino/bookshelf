import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

interface OLResult {
  key: string
  title: string
  author_name?: string[]
  cover_i?: number
  first_publish_year?: number
  isbn?: string[]
  number_of_pages_median?: number
  subject?: string[]
}

export default function AddBook() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<OLResult[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  async function searchOpenLibrary(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResults([])
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=20&fields=key,title,author_name,cover_i,first_publish_year,isbn,number_of_pages_median,subject`
      const res = await fetch(url)
      const data = await res.json()
      setResults(data.docs ?? [])
    } catch {
      setError('Failed to reach OpenLibrary. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function saveBook(work: OLResult) {
    if (!user) { navigate('/login'); return }
    const olKey = work.key
    setSaving(olKey)
    try {
      // Upsert book
      const bookData = {
        title: work.title,
        ol_key: olKey,
        cover_url: work.cover_i ? `https://covers.openlibrary.org/b/id/${work.cover_i}-L.jpg` : null,
        publish_date: work.first_publish_year ?? null,
        page_count: work.number_of_pages_median ?? null,
      }
      const { data: book, error: bookErr } = await supabase
        .from('books')
        .upsert(bookData, { onConflict: 'ol_key' })
        .select('id')
        .single()

      if (bookErr) throw new Error(bookErr.message)

      // Upsert authors
      for (const authorName of (work.author_name ?? []).slice(0, 3)) {
        const { data: author } = await supabase
          .from('authors')
          .upsert({ name: authorName }, { onConflict: 'name' })
          .select('id')
          .single()
        if (author) {
          await supabase
            .from('book_authors')
            .upsert({ book_id: book.id, author_id: author.id }, { onConflict: 'book_id,author_id' })
        }
      }

      // Fetch full work data for description + genres
      try {
        const workRes = await fetch(`https://openlibrary.org${olKey}.json`)
        const workData = await workRes.json()

        // Save description
        const description =
          typeof workData.description === 'string'
            ? workData.description
            : workData.description?.value ?? null
        if (description) {
          await supabase.from('books').update({ description }).eq('id', book.id)
        }

        // Save genres from subjects
        const subjects: string[] = (workData.subjects ?? []).slice(0, 8)
        for (const subject of subjects) {
          const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          const { data: genre } = await supabase
            .from('genres')
            .upsert({ name: subject, slug }, { onConflict: 'slug' })
            .select('id')
            .single()
          if (genre) {
            await supabase
              .from('book_genres')
              .upsert({ book_id: book.id, genre_id: genre.id }, { onConflict: 'book_id,genre_id' })
          }
        }
      } catch {
        // Genre/description fetch is best-effort — don't block on failure
      }

      setSaved(prev => new Set([...prev, olKey]))
      // Navigate to the book page
      setTimeout(() => navigate(`/book/${book.id}`), 400)
    } catch (err: any) {
      setError(err.message ?? 'Failed to save book. Make sure you are logged in.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <h1 style={{ color: '#2C1810', fontWeight: 700, fontSize: '2rem', marginBottom: '0.5rem' }}>
        Add a Book
      </h1>
      <p style={{ color: '#7A5C40', marginBottom: '2rem', fontSize: '0.95rem' }}>
        Search OpenLibrary's catalog of millions of books and add any to your collection.
      </p>

      <form onSubmit={searchOpenLibrary} style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by title, author, or ISBN…"
          style={{
            flex: 1, padding: '0.75rem 1rem', borderRadius: 8,
            border: '1px solid #B8A47C', background: '#EAE0CC',
            color: '#1A0A02', fontSize: '1rem', outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem', borderRadius: 8, border: 'none',
            background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600,
            fontSize: '1rem', cursor: loading ? 'wait' : 'pointer', whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && (
        <div style={{ background: 'rgba(192,57,43,0.15)', border: '1px solid #e8a090', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#f5e6d3' }}>
          {error}
        </div>
      )}

      {!user && results.length > 0 && (
        <div style={{ background: '#FBF0DC', border: '1px solid #D4C4A8', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#5C3317' }}>
          <a href="/login" style={{ color: '#8B5E3C', fontWeight: 600 }}>Sign in</a> to save books to the database.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {results.map(work => (
          <div
            key={work.key}
            style={{
              background: '#DCC9A8', border: '1px solid #B8A47C', borderRadius: 10,
              padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start',
            }}
          >
            {work.cover_i
              ? <img src={`https://covers.openlibrary.org/b/id/${work.cover_i}-M.jpg`} alt={work.title} style={{ width: 56, height: 80, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
              : <div style={{ width: 56, height: 80, background: 'linear-gradient(135deg, #c8a882, #8b5e3c)', borderRadius: 4, flexShrink: 0 }} />
            }

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, color: '#3a1f0d', marginBottom: '0.2rem', fontSize: '0.975rem' }}>
                {work.title}
              </p>
              {work.author_name && (
                <p style={{ color: '#8b5e3c', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  {work.author_name.slice(0, 3).join(', ')}
                </p>
              )}
              <p style={{ color: '#9e7a57', fontSize: '0.8rem' }}>
                {work.first_publish_year && `First published ${work.first_publish_year}`}
                {work.number_of_pages_median && ` · ${work.number_of_pages_median} pages`}
              </p>
            </div>

            <button
              onClick={() => saveBook(work)}
              disabled={saving === work.key || saved.has(work.key)}
              style={{
                padding: '0.45rem 1rem', borderRadius: 7, border: 'none', flexShrink: 0,
                background: saved.has(work.key) ? '#27AE60' : '#8b5e3c',
                color: '#f5e6d3', fontWeight: 600, fontSize: '0.85rem',
                cursor: (saving === work.key || saved.has(work.key)) ? 'default' : 'pointer',
                opacity: saving === work.key ? 0.7 : 1,
              }}
            >
              {saved.has(work.key) ? 'Added ✓' : saving === work.key ? 'Saving…' : user ? 'Add to Site' : 'Sign in to Add'}
            </button>
          </div>
        ))}
      </div>

      {results.length === 0 && !loading && query && (
        <p style={{ color: '#9E8060', textAlign: 'center', padding: '2rem', fontStyle: 'italic' }}>
          No results found. Try a different search.
        </p>
      )}
    </div>
  )
}
