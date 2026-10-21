'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { GanttChart, Task } from '@/components/gantt-chart'

const INITIAL_TASKS: Task[] = [
  { id: '1', name: 'Site survey', owner: 'Alice Chen', start: 0, duration: 3, progress: 100, status: 'done' },
  { id: '2', name: 'Design phase', owner: 'Bob Smith', start: 2, duration: 4, progress: 60, status: 'in-progress' },
  { id: '3', name: 'Development', owner: 'Carol Wu', start: 5, duration: 6, progress: 30, status: 'in-progress' },
  { id: '4', name: 'Testing', owner: 'Dan Patel', start: 9, duration: 4, progress: 0, status: 'pending' },
  { id: '5', name: 'Deployment', owner: 'Eve Johnson', start: 13, duration: 2, progress: 0, status: 'pending' },
  { id: '6', name: 'Post-launch', owner: 'Frank Miller', start: 15, duration: 3, progress: 0, status: 'pending' },
]

export default function GanttPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS)

  const updateProgress = (id: string, v: number) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, progress: Math.min(100, Math.max(0, v)) } : t)))
  }

  return (
    <>
      <div className="page-header">
        <div className="animate-fade-in">
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Gantt Charts</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Task scheduling, tracking progress, and critical-path overview.
          </p>
        </div>
      </div>

      <div className="page-body">
        <div className="card animate-slide-up" style={{ padding: '0' }}>
          <GanttChart tasks={tasks} onUpdateProgress={updateProgress} height={380} />
        </div>
      </div>
    </>
  )
}