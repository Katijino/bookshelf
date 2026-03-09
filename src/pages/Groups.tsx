import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export default function Groups() {
  const user = useAuthStore(s => s.user)
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', is_private: false })

  const { data: groups, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data } = await supabase.from('groups').select('*, group_members(user_id, role)').eq('is_private', false).order('created_at', { ascending: false })
      return data ?? []
    },
  })

  const joinMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from('group_members').insert({ group_id: groupId, user_id: user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })

  const leaveMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: group, error } = await supabase.from('groups').insert({ ...form, creator_id: user!.id }).select('id').single()
      if (error) throw error
      await supabase.from('group_members').insert({ group_id: group.id, user_id: user!.id, role: 'admin' })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['groups'] }); setShowCreate(false); setForm({ name: '', description: '', is_private: false }) },
  })

  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.85rem', borderRadius: 8, border: '1px solid #B8A47C', background: '#EAE0CC', color: '#1A0A02', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#3a1f0d', fontWeight: 700, fontSize: '2rem', margin: 0 }}>Reading Groups</h1>
        {user && <button onClick={() => setShowCreate(v => !v)} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600, cursor: 'pointer' }}>+ Create Group</button>}
      </div>

      {showCreate && (
        <div style={{ background: '#CEBB96', border: '1px solid #B8A47C', borderRadius: 12, padding: '1.5rem', marginBottom: '2rem' }}>
          <h3 style={{ color: '#5c3317', marginBottom: '1rem' }}>New Group</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input placeholder="Group name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inputStyle} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#5c3317', fontSize: '0.9rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_private} onChange={e => setForm(f => ({ ...f, is_private: e.target.checked }))} />
              Private group
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => createMutation.mutate()} disabled={!form.name} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: '#8b5e3c', color: '#f5e6d3', fontWeight: 600, cursor: 'pointer' }}>Create</button>
              <button onClick={() => setShowCreate(false)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #c8a882', background: 'transparent', color: '#7a4e2d', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {(groups ?? []).map((g: any) => {
            const isMember = g.group_members?.some((m: any) => m.user_id === user?.id)
            const memberCount = g.group_members?.length ?? 0
            return (
              <div key={g.id} style={{ background: '#CEBB96', border: '1px solid #B8A47C', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ color: '#3a1f0d', margin: '0 0 0.25rem', fontSize: '1rem' }}>{g.name}</h3>
                  <p style={{ color: '#9e7a57', fontSize: '0.8rem', margin: 0 }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
                </div>
                {g.description && <p style={{ color: '#5c4030', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>{g.description}</p>}
                {user && (
                  <button
                    onClick={() => isMember ? leaveMutation.mutate(g.id) : joinMutation.mutate(g.id)}
                    style={{ marginTop: 'auto', padding: '0.4rem 1rem', borderRadius: 8, border: 'none', background: isMember ? '#B8A47C' : '#8b5e3c', color: isMember ? '#3A1A08' : '#f5e6d3', fontWeight: 600, cursor: 'pointer' }}>
                    {isMember ? 'Leave' : 'Join'}
                  </button>
                )}
              </div>
            )
          })}
          {groups?.length === 0 && <p style={{ color: '#9e7a57', fontStyle: 'italic', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No groups yet. Create one!</p>}
        </div>
      )}
    </div>
  )
}
