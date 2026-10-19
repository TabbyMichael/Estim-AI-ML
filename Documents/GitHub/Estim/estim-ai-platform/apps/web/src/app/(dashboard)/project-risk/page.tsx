'use client'

export const dynamic = 'force-dynamic'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

type RiskData = {
  project_id: string
  overall_health: string
  risk_score: number
  predicted_delay_days?: number
  on_track_milestones: number
  total_milestones: number
  risks?: Array<{
    category: string
    severity: string
    description: string
  }>
}

export default function ProjectRiskPage() {
  const [projectId, setProjectId] = useState('PRJ-001')
  const { data, isLoading } = useQuery({
    queryKey: ['risk-health', projectId],
    queryFn: async () => (await axios.get(`${API}/project-risk/projects/${projectId}/health`)).data,
    enabled: !!projectId,
  })

  const getHealthBadge = (health: string) => {
    const map = {
      healthy: 'badge-green',
      at_risk: 'badge-amber',
      critical: 'badge-red',
    }
    return map[health as keyof typeof map] || 'badge-brand'
  }

  const getRiskColor = (score: number) => {
    if (score <= 30) return '#22c55e'
    if (score <= 60) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <>
    <div className="page-header">
      <div className="animate-fade-in">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Project Risk
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Risk assessment, delay predictions, and project health monitoring
        </p>
      </div>
    </div>

    <div className="page-body">
      {/* Project Search */}
      <div className="card animate-slide-up" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          Analyze Project Risk
        </h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Project ID (e.g., PRJ-001)"
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {data && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-slide-up stagger">
            <div className="stat-card" style={{ '--accent': getRiskColor(data.risk_score) } as React.CSSProperties}>
              <div className="stat-value">{data.risk_score}</div>
              <div className="stat-label">Risk Score</div>
            </div>
            <div className="stat-card" style={{ '--accent': '#6366f1' } as React.CSSProperties}>
              <div className="stat-value">
                {data.on_track_milestones}/{data.total_milestones}
              </div>
              <div className="stat-label">Milestones On Track</div>
            </div>
            <div className="stat-card" style={{ '--accent': '#f59e0b' } as React.CSSProperties}>
              <div className="stat-value">
                {data.predicted_delay_days ? `${data.predicted_delay_days}d` : '—'}
              </div>
              <div className="stat-label">Predicted Delay</div>
            </div>
            <div className="stat-card" style={{ '--accent': '#22c55e' } as React.CSSProperties}>
              <div className="stat-value" style={{ textTransform: 'capitalize' }}>
                {data.overall_health}
              </div>
              <div className="stat-label">Overall Health</div>
            </div>
          </div>

          {/* Risk Details */}
          <div className="card animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Risk Analysis
              </h3>
              <span className={`badge ${getHealthBadge(data.overall_health)}`}>
                {data.overall_health}
              </span>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Risk Score Progress
              </div>
              <div className="risk-bar">
                <div
                  className="risk-fill"
                  style={{
                    width: `${data.risk_score}%`,
                    background: getRiskColor(data.risk_score),
                  }}
                />
              </div>
            </div>

            {data.risks && data.risks.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Identified Risks
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {data.risks.map((risk: { category?: string; description?: string; severity?: string }, index: number) => (
                    <div key={index} className="alert-item alert-item-medium">
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                          {risk.category}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {risk.description}
                        </div>
                      </div>
                      <span className={`badge ${risk.severity === 'high' ? 'badge-red' : risk.severity === 'medium' ? 'badge-amber' : 'badge-green'}`}>
                        {risk.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!projectId && (
        <div className="card animate-slide-up" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Enter a Project ID
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Start by entering a project ID above to analyze its risk profile
          </p>
        </div>
      )}
    </div>
    </>
  )
}
