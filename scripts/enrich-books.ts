/**
 * Book Enrichment Script
 * ----------------------
 * Fetches descriptions, genres, and additional metadata from the OpenLibrary
 * Works API for books that are missing this data, then upserts into Supabase.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx ts-node --esm scripts/enrich-books.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const BATCH_SIZE = 20
const DELAY_MS  = 300  // be polite to OpenLibrary's API

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function enrichBook(book: any) {
  if (!book.ol_key) return

  try {
    const res  = await fetch(`https://openlibrary.org${book.ol_key}.json`)
    const data = await res.json() as any

    const description =
      typeof data.description === 'string'
        ? data.description
        : data.description?.value ?? null

    const subjects: string[] = (data.subjects ?? []).slice(0, 8)

    // Update book description
    if (description) {
      await supabase
        .from('books')
        .update({ description })
        .eq('id', book.id)
    }

    // Upsert genres from subjects
    for (const subject of subjects) {
      const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const name = subject

      const { data: genre } = await supabase
        .from('genres')
        .upsert({ name, slug }, { onConflict: 'slug' })
        .select('id')
        .single()

      if (genre) {
        await supabase
          .from('book_genres')
          .upsert({ book_id: book.id, genre_id: genre.id }, { onConflict: 'book_id,genre_id' })
      }
    }

    return true
  } catch {
    return false
  }
}

async function main() {
  // Fetch books missing descriptions (prioritize those)
  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, ol_key')
    .not('ol_key', 'is', null)
    .is('description', null)
    .limit(5000)

  if (error) { console.error(error); process.exit(1) }
  if (!books || books.length === 0) {
    console.log('All books already have descriptions!')
    return
  }

  console.log(`Enriching ${books.length} books...`)
  let success = 0

  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map(enrichBook))
    success += results.filter(Boolean).length
    console.log(`  ${Math.min(i + BATCH_SIZE, books.length)} / ${books.length}`)
    await sleep(DELAY_MS)
  }

  console.log(`Done. Enriched ${success} of ${books.length} books.`)
}

main().catch(console.error)
