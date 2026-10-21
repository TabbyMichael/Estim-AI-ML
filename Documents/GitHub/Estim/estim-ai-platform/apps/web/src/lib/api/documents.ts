'use client'

/** Document intelligence: /documents, /upload, /search, /ask, /{id}/index. */

import { http, type PageParams, type Paginated } from './client'

export type DocumentStatus = 'uploaded' | 'processing' | 'indexed' | 'failed' | string

export type DocumentRecord = {
  id: string
  project_id: string
  filename: string
  storage_key: string
  content_type: string
  status: DocumentStatus
  created_by: string
  created_at: string
}

export type DocumentList = Paginated<DocumentRecord, 'documents'>

export type DocumentHit = {
  chunk_id: string
  document_id: string
  score: number
  text?: string
}

export type AskResponse = {
  query: string
  answer: string
  sources: DocumentHit[]
}

export const documentsApi = {
  list: (params: PageParams & { project_id?: string }) =>
    http.get<DocumentList>('/documents', { params }),

  upload: (payload: {
    project_id: string
    filename: string
    storage_key: string
    content_type?: string
    created_by?: string
  }) => http.post<DocumentRecord>('/documents/upload', payload),

  index: (documentId: string, text: string) =>
    http.post<Record<string, unknown>>(`/documents/${documentId}/index`, { text }),

  search: (payload: { query: string; limit?: number }) =>
    http.post<{ results: DocumentHit[] }>('/documents/search', payload),

  ask: (payload: { query: string; limit?: number }) =>
    http.post<AskResponse>('/documents/ask', payload),
}
