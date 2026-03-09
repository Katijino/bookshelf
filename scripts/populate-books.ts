/**
 * populate-books.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches the top ~15,000 books from OpenLibrary across 52 subject categories
 * and fully populates your Supabase database — books, authors, and genres.
 *
 * What gets imported:
 *   • Books   — title, subtitle, description, cover, publish date
 *   • Authors — name, bio, photo URL
 *   • Genres  — normalized from OL subjects, linked per book
 *   • Editions data — page count, publisher, ISBN (phase 2)
 *
 * Three phases, all resumable via .populate-state.json:
 *   Phase 1  Subject search & base import   (bulk batched — fast, ~5 min)
 *   Phase 2  Work enrichment               (descriptions, genres)
 *   Phase 3  Author enrichment             (bios, photos)
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx ts-node --esm scripts/populate-books.ts
 *
 * Env options:
 *   CONCURRENCY=5   Parallel requests in phases 2 & 3 (default 5)
 *   DELAY_MS=700    Pause between batches ms (default 700)
 *   PHASE=2         Run only one phase: 1, 2, or 3
 *   FRESH=1         Ignore state file and start over
 */

import { createClient }                           from '@supabase/supabase-js'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join, dirname }                           from 'path'
import { fileURLToPath }                           from 'url'

// ── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL         = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!
const CONCURRENCY          = parseInt(process.env.CONCURRENCY ?? '5')
const DELAY_MS             = parseInt(process.env.DELAY_MS    ?? '700')
const ONLY_PHASE           = process.env.PHASE ? parseInt(process.env.PHASE) : null
const FRESH                = process.env.FRESH === '1'
const CHUNK                = 400   // max rows per Supabase upsert call
const SUBJECT_LIMIT        = 500   // books per subject from OL

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Set SUPABASE_URL and SUPABASE_SERVICE_KEY before running.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

// ── State ─────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const STATE_PATH = join(__dirname, '..', '.populate-state.json')

interface State {
  subjectsCompleted: string[]
  booksProcessed:    number
  phase2Offset:      number   // tracks position through all books (offset pagination)
  phase2Done:        boolean
  phase3Done:        boolean
  startedAt:         string
  updatedAt:         string
}

function loadState(): State {
  if (!FRESH && existsSync(STATE_PATH)) {
    try { return JSON.parse(readFileSync(STATE_PATH, 'utf-8')) } catch {}
  }
  return {
    subjectsCompleted: [],
    booksProcessed:    0,
    phase2Offset:      0,
    phase2Done:        false,
    phase3Done:        false,
    startedAt:         new Date().toISOString(),
    updatedAt:         new Date().toISOString(),
  }
}

function saveState(s: State) {
  s.updatedAt = new Date().toISOString()
  writeFileSync(STATE_PATH, JSON.stringify(s, null, 2))
}

// ── Utilities ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function fetchJSON<T>(url: string, retries = 4): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Bookshelf-Seeder/2.0 (openlibrary.org data import)',
          'Accept':     'application/json',
        },
      })
      if (res.status === 429 || res.status === 503) {
        const wait = Math.pow(2, attempt + 1) * 2000
        process.stdout.write(`\n  ⚠  Rate limited — waiting ${wait / 1000}s…`)
        await sleep(wait)
        continue
      }
      if (!res.ok) {
        if (attempt < retries) { await sleep(800 * (attempt + 1)); continue }
        return null
      }
      return await res.json() as T
    } catch {
      if (attempt < retries) { await sleep(800 * (attempt + 1)); continue }
      return null
    }
  }
  return null
}

/** Run `fn` over items with bounded concurrency + delay between batches. */
async function pool<T>(items: T[], fn: (item: T) => Promise<void>, workers: number) {
  for (let i = 0; i < items.length; i += workers) {
    await Promise.all(items.slice(i, i + workers).map(fn))
    if (i + workers < items.length) await sleep(DELAY_MS)
  }
}

/** Split array into chunks of at most `size`. */
function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── Genre helpers ─────────────────────────────────────────────────────────────

