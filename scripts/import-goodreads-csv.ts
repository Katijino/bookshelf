/**
 * Goodreads CSV Import Script
 * ---------------------------
 * Run locally or deploy as a Supabase Edge Function.
 * Accepts the CSV exported from Goodreads (My Books → Export Library).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... USER_ID=... \
 *   CSV_PATH=./goodreads_library_export.csv \
 *   npx ts-node scripts/import-goodreads-csv.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

const USER_ID  = process.env.USER_ID!
const CSV_PATH = process.env.CSV_PATH ?? './goodreads_library_export.csv'

const SHELF_MAP: Record<string, string> = {
  'read':              'completed',
  'currently-reading': 'reading',
  'to-read':           'want_to_read',
}

function parseCSV(content: string): Record<string, string>[] {
  const lines  = content.split('\n')
  const headers = lines[0].split(',').map((h) => h.replace(/"/g, '').trim())
  return lines.slice(1).filter(Boolean).map((line) => {
    const values = line.split(',').map((v) => v.replace(/"/g, '').trim())
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']))
  })
}

async function findOrCreateBook(row: Record<string, string>) {
  const isbn13 = row['ISBN13']?.replace(/[^0-9]/g, '') || null
  const isbn10 = row['ISBN']?.replace(/[^0-9X]/g, '')  || null

  if (isbn13) {
    const { data } = await supabase.from('books').select('id').eq('isbn_13', isbn13).single()
    if (data) return data.id
  }

  // Fetch from OpenLibrary by ISBN as fallback
  if (isbn13 || isbn10) {
    const isbnQuery = isbn13 ?? isbn10
    const res  = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbnQuery}&format=json&jscmd=data`)
    const data = await res.json() as Record<string, any>
    const entry = Object.values(data)[0]
    if (entry) {
      const { data: inserted } = await supabase.from('books').upsert({
        title:        entry.title ?? row['Title'],
        isbn_13:      isbn13,
        isbn_10:      isbn10,
        publisher:    entry.publishers?.[0]?.name ?? null,
        page_count:   parseInt(entry.number_of_pages) || null,
        publish_date: entry.publish_date ? new Date(entry.publish_date).toISOString().split('T')[0] : null,
        cover_url:    entry.cover?.large ?? entry.cover?.medium ?? null,
        ol_key:       entry.key ?? null,
      }, { onConflict: 'isbn_13' }).select('id').single()
      if (inserted) return inserted.id
    }
  }

  // Last resort: insert with title/author only
  const { data: minimal } = await supabase.from('books').insert({
    title:   row['Title'],
    isbn_13: isbn13,
    isbn_10: isbn10,
  }).select('id').single()
  return minimal?.id ?? null
}

async function main() {
  const csv  = readFileSync(CSV_PATH, 'utf-8')
  const rows = parseCSV(csv)

  let imported = 0, skipped = 0

  for (const row of rows) {
    const bookId = await findOrCreateBook(row)
    if (!bookId) { skipped++; continue }

    const rawShelf  = (row['Exclusive Shelf'] ?? '').toLowerCase()
    const shelf     = SHELF_MAP[rawShelf] ?? 'want_to_read'
    const rating    = parseFloat(row['My Rating'])
    const dateRead  = row['Date Read']  ? new Date(row['Date Read']).toISOString().split('T')[0]  : null
    const dateAdded = row['Date Added'] ? new Date(row['Date Added']).toISOString().split('T')[0] : null

    await supabase.from('user_books').upsert({
      user_id:       USER_ID,
      book_id:       bookId,
      shelf,
      date_finished: dateRead,
      date_started:  dateAdded,
    }, { onConflict: 'user_id,book_id' })

    if (rating > 0) {
      await supabase.from('reviews').upsert({
        user_id: USER_ID,
        book_id: bookId,
        rating,
      }, { onConflict: 'user_id,book_id' })
    }

    imported++
  }

  console.log(`Import complete. Imported: ${imported}, Skipped: ${skipped}`)
}

main().catch(console.error)
