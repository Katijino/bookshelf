/**
 * goodreadsParser.ts
 * ──────────────────
 * Parses Goodreads library export CSV files into structured row objects.
 *
 * Handles Goodreads quirks:
 *  • ISBNs wrapped in Excel formula format:  ="9781234567890"
 *  • Properly quoted fields containing commas (e.g. series titles)
 *  • Multi-line review text inside quoted fields
 *  • Date format: "2022/12/24" → "2022-12-24"
 *  • Empty ISBN fields: =""  →  null
 */

export interface GoodreadsRow {
  goodreadsId:       string
  title:             string
  author:            string
  additionalAuthors: string
  isbn10:            string | null
  isbn13:            string | null
  myRating:          number        // 0 = no rating, 1–5 = star rating
  avgRating:         number
  publisher:         string
  binding:           string        // "Hardcover", "Paperback", etc.
  pageCount:         number | null
  yearPublished:     number | null
  originalYear:      number | null
  dateRead:          string | null // ISO "YYYY-MM-DD"
  dateAdded:         string | null // ISO "YYYY-MM-DD"
  shelf:             'want_to_read' | 'reading' | 'completed'
  reviewText:        string
  isSpoiler:         boolean
  readCount:         number
}

export interface ParseValidation {
  valid:  boolean
  error?: string
}

// ── Internal helpers ───────────────────────────────────────────────────────

/**
 * Proper RFC-4180 CSV field splitter.
 * Handles quoted fields, escaped quotes (""), commas inside quotes.
 */
function splitLine(line: string): string[] {
  const fields: string[] = []
  let field    = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      // Escaped quote inside a quoted field
      if (inQuotes && line[i + 1] === '"') {
        field += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  fields.push(field)
  return fields
}

/**
 * Strip surrounding quotes from a parsed field value.
 */
function clean(s: string): string {
  s = s.trim()
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).replace(/""/g, '"')
  }
  return s.trim()
}

/**
 * Extract a pure digit string from Goodreads' ="ISBN" Excel formula format.
 * Also handles plain strings, quoted strings, and empty values.
 * Returns null if the result isn't a valid ISBN length (10 or 13 digits).
 */
function extractISBN(raw: string): string | null {
  // Strip =  "  and whitespace
  const digits = raw.replace(/[="'\s]/g, '').replace(/\D/g, '')
  if (digits.length === 13 || digits.length === 10) return digits
  return null
}

/**
 * Convert Goodreads date "2022/12/24" to ISO "2022-12-24".
 */
function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const parts = s.split('/')
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

const SHELF_MAP: Record<string, GoodreadsRow['shelf']> = {
  'to-read':          'want_to_read',
  'currently-reading':'reading',
  'read':             'completed',
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Validate that the uploaded text looks like a Goodreads CSV export.
 */
export function validateCSV(text: string): ParseValidation {
  if (!text || text.trim() === '') {
    return { valid: false, error: 'The file is empty.' }
  }
  const firstLine = text.split('\n')[0]
  if (!firstLine.includes('Title') || !firstLine.includes('Author')) {
    return {
      valid: false,
      error: "This doesn't look like a Goodreads export. Please upload goodreads_library_export.csv.",
    }
  }
  if (!firstLine.includes('ISBN') && !firstLine.includes('Exclusive Shelf')) {
    return {
      valid: false,
      error: 'Missing expected Goodreads columns. Make sure you export using the Goodreads CSV format.',
    }
  }
  return { valid: true }
}

/**
 * Parse a full Goodreads CSV text into an array of structured rows.
 * Skips malformed lines silently.
 */
export function parseGoodreadsCSV(text: string): GoodreadsRow[] {
  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Split into logical lines — a quoted field may span multiple physical lines
  const logicalLines: string[] = []
  let current  = ''
  let inQuotes = false

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      current += ch
    } else if (ch === '\n' && !inQuotes) {
      if (current.trim()) logicalLines.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) logicalLines.push(current)

  if (logicalLines.length < 2) return []

  // Parse headers
  const rawHeaders = splitLine(logicalLines[0])
  const headers    = rawHeaders.map(h => clean(h))

  const col = (fields: string[], name: string): string => {
    const idx = headers.indexOf(name)
    return idx >= 0 ? clean(fields[idx] ?? '') : ''
  }

  // Parse each data row
  const rows: GoodreadsRow[] = []
  for (const line of logicalLines.slice(1)) {
    try {
      const fields = splitLine(line)
      const title  = col(fields, 'Title')
      if (!title) continue  // Skip rows without a title

      const rawShelf   = col(fields, 'Exclusive Shelf').toLowerCase()
      const shelf      = SHELF_MAP[rawShelf] ?? 'want_to_read'
      const pageStr    = col(fields, 'Number of Pages')
      const yearStr    = col(fields, 'Year Published')
      const origStr    = col(fields, 'Original Publication Year')
      const ratingStr  = col(fields, 'My Rating')
      const avgStr     = col(fields, 'Average Rating')
      const spoilerStr = col(fields, 'Spoiler').toLowerCase()
      const rcStr      = col(fields, 'Read Count')

      rows.push({
        goodreadsId:       col(fields, 'Book Id'),
        title,
        author:            col(fields, 'Author'),
        additionalAuthors: col(fields, 'Additional Authors'),
        isbn10:            extractISBN(col(fields, 'ISBN')),
        isbn13:            extractISBN(col(fields, 'ISBN13')),
        myRating:          parseInt(ratingStr)   || 0,
        avgRating:         parseFloat(avgStr)    || 0,
        publisher:         col(fields, 'Publisher'),
        binding:           col(fields, 'Binding'),
        pageCount:         pageStr  ? parseInt(pageStr)  || null : null,
        yearPublished:     yearStr  ? parseInt(yearStr)  || null : null,
        originalYear:      origStr  ? parseInt(origStr)  || null : null,
        dateRead:          parseDate(col(fields, 'Date Read')),
        dateAdded:         parseDate(col(fields, 'Date Added')),
        shelf,
        reviewText:        col(fields, 'My Review'),
        isSpoiler:         spoilerStr === 'true' || spoilerStr === '1',
        readCount:         parseInt(rcStr) || 0,
      })
    } catch {
      // Skip malformed lines silently
    }
  }

  return rows
}