const SUBJECT_NOISE = new Set([
  'accessible book', 'protected daisy', 'large type books', 'in library',
  'readable', 'open library', 'internet archive', 'overdrive', 'nook',
  'kindle', 'ebook', 'electronic resource', 'book', 'books', 'audiobook',
  'bestseller', 'best seller', 'new york times bestseller', 'prize winner',
  'award winner', 'oprah', 'reading group', 'book club',
])

function toGenre(s: string): { name: string; slug: string } | null {
  const name = s.trim()
  if (!name || name.length < 3 || name.length > 64) return null
  const lower = name.toLowerCase()
  if (SUBJECT_NOISE.has(lower)) return null
  if (/^\d+$/.test(name)) return null
  const slug = lower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return slug ? { name, slug } : null
}

// Module-level genre cache — slug → id, shared across all subjects
const genreCache = new Map<string, string>()

/** Upsert genres in bulk and populate the in-memory cache. */
async function upsertGenres(genres: Array<{ name: string; slug: string }>) {
  const novel = genres.filter(g => !genreCache.has(g.slug))
  for (const ch of chunks(novel, CHUNK)) {
    const { data } = await supabase
      .from('genres')
      .upsert(ch, { onConflict: 'slug' })
      .select('id, slug')
    for (const g of data ?? []) genreCache.set(g.slug, g.id)
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  PHASE 1 — Subject search & base import  (BATCHED — ~5 min total)
// ═════════════════════════════════════════════════════════════════════════════

const SUBJECTS = [
  // Fiction
  'fantasy', 'science_fiction', 'mystery', 'romance', 'thriller',
  'horror', 'historical_fiction', 'literary_fiction', 'adventure',
  'crime_fiction', 'detective_fiction', 'dystopian_fiction',
  'young_adult', 'childrens_literature', 'graphic_novels',
  'magical_realism', 'short_stories', 'contemporary_fiction',
  'coming_of_age', 'war_fiction', 'spy_fiction', 'legal_thriller',
  'western', 'gothic_fiction', 'cyberpunk', 'paranormal_romance',
  // Non-fiction
  'biography', 'autobiography', 'memoir', 'history', 'science',
  'philosophy', 'psychology', 'self_help', 'business', 'economics',
  'politics', 'technology', 'nature', 'mathematics', 'medicine',
  'true_crime', 'travel', 'art', 'music', 'cooking', 'religion',
  'education', 'sports',
  // Classics / literary
  'classics', 'poetry', 'drama', 'essays', 'mythology',
]

interface OLSubjectWork {
  key:                 string
  title:               string
  authors?:            Array<{ key: string; name: string }>
  cover_id?:           number
  first_publish_year?: number
  subject?:            string[]
}

interface OLSubjectResponse {
  works: OLSubjectWork[]
}

async function importSubject(subject: string): Promise<number> {
  const url = `https://openlibrary.org/subjects/${subject}.json?limit=${SUBJECT_LIMIT}&sort=readinglog`
  const data = await fetchJSON<OLSubjectResponse>(url)
  const works = data?.works?.filter(w => w.key && w.title) ?? []
  if (!works.length) return 0

  // ── Step 1: Bulk upsert books ─────────────────────────────────────────────
  const booksPayload = works.map(w => ({
    title:        w.title,
    ol_key:       w.key,
    cover_url:    w.cover_id
      ? `https://covers.openlibrary.org/b/id/${w.cover_id}-L.jpg`
      : null,
    publish_date: w.first_publish_year ?? null,
  }))

  const bookMap = new Map<string, string>()   // ol_key → db id
  for (const ch of chunks(booksPayload, CHUNK)) {
    const { data: inserted, error } = await supabase
      .from('books')
      .upsert(ch, { onConflict: 'ol_key' })
      .select('id, ol_key')
    if (error) { console.error(`  books upsert error: ${error.message}`); continue }
    for (const b of inserted ?? []) bookMap.set(b.ol_key, b.id)
  }

  // ── Step 2: Bulk upsert authors ───────────────────────────────────────────
  const authorsUniq = new Map<string, { name: string; ol_key: string }>()
  for (const w of works) {
    for (const a of (w.authors ?? []).slice(0, 6)) {
      if (a.key && a.name && !authorsUniq.has(a.key)) {
        authorsUniq.set(a.key, { name: a.name, ol_key: a.key })
      }
    }
  }

  const authorMap = new Map<string, string>()   // ol_key → db id
  for (const ch of chunks([...authorsUniq.values()], CHUNK)) {
    const { data: inserted } = await supabase
      .from('authors')
      .upsert(ch, { onConflict: 'ol_key' })
      .select('id, ol_key')
    for (const a of inserted ?? []) authorMap.set(a.ol_key, a.id)
  }

  // ── Step 3: Bulk upsert book_authors ──────────────────────────────────────
  const bookAuthors: Array<{ book_id: string; author_id: string; role: string }> = []
  for (const w of works) {
    const bookId = bookMap.get(w.key)
    if (!bookId) continue
    for (const a of (w.authors ?? []).slice(0, 6)) {
      const authorId = authorMap.get(a.key)
      if (authorId) bookAuthors.push({ book_id: bookId, author_id: authorId, role: 'author' })
    }
  }
  for (const ch of chunks(bookAuthors, CHUNK)) {
    await supabase.from('book_authors').upsert(ch, { onConflict: 'book_id,author_id' })
  }

  // ── Step 4: Bulk upsert genres ────────────────────────────────────────────
  // Collect all subjects across all works + the subject category itself
  const allSubjects = [
    subject.replace(/_/g, ' '),
    ...works.flatMap(w => w.subject ?? []),
  ]
  const uniqueGenres = new Map<string, { name: string; slug: string }>()
  for (const s of allSubjects) {
    const g = toGenre(s)
    if (g && !uniqueGenres.has(g.slug)) uniqueGenres.set(g.slug, g)
  }
  await upsertGenres([...uniqueGenres.values()])

  // ── Step 5: Bulk upsert book_genres ───────────────────────────────────────
  const bookGenres: Array<{ book_id: string; genre_id: string }> = []
  const bookGenreSet = new Set<string>()  // dedupe "bookId:genreId"

  for (const w of works) {
    const bookId = bookMap.get(w.key)
    if (!bookId) continue
    const subjects = [subject.replace(/_/g, ' '), ...(w.subject ?? [])]
    let linked = 0
    for (const s of subjects) {
      const g      = toGenre(s)
      const gId    = g ? genreCache.get(g.slug) : undefined
      const dedupe = `${bookId}:${gId}`
      if (gId && !bookGenreSet.has(dedupe)) {
        bookGenreSet.add(dedupe)
        bookGenres.push({ book_id: bookId, genre_id: gId })
        if (++linked >= 8) break
      }
    }
  }
  for (const ch of chunks(bookGenres, CHUNK)) {
    await supabase.from('book_genres').upsert(ch, { onConflict: 'book_id,genre_id' })
  }

  return works.length
}

async function runPhase1(state: State) {
  const todo = SUBJECTS.filter(s => !state.subjectsCompleted.includes(s))
  if (!todo.length) { console.log('  Phase 1 already complete.'); return }

  const rule = '─'.repeat(64)
  console.log(`\n${rule}`)
  console.log(` PHASE 1 — Subject Search & Base Import  (bulk batched)`)
  console.log(`   ${SUBJECTS.length} subjects × ${SUBJECT_LIMIT} books each  |  ${SUBJECTS.length - todo.length} done, ${todo.length} remaining`)
  console.log(rule)

  for (const subject of todo) {
    process.stdout.write(`  ${subject.padEnd(32)} `)
    try {
      const count = await importSubject(subject)
      state.subjectsCompleted.push(subject)
      state.booksProcessed += count
      saveState(state)
      console.log(`${String(count).padStart(4)} works   (running total: ${state.booksProcessed})`)
    } catch (err: any) {
      console.error(`ERROR: ${err?.message}`)
    }
    await sleep(DELAY_MS)
  }

  console.log(`\n  ✓  Phase 1 complete — ${state.booksProcessed} works processed across ${state.subjectsCompleted.length} subjects`)
}

// ═════════════════════════════════════════════════════════════════════════════
//  PHASE 2 — Work enrichment  (description, extra genres)
// ═════════════════════════════════════════════════════════════════════════════

interface OLWorkDetail {
  subtitle?:    string
  description?: string | { value: string }
  subjects?:    string[]
}

async function enrichWork(book: { id: string; ol_key: string; description: string | null }) {
  // Skip if already has a description from a previous run
  if (book.description) return

  const data = await fetchJSON<OLWorkDetail>(`https://openlibrary.org${book.ol_key}.json`)

  const desc = !data ? null
    : typeof data.description === 'string' ? data.description
    : (data.description as any)?.value ?? null

  const updates: Record<string, unknown> = {
    // Always write something so this book won't be re-attempted as "empty".
    // Empty string means "OL had no description" — app treats '' same as null.
    description: desc ? desc.substring(0, 10000) : '',
  }
  if (data?.subtitle) updates.subtitle = data.subtitle.substring(0, 500)

  await supabase.from('books').update(updates).eq('id', book.id)

  if (data?.subjects?.length) {
    const genres: Array<{ name: string; slug: string }> = []
    for (const s of data.subjects) {
      const g = toGenre(s)
      if (g) genres.push(g)
      if (genres.length >= 8) break
    }
    await upsertGenres(genres)

    const bookGenres: Array<{ book_id: string; genre_id: string }> = []
    for (const g of genres) {
      const gId = genreCache.get(g.slug)
      if (gId) bookGenres.push({ book_id: book.id, genre_id: gId })
    }
    if (bookGenres.length) {
      await supabase.from('book_genres').upsert(bookGenres, { onConflict: 'book_id,genre_id' })
    }
  }
}

async function runPhase2(state: State) {
  if (state.phase2Done) { console.log('  Phase 2 already complete.'); return }

  const rule = '─'.repeat(64)
  console.log(`\n${rule}`)
  console.log(` PHASE 2 — Work Enrichment`)
  console.log(`   Fetching descriptions & richer subjects for all books`)
  console.log(`   Resuming from offset ${state.phase2Offset}`)
  console.log(rule)

  const PAGE = 300
  let enriched = 0

  while (true) {
    // Stable offset pagination through ALL books with ol_key.
    // Each book is visited exactly once regardless of whether OL had a description.
    const { data: books, error } = await supabase
      .from('books')
      .select('id, ol_key, description')
      .not('ol_key', 'is', null)
      .order('created_at', { ascending: true })
      .range(state.phase2Offset, state.phase2Offset + PAGE - 1)

    if (error) { console.error('  DB error:', error.message); break }
    if (!books?.length) break

    process.stdout.write(`  Books ${state.phase2Offset + 1}–${state.phase2Offset + books.length}  `)
    await pool(
      books as Array<{ id: string; ol_key: string; description: string | null }>,
      enrichWork,
      CONCURRENCY,
    )
    enriched           += books.length
    state.phase2Offset += books.length
    saveState(state)
    process.stdout.write(`✓  (${enriched} done)\n`)

    if (books.length < PAGE) break
    await sleep(DELAY_MS * 2)
  }

  state.phase2Done = true
  saveState(state)
  console.log(`\n  ✓  Phase 2 complete — ${enriched} books enriched`)
}

// ═════════════════════════════════════════════════════════════════════════════
//  PHASE 3 — Author enrichment  (bio, photo)
// ═════════════════════════════════════════════════════════════════════════════

interface OLAuthorDetail {
  bio?:    string | { value: string }
  photos?: number[]
}

async function enrichAuthor(author: { id: string; ol_key: string }) {
  const data  = await fetchJSON<OLAuthorDetail>(`https://openlibrary.org${author.ol_key}.json`)
  const olid  = author.ol_key.replace('/authors/', '')

  const bio: string | null = !data ? null
    : typeof data.bio === 'string' ? data.bio
    : (data.bio as any)?.value ?? null

  // Always set photo_url — this marks the author as "enrichment attempted"
  // so we don't retry on every resume. Broken URLs handled gracefully by app.
  const photo_url = data?.photos?.length
    ? `https://covers.openlibrary.org/a/id/${data.photos[0]}-L.jpg`
    : `https://covers.openlibrary.org/a/olid/${olid}-L.jpg`

  const updates: Record<string, string | null> = { photo_url }
  if (bio) updates.bio = bio.substring(0, 8000)

  await supabase.from('authors').update(updates).eq('id', author.id)
}

async function runPhase3(state: State) {
  if (state.phase3Done) { console.log('  Phase 3 already complete.'); return }

  const rule = '─'.repeat(64)
  console.log(`\n${rule}`)
  console.log(` PHASE 3 — Author Enrichment`)
  console.log(`   Fetching bios & photos for all authors`)
  console.log(rule)

  const PAGE = 300
  let enriched = 0

  while (true) {
    // photo_url IS NULL = not yet attempted (enrichAuthor always sets it)
    const { data: authors, error } = await supabase
      .from('authors')
      .select('id, ol_key')
      .not('ol_key',   'is', null)
      .is('photo_url', null)
      .order('created_at', { ascending: true })
      .limit(PAGE)

    if (error) { console.error('  DB error:', error.message); break }
    if (!authors?.length) break

    process.stdout.write(`  Enriching ${authors.length} authors  `)
    await pool(authors as Array<{ id: string; ol_key: string }>, enrichAuthor, CONCURRENCY)
    enriched += authors.length
    process.stdout.write(`✓  (${enriched} total)\n`)

    if (authors.length < PAGE) break
    await sleep(DELAY_MS)
  }

  state.phase3Done = true
  saveState(state)
  console.log(`\n  ✓  Phase 3 complete — ${enriched} authors enriched`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║        OpenLibrary → Bookshelf  Population Script             ║
╠════════════════════════════════════════════════════════════════╣
║  Subjects    : ${String(SUBJECTS.length + ' categories').padEnd(47)} ║
║  Per subject : ${String(SUBJECT_LIMIT + ' books max  (sorted by reading popularity)').padEnd(47)} ║
║  Concurrency : ${String(CONCURRENCY + ' parallel workers').padEnd(47)} ║
║  Batch size  : ${String(CHUNK + ' rows per DB call  (bulk inserts)').padEnd(47)} ║
╚════════════════════════════════════════════════════════════════╝

  Est. time:  Phase 1 ~5–10 min  |  Phase 2 ~45–60 min  |  Phase 3 ~15–25 min
`)

  const state = loadState()

  if (!FRESH && (state.subjectsCompleted.length || state.phase2Done || state.phase3Done)) {
    console.log('  Resuming from .populate-state.json:')
    console.log(`    Subjects done : ${state.subjectsCompleted.length} / ${SUBJECTS.length}`)
    console.log(`    Phase 2 done  : ${state.phase2Done}`)
    console.log(`    Phase 3 done  : ${state.phase3Done}`)
    console.log(`    Last updated  : ${state.updatedAt}\n`)
  }

  const all = !ONLY_PHASE
  if (all || ONLY_PHASE === 1) await runPhase1(state)
  if (all || ONLY_PHASE === 2) await runPhase2(state)
  if (all || ONLY_PHASE === 3) await runPhase3(state)

  const done =
    state.subjectsCompleted.length >= SUBJECTS.length &&
    state.phase2Done && state.phase3Done

  if (done) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║   🎉  Complete! Your Bookshelf database is fully populated.   ║
║       Delete .populate-state.json to allow a fresh re-import. ║
╚════════════════════════════════════════════════════════════════╝
`)
  }
}

main().catch(err => {
  console.error('\n❌  Fatal:', err?.message ?? err)
  process.exit(1)
})
