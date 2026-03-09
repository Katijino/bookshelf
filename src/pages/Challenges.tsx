import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import ProgressBar from '../components/ProgressBar'

export default function Challenges() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', year: new Date().getFullYear(), goal: 12 })

  const { data: challenges, isLoading } = useQuery({
    queryKey: ['challenges'],
    queryFn: async () => {
      const { data } = await supabase.from('challenges').select('*, challenge_members(user_id, progress)').eq('is_public', true).order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase.from('challenge_members').insert({ challenge_id: challengeId, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenges'] }),
  })

  const leaveMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { error } = await supabase.from('challenge_members').delete().eq('challenge_id', challengeId).eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['challenges'] }),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('challenges').insert({ ...form, creator_id: user!.id, is_public: true })
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['challenges'] }); setShowCreate(false); setForm({ title: '', description: '', year: new Date().getFullYear(), goal: 12 }) },
  })

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid #B8A47C', background: '#EAE0CC', color: '#1A0A02', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#3a1f0d', fontWeight: 700, fontSize: '2rem', margin: 0 }}>Reading Challenges</h1>
        {user && <button onClick={() => setShowCreate(v => !v)} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600, cursor: 'pointer' }}>+ Create Challenge</button>}
      </div>

      {showCreate && (
        <div style={{ background: '#CEBB96', border: '1px solid #B8A47C', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ color: '#5c3317', marginBottom: '1rem' }}>New Challenge</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input placeholder="Challenge title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} />
            <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <input type="number" placeholder="Year" value={form.year} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} style={{ ...inputStyle, width: 120 }} />
              <input type="number" placeholder="Goal (# books)" value={form.goal} onChange={e => setForm(f => ({ ...f, goal: parseInt(e.target.value) }))} style={{ ...inputStyle, flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => createMutation.mutate()} disabled={!form.title} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600, cursor: 'pointer' }}>Create</button>
              <button onClick={() => setShowCreate(false)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #c8a882', background: 'transparent', color: '#7a4e2d', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(challenges ?? []).map((c: any) => {
            const myMembership = c.challenge_members?.find((m: any) => m.user_id === user?.id)
            const memberCount = c.challenge_members?.length ?? 0
            return (
              <div key={c.id} style={{ background: '#CEBB96', border: '1px solid #B8A47C', borderRadius: 12, padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#3a1f0d', margin: '0 0 0.25rem', fontSize: '1.1rem' }}>{c.title}</h3>
                    <p style={{ color: '#9e7a57', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>{c.year} · Read {c.goal} books · {memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                    {c.description && <p style={{ color: '#5c4030', fontSize: '0.875rem', margin: 0 }}>{c.description}</p>}
                  </div>
                  {user && (
                    <button
                      onClick={() => myMembership ? leaveMutation.mutate(c.id) : joinMutation.mutate(c.id)}
                      style={{ padding: '0.4rem 1rem', borderRadius: 8, border: 'none', background: myMembership ? '#B8A47C' : '#8b5e3c', color: myMembership ? '#3A1A08' : '#f5e6d3', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      {myMembership ? 'Leave' : 'Join'}
                    </button>
                  )}
                </div>
                {myMembership && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <ProgressBar current={myMembership.progress} total={c.goal} />
                  </div>
                )}
              </div>
            )
          })}
          {challenges?.length === 0 && <p style={{ color: '#9e7a57', fontStyle: 'italic', textAlign: 'center', padding: '3rem' }}>No challenges yet. Create one!</p>}
        </div>
      )}
    </div>
  )
}
