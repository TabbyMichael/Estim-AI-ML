'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-provider'

export default function ProfilePage() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [isEditing, setIsEditing] = useState(false)
  const [fullName, setFullName] = useState(user?.full_name || '')

  const handleSave = async () => {
    // TODO: Implement profile update API call
    setIsEditing(false)
  }

  return (
    <div className="page-header">
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Profile Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Manage your account settings and preferences
        </p>
      </div>
    </div>

    <div className="page-body">
      <div className="card animate-slide-up" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
          }}>
            {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {user?.full_name || 'User'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {user?.email || ''}
            </p>
            <div style={{ marginTop: '0.5rem' }}>
              {user?.roles?.map(role => (
                <span key={role} className="badge badge-brand" style={{ marginRight: '0.5rem' }}>
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Account Information
          </h3>
          
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              ) : (
                <div style={{ padding: '0.6rem 0.85rem', color: 'var(--text-primary)' }}>
                  {user?.full_name || '—'}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Email
              </label>
              <div style={{ padding: '0.6rem 0.85rem', color: 'var(--text-primary)' }}>
                {user?.email || '—'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Account Status
              </label>
              <div>
                <span className={`badge ${user?.is_active ? 'badge-green' : 'badge-red'}`}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Member Since
              </label>
              <div style={{ padding: '0.6rem 0.85rem', color: 'var(--text-primary)' }}>
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Last Login
              </label>
              <div style={{ padding: '0.6rem 0.85rem', color: 'var(--text-primary)' }}>
                {user?.last_login_at ? new Date(user.last_login_at).toLocaleString() : '—'}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            {isEditing ? (
              <>
                <button onClick={handleSave} className="btn btn-primary">
                  Save Changes
                </button>
                <button onClick={() => setIsEditing(false)} className="btn btn-ghost">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                Edit Profile
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Preferences
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0' }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Theme
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </div>
            </div>
            <button onClick={toggleTheme} className="btn btn-ghost">
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            Danger Zone
          </h3>
          
          <button
            onClick={logout}
            className="btn btn-ghost"
            style={{
              borderColor: 'rgba(239,68,68,0.3)',
              color: '#ef4444',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
