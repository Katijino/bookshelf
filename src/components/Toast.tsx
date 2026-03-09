import { useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'

const borderColors = { success: '#27AE60', error: '#C0392B', info: '#8B5E3C' }

export default function Toast() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: { id: string; message: string; type: 'success' | 'error' | 'info' }, onRemove: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 4000)
    return () => clearTimeout(t)
  }, [toast.id, onRemove])

  return (
    <div style={{
      background: '#DCC9A8', borderRadius: 8, padding: '12px 16px',
      borderLeft: `4px solid ${borderColors[toast.type]}`,
      boxShadow: '0 4px 12px rgba(44,24,16,0.15)', maxWidth: 320,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      animation: 'slideIn 0.2s ease',
    }}>
      <span style={{ fontSize: 14, color: '#2C1810' }}>{toast.message}</span>
      <button onClick={() => onRemove(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B7355', fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  )
}
