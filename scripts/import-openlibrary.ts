/**
 * OpenLibrary Seed Script
 * -----------------------
 * Uses the OpenLibrary Search API to fetch books by subject/query and insert
 * them into Supabase. For bulk seeding, download the OpenLibrary data dump
 * instead (see README).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx ts-node scripts/import-openlibrary.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!  // service role key — bypasses RLS
)

const SUBJECTS = ['fantasy', 'science_fiction', 'mystery', 'romance', 'thriller']
const LIMIT = 100

async function fetchBySubject(subject: string) {
  const url = `https://openlibrary.org/subjects/${subject}.json?limit=${LIMIT}`
  const res = await fetch(url)
  const data = await res.json() as { works: any[] }
  return data.works ?? []
}

async function importWork(work: any) {
  const book = {
    title:        work.title,
    ol_key:       work.key,
    cover_url:    work.cover_id
      ? `https://covers.openlibrary.org/b/id/${work.cover_id}-L.jpg`
      : null,
    publish_date: work.first_publish_year
      ? `${work.first_publish_year}-01-01`
      : null,
  }

  const { data: inserted, error } = await supabase
    .from('books')
    .upsert(book, { onConflict: 'ol_key' })
    .select('id')
    .single()

  if (error) { console.error('Book insert error:', error.message); return }

  for (const a of (work.authors ?? [])) {
    const author = { name: a.name, ol_key: a.key }
    const { data: insertedAuthor } = await supabase
      .from('authors')
      .upsert(author, { onConflict: 'ol_key' })
      .select('id')
      .single()

    if (insertedAuthor) {
      await supabase.from('book_authors').upsert({
        book_id:   inserted.id,
        author_id: insertedAuthor.id,
      }, { onConflict: 'book_id,author_id' })
    }
  }
}

async function main() {
  for (const subject of SUBJECTS) {
    console.log(`Importing subject: ${subject}`)
    const works = await fetchBySubject(subject)
    for (const work of works) {
      await importWork(work)
    }
    console.log(`  Done: ${works.length} works`)
  }
}

main().catch(console.error)
