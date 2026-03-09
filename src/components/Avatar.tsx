const COLORS = ['#8B5E3C', '#C4924F', '#D4A96A', '#6B4423', '#A0784A']

function colorFromName(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31
  return COLORS[Math.abs(hash) % COLORS.length]
}

interface AvatarProps {
  src?: string | null
  name?: string
  size?: number
}

export default function Avatar({ src, name = '', size = 40 }: AvatarProps) {
  const style: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%',
    objectFit: 'cover', flexShrink: 0, display: 'block',
  }

  if (src) return <img src={src} alt={name} style={style} />

  return (
    <div style={{
      ...style,
      background: colorFromName(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#FFF8EE', fontWeight: 700, fontSize: size * 0.4, userSelect: 'none',
    }}>
      {name.charAt(0).toUpperCase() || '?'}
    </div>
  )
}
