import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useProfile, useUpdateProfile } from '../hooks/useProfile'
import { useUIStore } from '../stores/uiStore'
import { supabase } from '../lib/supabase'

export default function Settings() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const addToast = useUIStore(s => s.addToast)

  const { data: profile } = useProfile(user?.id ?? '')
  const updateProfile = useUpdateProfile()

  const [form, setForm] = useState({ display_name: '', bio: '', location: '', website: '', avatar_url: '' })
  const [formInitialized, setFormInitialized] = useState(false)

  if (profile && !formInitialized) {
    setForm({
      display_name: profile.display_name ?? '',
      bio: profile.bio ?? '',
      location: profile.location ?? '',
      website: profile.website ?? '',
      avatar_url: profile.avatar_url ?? '',
    })
    setFormInitialized(true)
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <p style={{ color: '#5c3317', fontSize: '1.1rem' }}>Please log in to access settings.</p>
        <Link to="/login" style={{ padding: '0.6rem 1.5rem', borderRadius: 8, background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600, textDecoration: 'none' }}>Log In</Link>
      </div>
    )
  }

  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync(form)
      addToast('Profile updated!', 'success')
    } catch {
      addToast('Failed to update profile.', 'error')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8,
    border: '1px solid #B8A47C', background: '#EAE0CC', color: '#1A0A02',
    fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#5c3317', marginBottom: '0.35rem' }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <h1 style={{ color: '#3a1f0d', fontWeight: 700, fontSize: '2rem', marginBottom: '1.5rem' }}>Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {[
            { key: 'display_name', label: 'Display Name', placeholder: 'Your Name' },
            { key: 'avatar_url', label: 'Avatar URL', placeholder: 'https://...' },
            { key: 'location', label: 'Location', placeholder: 'City, Country' },
            { key: 'website', label: 'Website', placeholder: 'https://yoursite.com' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={inputStyle}
              />
            </div>
          ))}
          <div>
            <label style={labelStyle}>Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell people about yourself..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          <button onClick={handleSaveProfile} disabled={updateProfile.isPending} style={{
            alignSelf: 'flex-start', padding: '0.6rem 1.5rem', borderRadius: 8,
            border: 'none', background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600,
            cursor: 'pointer', fontSize: '0.95rem',
          }}>
            {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
          </button>

          <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e8d5c0' }}>
            <button onClick={handleLogout} style={{
              padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid #e8a090',
              background: 'transparent', color: '#c0392b', cursor: 'pointer', fontWeight: 500,
            }}>Log Out</button>
          </div>
      </div>

    </div>
  )
}
