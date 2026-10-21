'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/lib/theme-provider'
import { useAuth } from '@/lib/auth-context'
import NotificationCenter from '@/components/NotificationCenter'

const modules = [
  {
    href: '/procurement',
    label: 'Procurement AI',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
    color: '#f97316',
    badge: '12',
  },
  {
    href: '/cost-forecasting',
    label: 'Cost Forecasting',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
    color: '#6366f1',
    badge: '4',
  },
  {
    href: '/inventory',
    label: 'Inventory AI',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    color: '#22c55e',
    badge: '8',
  },
  {
    href: '/maintenance',
    label: 'Predictive Maint.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    color: '#f59e0b',
    badge: '3',
  },
  {
    href: '/project-risk',
    label: 'Project Risk',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    color: '#ef4444',
    badge: '6',
  },
  {
    href: '/visual-inspection',
    label: 'Visual Inspection',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><circle cx="11" cy="11" r="3"/>
      </svg>
    ),
    color: '#a855f7',
    badge: null,
  },
  {
    href: '/documents',
    label: 'Document AI',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    color: '#06b6d4',
    badge: null,
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    color: '#6366f1',
    badge: null,
  },
  {
    href: '/audit',
    label: 'Audit Log',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
      </svg>
    ),
    color: '#ef4444',
    badge: null,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '1.5rem 1rem 1rem' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
              flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>Estim AI</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.2, letterSpacing: '0.04em' }}>Intelligence Platform</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Overview */}
      <div style={{ padding: '0 0.75rem 0.5rem' }}>
        <Link href="/" className={`nav-item${pathname === '/' ? ' active' : ''}`}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </span>
          Overview
        </Link>
        <Link href="/profile" className={`nav-item${pathname === '/profile' ? ' active' : ''}`}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          Profile
        </Link>
        <Link href="/notifications" className={`nav-item${pathname === '/notifications' ? ' active' : ''}`}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </span>
          Notifications
        </Link>
        {user?.roles?.some((r) => r === 'admin' || r === 'platform_admin') && (
<>
          <Link href="/admin/users" className={`nav-item${pathname.startsWith('/admin') ? ' active' : ''}`}>
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </span>
            Admin · Users
          </Link>

        <Link href="/geospatial-map" className={`nav-item${pathname === '/geospatial-map' ? ' active' : ''}`}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s7-4.5 7-11a7 7 0 0 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>
            </svg>
          </span>
          Locations
        </Link>
        <Link href="/gantt" className={`nav-item${pathname === '/gantt' ? ' active' : ''}`}>
          <span className="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/><rect x="3" y="7" width="4" height="4"/><rect x="8" y="3" width="4" height="4"/><rect x="13" y="7" width="4" height="4"/><rect x="18" y="12" width="4" height="4"/>
            </svg>
          </span>
          Gantt
        </Link>
</>
        )}
      </div>

      {/* Divider + section label */}
      <div style={{ padding: '0 1rem 0.4rem', marginTop: '0.25rem' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          AI Modules
        </div>
      </div>

      {/* Module links */}
      <nav style={{ padding: '0 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {modules.map((m) => {
          const active = pathname.startsWith(m.href)
          return (
            <Link key={m.href} href={m.href} className={`nav-item${active ? ' active' : ''}`}
              style={active ? { '--accent': m.color } as React.CSSProperties : {}}>
              <span className="nav-icon" style={{ color: active ? m.color : undefined }}>
                {m.icon}
              </span>
              <span style={{ flex: 1 }}>{m.label}</span>
              {m.badge && (
                <span style={{
                  background: active ? `${m.color}22` : 'rgba(255,255,255,0.06)',
                  color: active ? m.color : '#475569',
                  fontSize: '0.65rem', fontWeight: 700,
                  padding: '0.1rem 0.45rem', borderRadius: 999,
                  border: `1px solid ${active ? `${m.color}44` : 'transparent'}`,
                }}>{m.badge}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '0.75rem 0.75rem 1rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        marginTop: 'auto',
      }}>
        {/* Theme toggle + notification bell */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'stretch' }}>
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.55rem 0.85rem',
            borderRadius: 10,
            background: theme === 'dark'
              ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))'
              : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.08))',
            border: theme === 'dark'
              ? '1px solid rgba(99,102,241,0.25)'
              : '1px solid rgba(245,158,11,0.25)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = theme === 'dark'
              ? '0 4px 16px rgba(99,102,241,0.2)'
              : '0 4px 16px rgba(245,158,11,0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
          title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: theme === 'dark'
                ? 'rgba(99,102,241,0.2)'
                : 'rgba(245,158,11,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {theme === 'dark' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 600,
                color: theme === 'dark' ? '#818cf8' : '#f59e0b',
                lineHeight: 1.2,
              }}>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </div>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
              </div>
            </div>
          </div>
          {/* Toggle pill */}
          <div style={{
            width: 38, height: 20, borderRadius: 999,
            background: theme === 'dark' ? '#6366f1' : '#e2e8f0',
            position: 'relative',
            flexShrink: 0,
            transition: 'background 0.3s ease',
            border: theme === 'dark' ? 'none' : '1px solid #cbd5e1',
          }}>
            <div style={{
              position: 'absolute',
              top: 2, left: theme === 'dark' ? 20 : 2,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              transition: 'left 0.3s ease',
            }}/>
          </div>
        </button>
        <NotificationCenter />
        </div>

        {/* Odoo sync status */}
        <div style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 8, padding: '0.6rem 0.75rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.72rem',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 6px #22c55e',
            flexShrink: 0,
            animation: 'pulseGlow 2s ease-in-out infinite',
          }}/>
          <span style={{ color: '#4ade80', fontWeight: 600 }}>Odoo ERP</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>Live</span>
        </div>
        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          marginTop: '0.75rem',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.7rem', fontWeight: 700, color: '#fff',
            flexShrink: 0,
          }}>
            {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {user?.full_name || 'User'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {user?.email || ''}
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '0.4rem',
              borderRadius: 6,
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
            }}
            title="Logout"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
