import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useAddToShelf, useRemoveFromShelf } from '../hooks/useLibrary'

type ShelfType = 'want_to_read' | 'reading' | 'completed' | 'dropped'

const SHELF_LABELS: Record<ShelfType, string> = {
  want_to_read: 'Want to Read',
  reading: 'Reading',
  completed: 'Read',
  dropped: 'Dropped',
}

const SHELVES = Object.keys(SHELF_LABELS) as ShelfType[]

interface ShelfSelectorProps {
  bookId: string
  currentShelf?: ShelfType | null
  onShelfChange?: (shelf: ShelfType | null) => void
}

export default function ShelfSelector({ bookId, currentShelf, onShelfChange }: ShelfSelectorProps) {
  const user = useAuthStore(s => s.user)
  const [open, setOpen] = useState(false)
  const addToShelf = useAddToShelf()
  const removeFromShelf = useRemoveFromShelf()

  if (!user) {
    return (
      <button disabled style={{ padding: '8px 16px', background: '#EDE0C8', border: '1px solid #D4C4A8', borderRadius: 6, color: '#8B7355', cursor: 'not-allowed' }}>
        Sign in to save
      </button>
    )
  }

  const handleSelect = (shelf: ShelfType) => {
    addToShelf.mutate({ bookId, shelf, userId: user.id })
    onShelfChange?.(shelf)
    setOpen(false)
  }

  const handleRemove = () => {
    removeFromShelf.mutate({ userId: user.id, bookId })
    onShelfChange?.(null)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '8px 16px', background: currentShelf ? '#8B5E3C' : '#EDE0C8',
          color: currentShelf ? '#FFF8EE' : '#2C1810',
          border: '1px solid #D4C4A8', borderRadius: 6, cursor: 'pointer',
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        {currentShelf ? SHELF_LABELS[currentShelf] : 'Add to Shelf'} ▾
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '110%', left: 0, zIndex: 100,
            background: '#DCC9A8', border: '1px solid #B8A47C', borderRadius: 8,
            boxShadow: '0 8px 24px rgba(44,24,16,0.16)', minWidth: 180, overflow: 'hidden',
          }}>
            {SHELVES.map(shelf => (
              <button
                key={shelf}
                onClick={() => handleSelect(shelf)}
                style={{
                  display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                  background: currentShelf === shelf ? '#EDE0C8' : 'transparent',
                  border: 'none', cursor: 'pointer', color: '#2C1810', fontSize: 14,
                }}
                onMouseEnter={e => { if (currentShelf !== shelf) (e.currentTarget as HTMLButtonElement).style.background = '#F5ECD7' }}
                onMouseLeave={e => { if (currentShelf !== shelf) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                {currentShelf === shelf ? '✓ ' : ''}{SHELF_LABELS[shelf]}
              </button>
            ))}
            {currentShelf && (
              <button
                onClick={handleRemove}
                style={{
                  display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left',
                  background: 'transparent', border: 'none', borderTop: '1px solid #D4C4A8',
                  cursor: 'pointer', color: '#C0392B', fontSize: 14,
                }}
              >
                Remove from shelf
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
