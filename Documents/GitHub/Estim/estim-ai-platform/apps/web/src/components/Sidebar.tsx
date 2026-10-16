'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>Estim AI</div>
              <div style={{ fontSize: '0.65rem', color: '#475569', lineHeight: 1.2, letterSpacing: '0.04em' }}>Intelligence Platform</div>
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
      </div>

      {/* Divider + section label */}
      <div style={{ padding: '0 1rem 0.4rem', marginTop: '0.25rem' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
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
        padding: '1rem',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        marginTop: '1rem',
      }}>
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
          <span style={{ color: '#475569', marginLeft: 'auto' }}>Live</span>
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
          }}>IK</div>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1' }}>Ian Kibugi</div>
            <div style={{ fontSize: '0.65rem', color: '#475569' }}>AI/ML Engineer</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
