import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'

interface SignInFields {
  email: string
  password: string
}

interface SignUpFields extends SignInFields {
  username: string
}

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [serverError, setServerError] = useState('')
  const [signUpSuccess, setSignUpSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignUpFields>()

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode)
    setServerError('')
    setSignUpSuccess(false)
    reset()
  }

  const onSubmit = async (data: SignUpFields) => {
    setServerError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
        navigate('/')
      } else {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { username: data.username },
          },
        })
        if (error) throw error
        setSignUpSuccess(true)
      }
    } catch (err: any) {
      setServerError(err.message ?? 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #CEBB96 0%, #B8A47C 100%)',
        padding: '2rem',
      }}
    >
      <div
        style={{
          background: '#DCC9A8',
          borderRadius: '16px',
          boxShadow: '0 8px 40px rgba(92,51,23,0.25)',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>📚</div>
          <h1
            style={{
              fontSize: '1.8rem',
              fontWeight: 700,
              color: '#3a1f0d',
              marginBottom: '0.25rem',
            }}
          >
            Bookshelf
          </h1>
          <p style={{ color: '#9e7a57', fontSize: '0.9rem' }}>Your personal reading companion</p>
        </div>

        <div
          style={{
            display: 'flex',
            background: '#B8A47C',
            borderRadius: '10px',
            padding: '3px',
            marginBottom: '1.75rem',
          }}
        >
          {(['signin', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '8px',
                border: 'none',
                background: mode === m ? '#EAE0CC' : 'transparent',
                color: mode === m ? '#3A1A08' : '#7A5030',
                fontWeight: mode === m ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.9rem',
                boxShadow: mode === m ? '0 1px 4px rgba(92,51,23,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {signUpSuccess ? (
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '10px',
              padding: '1.25rem',
              textAlign: 'center',
              color: '#166534',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✉️</div>
            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Check your email!</p>
            <p style={{ fontSize: '0.875rem' }}>
              We sent a confirmation link to finish creating your account.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {mode === 'signup' && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Username</label>
                <input
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'At least 3 characters' },
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: 'Letters, numbers, and underscores only',
                    },
                  })}
                  placeholder="your_username"
                  style={inputStyle}
                />
                {errors.username && <p style={errorStyle}>{errors.username.message}</p>}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Email</label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address' },
                })}
                type="email"
                placeholder="you@example.com"
                style={inputStyle}
              />
              {errors.email && <p style={errorStyle}>{errors.email.message}</p>}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Password</label>
              <input
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'At least 6 characters' },
                })}
                type="password"
                placeholder="••••••••"
                style={inputStyle}
              />
              {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
            </div>

            {serverError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}
              >
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '10px',
                border: 'none',
                background: loading ? '#c8a882' : '#8b5e3c',
                color: '#f5e6d3',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link to="/" style={{ color: '#9e7a57', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#5c3317',
  marginBottom: '0.35rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: '8px',
  border: '1px solid #B8A47C',
  background: '#EAE0CC',
  color: '#1A0A02',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
}

const errorStyle: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '0.8rem',
  marginTop: '0.25rem',
}
