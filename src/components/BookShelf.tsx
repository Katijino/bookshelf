import BookCard from './BookCard'

interface BookShelfProps {
  title: string
  books: any[]
  isLoading?: boolean
  emptyMessage?: string
  size?: 'sm' | 'md' | 'lg'
}

function SkeletonCard({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const widths = { sm: 120, md: 150, lg: 180 }
  const heights = { sm: 180, md: 225, lg: 270 }
  return (
    <div style={{ width: widths[size], flexShrink: 0 }}>
      <div style={{
        width: widths[size], height: heights[size], borderRadius: 6,
        background: 'linear-gradient(90deg, #E8D8BC 25%, #D4C4A8 50%, #E8D8BC 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
      }} />
      <div style={{ height: 12, background: '#E8D8BC', borderRadius: 4, marginTop: 8 }} />
      <div style={{ height: 10, background: '#E8D8BC', borderRadius: 4, marginTop: 4, width: '70%' }} />
    </div>
  )
}

export default function BookShelf({ title, books, isLoading, emptyMessage = 'No books found.', size = 'md' }: BookShelfProps) {
  return (
    <section style={{ marginBottom: 44 }}>
      {title && (
        <h2 style={{
          fontSize: '1.2rem', color: '#2C1810', marginBottom: 14,
          fontFamily: 'Georgia, serif', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {title}
        </h2>
      )}

      {/* Shelf scroll area */}
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} size={size} />)
          : books.length === 0
            ? <p style={{ color: '#7A5C40', fontStyle: 'italic' }}>{emptyMessage}</p>
            : books.map(book => <BookCard key={book.id} book={book} size={size} />)
        }
      </div>

      {/* Decorative shelf ledge */}
      {!isLoading && books.length > 0 && <div className="shelf-ledge" />}
    </section>
  )
}
