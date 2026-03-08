export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export function formatRating(rating: number | null): string {
  if (rating == null) return 'No rating'
  return rating.toFixed(1)
}

export function shelfLabel(shelf: string): string {
  const labels: Record<string, string> = {
    want_to_read: 'Want to Read',
    reading:      'Currently Reading',
    completed:    'Read',
    dropped:      'Dropped',
  }
  return labels[shelf] ?? shelf
}
