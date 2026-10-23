'use client'

import { useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  AlertTriangle,
  Clock,
  Database,
  FileText,
  Search,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'

import { Badge, StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardToolbar } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { InputWithIcon } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/auth-context'
import { useDemoMutation } from '@/lib/hooks/use-demo-mutation'
import { useDemoQuery } from '@/lib/hooks/use-demo-query'
import { useToast } from '@/lib/hooks/use-toast'
import { queryKeys } from '@/lib/query-keys'
import {
  documentsApi,
  type AskResponse,
  type DocumentList,
  type DocumentRecord,
} from '@/lib/api/documents'
import {
  DEMO_ASK_RESPONSE,
  DEMO_DOCUMENT_LIST,
} from '@/lib/demo/documents'
import { DEMO_PROJECTS, demoProject } from '@/lib/demo/projects'
import { cn, formatDate, formatNumber, formatRelative } from '@/lib/utils'

const DOCUMENT_KEY = queryKeys.documents.list({ scope: 'page' })

const indexSchema = z.object({
  text: z
    .string()
    .trim()
    .min(40, 'Paste at least 40 characters so the indexer has something to embed')
    .max(200_000, 'That document is too large for the browser indexer'),
})

type IndexValues = z.infer<typeof indexSchema>
type UploadVars = { project_id: string; file: File }

function fileTypeLabel(contentType: string, filename: string): string {
  const extension = filename.split('.').pop()
  if (extension && extension.length <= 5) return extension.toUpperCase()
  if (contentType.includes('pdf')) return 'PDF'
  if (contentType.includes('sheet')) return 'XLSX'
  if (contentType.includes('word')) return 'DOCX'
  return 'FILE'
}

export default function DocumentsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { success, error: toastError } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'indexed' | 'processing' | 'uploaded' | 'failed'>('all')
  const [projectId, setProjectId] = useState(DEMO_PROJECTS[0]?.id ?? 'prj-1001')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [question, setQuestion] = useState('')
  const [askError, setAskError] = useState<string | null>(null)
  const [conversation, setConversation] = useState<AskResponse[]>([])
  const [indexTarget, setIndexTarget] = useState<DocumentRecord | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const documentQuery = useDemoQuery<DocumentList>({
    queryKey: DOCUMENT_KEY,
    queryFn: () => documentsApi.list({ limit: 100 }),
    demo: DEMO_DOCUMENT_LIST,
  })

  const documents = useMemo(() => documentQuery.data?.documents ?? [], [documentQuery.data])
  const isDemo = documentQuery.isDemo

  const stats = useMemo(() => {
    const indexed = documents.filter((document) => document.status === 'indexed').length
    const processing = documents.filter((document) => document.status === 'processing').length
    const failed = documents.filter((document) => document.status === 'failed').length
    return { total: documents.length, indexed, processing, failed }
  }, [documents])

  const documentNames = useMemo(
    () => new Map(documents.map((document) => [document.id, document.filename])),
    [documents],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return documents.filter((document) => {
      if (statusFilter !== 'all' && document.status !== statusFilter) return false
      if (!term) return true
      return [document.filename, document.project_id, document.storage_key].some((value) =>
        value.toLowerCase().includes(term),
      )
    })
  }, [documents, statusFilter, search])

  const indexForm = useForm<IndexValues>({
    resolver: zodResolver(indexSchema),
    defaultValues: { text: '' },
  })

  const uploadMutation = useDemoMutation<DocumentRecord, UploadVars>({
    mutationFn: ({ project_id, file }) =>
      documentsApi.upload({
        project_id,
        filename: file.name,
        storage_key: `projects/${project_id}/uploads/${file.name}`,
        content_type: file.type || undefined,
        created_by: user?.id,
      }),
    demo: ({ project_id, file }, client) => {
      const created: DocumentRecord = {
        id: `doc-demo-${Date.now()}`,
        project_id,
        filename: file.name,
        storage_key: `projects/${project_id}/uploads/${file.name}`,
        content_type: file.type || 'application/octet-stream',
        status: 'uploaded',
        created_by: user?.id ?? 'usr-admin',
        created_at: new Date().toISOString(),
      }
      client.setQueryData<DocumentList>(DOCUMENT_KEY, (current) =>
        current
          ? { ...current, documents: [created, ...current.documents], total: current.total + 1 }
          : { documents: [created], total: 1, skip: 0, limit: 100 },
      )
      return created
    },
    onSuccess: (document) => {
      success('Document uploaded', `${document.filename} is queued for indexing.`)
      setPendingFile(null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all() })
    },
    onError: (mutationError) => toastError('Upload failed', mutationError.message),
  })

  const indexMutation = useDemoMutation<Record<string, unknown>, IndexValues>({
    mutationFn: (values) => documentsApi.index(indexTarget?.id ?? '', values.text),
    demo: (values, client) => {
      if (indexTarget) {
        client.setQueryData<DocumentList>(DOCUMENT_KEY, (current) =>
          current
            ? {
                ...current,
                documents: current.documents.map((document) =>
                  document.id === indexTarget.id
                    ? { ...document, status: 'indexed' }
                    : document,
                ),
              }
            : current,
        )
      }
      return { document_id: indexTarget?.id ?? '', indexed: true, characters: values.text.length }
    },
    onSuccess: (result) => {
      success(
        'Document indexed',
        `${indexTarget?.filename ?? 'Document'} was indexed (${formatNumber(
          Number(result.characters ?? 0),
        )} characters).`,
      )
      setIndexTarget(null)
      indexForm.reset()
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents.all() })
    },
    onError: (mutationError) => toastError('Indexing failed', mutationError.message),
  })

  const askMutation = useDemoMutation<AskResponse, { query: string }>({
    mutationFn: (values) => documentsApi.ask({ query: values.query, limit: 5 }),
    demo: (values) => ({ ...DEMO_ASK_RESPONSE, query: values.query }),
    onSuccess: (response) => {
      setConversation((current) => [...current, response])
      setAskError(null)
      setQuestion('')
    },
    onError: (mutationError) => {
      setAskError(mutationError.message)
      toastError('Could not answer', mutationError.message)
    },
  })

  const pickFile = (file: File | null) => {
    if (!file) return
    setPendingFile(file)
  }

  const openIndex = (document: DocumentRecord) => {
    indexForm.reset({ text: '' })
    setIndexTarget(document)
  }

  const ask = () => {
    const query = question.trim()
    if (query.length < 4) {
      setAskError('Ask a question with at least 4 characters.')
      return
    }
    askMutation.mutate({ query })
  }

  const columns: Column<DocumentRecord>[] = [
    {
      id: 'filename',
      header: 'Document',
      cell: (document) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-foreground">{document.filename}</p>
            <p className="truncate font-mono text-2xs text-muted-foreground">{document.storage_key}</p>
          </div>
        </div>
      ),
      sortValue: (document) => document.filename,
    },
    {
      id: 'type',
      header: 'Type',
      hideOnMobile: true,
      cell: (document) => (
        <Badge tone="neutral">{fileTypeLabel(document.content_type, document.filename)}</Badge>
      ),
      sortValue: (document) => fileTypeLabel(document.content_type, document.filename),
    },
    {
      id: 'project',
      header: 'Project',
      hideOnMobile: true,
      cell: (document) => (
        <span className="text-2xs text-muted-foreground">
          {demoProject(document.project_id).code}
        </span>
      ),
      sortValue: (document) => document.project_id,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (document) => <StatusBadge status={document.status} />,
      sortValue: (document) => document.status,
    },
    {
      id: 'created',
      header: 'Added',
      hideOnMobile: true,
      cell: (document) => (
        <span className="text-2xs text-muted-foreground">{formatRelative(document.created_at)}</span>
      ),
      sortValue: (document) => document.created_at,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (document) =>
        document.status === 'indexed' ? (
          <Badge tone="success" dot>
            Indexed
          </Badge>
        ) : (
          <Button size="sm" variant="outline" onClick={() => openIndex(document)}>
            <Database />
            Index
          </Button>
        ),
    },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="AI modules"
        title="Document intelligence"
        description="Upload project documents, build a searchable index and ask questions across the whole archive."
        demo={isDemo}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Documents" value={formatNumber(stats.total)} icon={FileText} hint="Across every project" />
        <StatCard
          label="Indexed"
          value={formatNumber(stats.indexed)}
          icon={Database}
          tone="success"
          hint="Searchable and ready for Q&A"
        />
        <StatCard
          label="Processing"
          value={formatNumber(stats.processing)}
          icon={Clock}
          tone="warning"
          hint="Extraction in progress"
        />
        <StatCard
          label="Failed"
          value={formatNumber(stats.failed)}
          icon={AlertTriangle}
          tone={stats.failed > 0 ? 'danger' : 'neutral'}
          hint="Need a re-upload"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="flex flex-col">
          <CardToolbar
            title="Upload documents"
            description="Register a file against a project, then index its text."
            actions={<Badge tone="neutral">PDF · Office · CAD</Badge>}
          />
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Project" htmlFor="doc_project" className="min-w-[200px] flex-1">
                <Select
                  id="doc_project"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                >
                  {DEMO_PROJECTS.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.code} · {project.title}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragActive(false)
                pickFile(event.dataTransfer.files?.[0] ?? null)
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center transition-colors',
                dragActive ? 'border-primary/60 bg-primary/5' : 'bg-muted/20',
              )}
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground">
                <Upload className="h-4 w-4" />
              </span>
              <p className="text-xs font-medium text-foreground">
                Drag a file here, or choose one from your machine
              </p>
              <p className="max-w-sm text-2xs text-muted-foreground">
                Metadata is registered with the document service; binary transfer happens through the
                storage pipeline.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
                aria-label="Choose a document to upload"
              />
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                Browse files
              </Button>
            </div>

            {pendingFile ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">{pendingFile.name}</p>
                    <p className="text-2xs text-muted-foreground">
                      {formatNumber(pendingFile.size / 1024)} KB ·{' '}
                      {pendingFile.type || 'unknown type'}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setPendingFile(null)}
                  aria-label="Remove selected file"
                >
                  <X />
                </Button>
              </div>
            ) : null}

            <div className="mt-auto flex items-center justify-between gap-2">
              <p className="text-2xs text-muted-foreground">
                {pendingFile ? 'Ready to register' : 'No file selected'}
              </p>
              <Button
                onClick={() => pendingFile && uploadMutation.mutate({ project_id: projectId, file: pendingFile })}
                disabled={!pendingFile}
                loading={uploadMutation.isPending}
              >
                <Upload />
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardToolbar
            title="Ask your documents"
            description="Answers cite the passages they were grounded in."
            actions={
              <Badge tone="primary" dot>
                RAG
              </Badge>
            }
          />
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="flex gap-2">
              <InputWithIcon
                icon={<Sparkles />}
                placeholder="What are the concrete cover requirements?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    ask()
                  }
                }}
                className="flex-1"
                aria-label="Ask your documents"
              />
              <Button onClick={ask} loading={askMutation.isPending} disabled={question.trim().length < 4}>
                Ask
              </Button>
            </div>
            {askError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive-muted px-3 py-2 text-2xs text-destructive">
                {askError}
              </p>
            ) : null}

            <div className="min-h-[180px] flex-1 space-y-3 overflow-y-auto scrollbar-thin rounded-lg border border-border bg-muted/20 p-3">
              {conversation.length === 0 ? (
                <EmptyState
                  compact
                  icon={Sparkles}
                  title="Ask across every indexed document"
                  description="Try “Which clauses cover rebar cover?” or “What did the geotech survey find?”"
                />
              ) : (
                conversation.map((turn, index) => (
                  <div key={`${turn.query}-${index}`} className="space-y-2">
                    <p className="text-right text-xs font-medium text-foreground">{turn.query}</p>
                    <div className="rounded-lg border border-border bg-surface px-3 py-2">
                      <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                        {turn.answer}
                      </p>
                      {turn.sources.length > 0 ? (
                        <ul className="mt-2 space-y-1 border-t border-border pt-2">
                          {turn.sources.map((source) => (
                            <li
                              key={source.chunk_id}
                              className="flex items-baseline justify-between gap-2 text-2xs text-muted-foreground"
                            >
                              <span className="truncate">
                                {documentNames.get(source.document_id) ?? source.document_id}
                              </span>
                              <span className="shrink-0 tabular">
                                {Math.round(source.score * 100)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        getRowId={(document) => document.id}
        loading={documentQuery.isLoading}
        error={documentQuery.isDemo ? null : documentQuery.error?.message ?? null}
        onRetry={() => void documentQuery.refetch()}
        pageSize={8}
        emptyTitle="No documents match"
        emptyDescription="Upload a document or adjust the filters."
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <InputWithIcon
              icon={<Search />}
              placeholder="Search filename, project or storage key…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full sm:w-72"
              aria-label="Search documents"
            />
            <Select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as 'all' | 'indexed' | 'processing' | 'uploaded' | 'failed',
                )
              }
              className="w-40"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="indexed">Indexed</option>
              <option value="processing">Processing</option>
              <option value="uploaded">Uploaded</option>
              <option value="failed">Failed</option>
            </Select>
            <Badge tone="neutral" className="ml-auto">
              {filtered.length} of {documents.length}
            </Badge>
          </div>
        }
      />

      <Modal
        open={Boolean(indexTarget)}
        onClose={() => setIndexTarget(null)}
        title="Index document"
        description={
          indexTarget
            ? `Paste the extracted text for ${indexTarget.filename}.`
            : 'Paste the extracted document text.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setIndexTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" form="index-form" loading={indexMutation.isPending}>
              <Database />
              Index document
            </Button>
          </>
        }
      >
        <form
          id="index-form"
          className="space-y-4"
          onSubmit={indexForm.handleSubmit((values) => indexMutation.mutate(values))}
        >
          {indexTarget ? (
            <dl className="grid gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs sm:grid-cols-2">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Project</dt>
                <dd className="font-medium text-foreground">
                  {demoProject(indexTarget.project_id).code}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusBadge status={indexTarget.status} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 sm:col-span-2">
                <dt className="text-muted-foreground">Added</dt>
                <dd className="text-foreground">{formatDate(indexTarget.created_at)}</dd>
              </div>
            </dl>
          ) : null}
          <Field
            label="Document text"
            htmlFor="document_text"
            required
            hint="Chunking and embeddings run server-side after submission."
            error={indexForm.formState.errors.text?.message}
          >
            <Textarea
              id="document_text"
              rows={8}
              placeholder="Paste the extracted text, specification or contract clauses…"
              {...indexForm.register('text')}
              aria-invalid={Boolean(indexForm.formState.errors.text)}
            />
          </Field>
        </form>
      </Modal>
    </div>
  )
}
