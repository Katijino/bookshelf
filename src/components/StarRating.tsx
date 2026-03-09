import { useState } from 'react'

interface StarRatingProps {
  rating: number
  onChange?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 16, md: 22, lg: 30 }

export default function StarRating({ rating, onChange, size = 'md' }: StarRatingProps) {
  const [hover, setHover] = useState(0)
  const px = sizes[size]
  const active = hover || rating

  function getValue(starIndex: number, half: boolean) {
    return half ? starIndex - 0.5 : starIndex
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = active >= star
        const half = !filled && active >= star - 0.5

        return (
          <span
            key={star}
            style={{
              position: 'relative', display: 'inline-block',
              width: px, height: px,
              cursor: onChange ? 'pointer' : 'default',
              flexShrink: 0,
            }}
            onMouseLeave={() => onChange && setHover(0)}
          >
            {/* Empty star — absolutely positioned so it doesn't shift the filled overlay */}
            <span style={{
              position: 'absolute', top: 0, left: 0,
              fontSize: px, lineHeight: 1, color: '#A89070',
              userSelect: 'none',
            }}>★</span>
            {/* Filled overlay clipped to the appropriate width */}
            <span style={{
              position: 'absolute', top: 0, left: 0, overflow: 'hidden',
              width: filled ? '100%' : half ? '50%' : '0%',
              fontSize: px, lineHeight: 1, color: '#C8860A',
              pointerEvents: 'none', userSelect: 'none',
            }}>★</span>
            {/* Click / hover hit areas */}
            {onChange && (
              <>
                <span
                  style={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '100%', zIndex: 1 }}
                  onMouseEnter={() => setHover(getValue(star, true))}
                  onClick={() => onChange(getValue(star, true))}
                />
                <span
                  style={{ position: 'absolute', top: 0, right: 0, width: '50%', height: '100%', zIndex: 1 }}
                  onMouseEnter={() => setHover(getValue(star, false))}
                  onClick={() => onChange(getValue(star, false))}
                />
              </>
            )}
          </span>
        )
      })}
      {!onChange && rating > 0 && (
        <span style={{ fontSize: px * 0.75, color: '#8B7355', marginLeft: 4 }}>
          {rating.toFixed(1)}
        </span>
      )}
    </span>
  )
}
