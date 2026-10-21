'use client'

/**
 * Realtime WebSocket context (Roadmap 1.2).
 *
 * - Connects to /ws?token=<access_token> with the current JWT
 * - Reconnects with exponential backoff on disconnect
 * - Exposes connection state, subscribe/unsubscribe and event listeners
 * - Handles ping/pong heartbeat so dead sockets are detected quickly
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const WS_URL = API.replace(/^http/, 'ws')

export type ConnectionState = 'connecting' | 'connected' | 'disconnected'

type RealtimeEvent = { event: string; data: Record<string, unknown> }

type RealtimeContextType = {
  state: ConnectionState
  lastEvent: RealtimeEvent | null
  subscribe: (channel: string) => void
  unsubscribe: (channel: string) => void
  on: (event: string, handler: (data: Record<string, unknown>) => void) => () => void
  send: (payload: Record<string, unknown>) => void
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>('disconnected')
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef<Map<string, Set<(data: Record<string, unknown>) => void>>>(
    new Map(),
  )
  const channelsRef = useRef<Set<string>>(new Set())
  const retryRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pongRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dispatch = useCallback((event: string, data: Record<string, unknown>) => {
    setLastEvent({ event, data })
    handlersRef.current.get(event)?.forEach((h) => {
      try {
        h(data)
      } catch {
        /* isolate handler errors */
      }
    })
  }, [])

  const connect = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    if (!token) return
    setState('connecting')
    const ws = new WebSocket(`${WS_URL}/ws?token=${encodeURIComponent(token)}`)
    wsRef.current = ws

    ws.onopen = () => {
      retryRef.current = 0
      setState('connected')
      // Re-join channels after reconnect
      channelsRef.current.forEach((channel) =>
        ws.send(JSON.stringify({ type: 'subscribe', channel })),
      )
    }
    ws.onmessage = (msg) => {
      try {
        const payload = JSON.parse(msg.data)
        if (payload.type === 'event' && payload.event) {
          dispatch(payload.event, payload.data ?? {})
        } else if (payload.type === 'pong' || payload.type === 'connected') {
          if (pongRef.current) clearTimeout(pongRef.current)
          pongRef.current = setTimeout(() => ws.close(4000, 'heartbeat timeout'), 75_000)
        }
      } catch {
        /* ignore malformed frames */
      }
    }
    ws.onclose = (e) => {
      wsRef.current = null
      if (e.code === 4401) {
        setState('disconnected')
        return // auth failure: do not retry with a bad token
      }
      setState('disconnected')
      const delay = Math.min(30_000, 1000 * 2 ** retryRef.current)
      retryRef.current += 1
      timerRef.current = setTimeout(connect, delay)
    }
    ws.onerror = () => ws.close()
  }, [dispatch])

  useEffect(() => {
    connect()
    // Heartbeat ping every 30s
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30_000)
    return () => {
      clearInterval(ping)
      if (timerRef.current) clearTimeout(timerRef.current)
      if (pongRef.current) clearTimeout(pongRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const subscribe = useCallback((channel: string) => {
    channelsRef.current.add(channel)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }))
    }
  }, [])

  const unsubscribe = useCallback((channel: string) => {
    channelsRef.current.delete(channel)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }))
    }
  }, [])

  const on = useCallback(
    (event: string, handler: (data: Record<string, unknown>) => void) => {
      if (!handlersRef.current.has(event)) handlersRef.current.set(event, new Set())
      handlersRef.current.get(event)!.add(handler)
      return () => {
        handlersRef.current.get(event)?.delete(handler)
      }
    },
    [],
  )

  const send = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  return (
    <RealtimeContext.Provider
      value={{ state, lastEvent, subscribe, unsubscribe, on, send }}
    >
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext)
  if (!ctx) throw new Error('useRealtime must be used within a RealtimeProvider')
  return ctx
}

/** Convenience hook: run a handler whenever `event` arrives. */
export function useRealtimeEvent(
  event: string,
  handler: (data: Record<string, unknown>) => void,
) {
  const { on } = useRealtime()
  useEffect(() => on(event, handler), [on, event, handler])
}