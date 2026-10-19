'use client'

import Link from 'next/link'

export default function Home() {
  const modules = [
    {
      href: '/procurement',
      title: 'Procurement AI',
      description: 'Fraud detection and price anomaly analysis',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
        </svg>
      ),
      color: '#f97316',
      stats: { label: 'Alerts', value: '12' },
    },
    {
      href: '/cost-forecasting',
      title: 'Cost Forecasting',
      description: 'Budget overrun prediction and optimization',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      ),
      color: '#6366f1',
      stats: { label: 'Forecasts', value: '4' },
    },
    {
      href: '/inventory',
      title: 'Inventory AI',
      description: 'Demand forecasting and stockout prevention',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
      ),
      color: '#22c55e',
      stats: { label: 'Snapshots', value: '8' },
    },
    {
      href: '/maintenance',
      title: 'Predictive Maintenance',
      description: 'Equipment failure prediction and health monitoring',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
        </svg>
      ),
      color: '#f59e0b',
      stats: { label: 'Equipment', value: '3' },
    },
    {
      href: '/project-risk',
      title: 'Project Risk',
      description: 'Risk assessment and mitigation strategies',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 2 17 12 22 22 17 22 7 12 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
      color: '#ef4444',
      stats: { label: 'Risks', value: '6' },
    },
    {
      href: '/visual-inspection',
      title: 'Visual Inspection',
      description: 'AI-powered image analysis and defect detection',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><circle cx="11" cy="11" r="3"/>
        </svg>
      ),
      color: '#a855f7',
      stats: null,
    },
    {
      href: '/documents',
      title: 'Document AI',
      description: 'Intelligent document processing and extraction',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
      color: '#06b6d4',
      stats: null,
    },
    {
      href: '/reports',
      title: 'Reports',
      description: 'Comprehensive analytics and reporting',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
      color: '#6366f1',
      stats: null,
    },
    {
      href: '/audit',
      title: 'Audit Log',
      description: 'System activity tracking and compliance',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
        </svg>
      ),
      color: '#ef4444',
      stats: null,
    },
  ]

  return (
    <>
    <div className="page-header">
      <div className="animate-fade-in">
        <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Welcome back, Ian
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '0.25rem' }}>
          Here's what's happening with your construction projects today.
        </p>
      </div>
    </div>

    <div className="page-body">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up stagger">
        <div className="stat-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
          <div className="stat-value">8</div>
          <div className="stat-label">Active Projects</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
          <div className="stat-value">94%</div>
          <div className="stat-label">On Track</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#f59e0b' } as React.CSSProperties}>
          <div className="stat-value">3</div>
          <div className="stat-label">At Risk</div>
        </div>
        <div className="stat-card" style={{ '--accent': '#ef4444' } as React.CSSProperties}>
          <div className="stat-value">12</div>
          <div className="stat-label">Alerts</div>
        </div>
      </div>

      {/* AI Modules Grid */}
      <div className="mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>AI Modules</h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>9 modules available</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {modules.map((module, index) => (
          <Link
            key={module.href}
            href={module.href}
            className="card"
            style={{
              textDecoration: 'none',
              display: 'block',
              animationDelay: `${0.15 + index * 0.05}s`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${module.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={module.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  {module.icon.props.children}
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {module.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {module.description}
                </p>
              </div>
            </div>
            {module.stats && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge" style={{
                  background: `${module.color}15`,
                  color: module.color,
                  border: `1px solid ${module.color}30`,
                }}>
                  {module.stats.value}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{module.stats.label}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
    </>
  )
}
