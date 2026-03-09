interface ProgressBarProps {
  current: number
  total: number
  label?: string
}

export default function ProgressBar({ current, total, label }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0

  return (
    <div style={{ width: '100%' }}>
      {label && <p style={{ margin: '0 0 4px', fontSize: 12, color: '#8B7355' }}>{label}</p>}
      <div style={{ background: '#EDE0C8', borderRadius: 999, height: 8, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#8B5E3C', borderRadius: 999, transition: 'width 0.3s ease' }} />
      </div>
      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8B7355' }}>
        Page {current} of {total} ({pct}%)
      </p>
    </div>
  )
}
