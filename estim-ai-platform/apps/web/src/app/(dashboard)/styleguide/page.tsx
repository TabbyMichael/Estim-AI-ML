'use client'

import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Download,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  Trash2,
  Users,
} from 'lucide-react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  DataTable,
  Dropdown,
  EmptyState,
  Field,
  Input,
  InputWithIcon,
  Modal,
  PageHeader,
  Progress,
  ProgressRow,
  SegmentedControl,
  Select,
  Skeleton,
  SkeletonCard,
  StatCard,
  StatusBadge,
  Switch,
  Tabs,
  Textarea,
  Tooltip,
  type Column,
} from '@/components/ui'
import { useToast } from '@/lib/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

type DemoRow = {
  id: string
  reference: string
  supplier: string
  amount: number
  status: string
}

const ROWS: DemoRow[] = [
  { id: 'po-1042', reference: 'PO-1042', supplier: 'Nordic Steel', amount: 128400, status: 'approved' },
  { id: 'po-1043', reference: 'PO-1043', supplier: 'Cascade Concrete', amount: 48250, status: 'pending' },
  { id: 'po-1044', reference: 'PO-1044', supplier: 'Vertex Glass', amount: 91200, status: 'rejected' },
  { id: 'po-1045', reference: 'PO-1045', supplier: 'Halcyon Cranes', amount: 234000, status: 'draft' },
]

const COLUMNS: Column<DemoRow>[] = [
  {
    id: 'reference',
    header: 'Reference',
    sortValue: (row) => row.reference,
    cell: (row) => <span className="font-mono text-xs text-foreground">{row.reference}</span>,
  },
  {
    id: 'supplier',
    header: 'Supplier',
    sortValue: (row) => row.supplier,
    cell: (row) => <span className="text-xs">{row.supplier}</span>,
  },
  {
    id: 'amount',
    header: 'Amount',
    align: 'right',
    sortValue: (row) => row.amount,
    cell: (row) => <span className="tabular text-xs">{formatCurrency(row.amount)}</span>,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <StatusBadge status={row.status} />,
  },
]

export default function StyleguidePage() {
  const toast = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [tab, setTab] = useState('overview')
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [toggle, setToggle] = useState(true)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  return (
    <div className="space-y-10 p-6">
      <PageHeader
        eyebrow="Internal QA"
        title="Styleguide"
        description="Every primitive in one place. Unlinked from navigation — used to verify states, themes and responsive behaviour."
        breadcrumb={[{ label: 'Dashboard', href: '/' }, { label: 'Styleguide' }]}
        demo
        actions={
          <Button onClick={() => toast.success('Saved', 'Demo toast fired from the styleguide.')}>
            <CheckCircle2 />
            Fire toast
          </Button>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Tokens</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Primary', 'bg-primary'],
            ['Success', 'bg-success'],
            ['Warning', 'bg-warning'],
            ['Danger', 'bg-destructive'],
            ['Info', 'bg-info'],
            ['Muted', 'bg-muted'],
          ].map(([label, className]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-2">
              <div className={`h-12 rounded-lg ${className}`} />
              <p className="mt-2 text-2xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Buttons</h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 pt-5">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="subtle">Subtle</Button>
            <Button variant="destructive">
              <Trash2 />
              Destructive
            </Button>
            <Button variant="link">Link</Button>
            <Button loading>Loading</Button>
            <Button size="sm">
              <Plus />
              Small
            </Button>
            <Button size="lg">Large</Button>
            <Button size="icon" variant="outline" aria-label="Settings">
              <Settings2 />
            </Button>
            <Button disabled>Disabled</Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Badges</h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-2 pt-5">
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="primary" dot>
              Primary
            </Badge>
            <Badge tone="success" dot>
              Approved
            </Badge>
            <Badge tone="warning" dot>
              Pending
            </Badge>
            <Badge tone="danger" dot>
              Rejected
            </Badge>
            <Badge tone="info">Draft</Badge>
            <Badge tone="outline">Outline</Badge>
            <StatusBadge status="under_investigation" />
            <StatusBadge status="completed" />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active projects" value="8" icon={Boxes} delta={0.12} deltaLabel="vs last month" />
        <StatCard
          label="At risk"
          value="3"
          icon={AlertTriangle}
          tone="warning"
          delta={0.05}
          deltaLabel="vs last month"
          invertDelta
        />
        <StatCard label="Open alerts" value="12" icon={Activity} tone="danger" hint="4 critical" />
        <StatCard label="Team" value="26" icon={Users} tone="info" loading />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Forms</h2>
        <Card>
          <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
            <Field label="Full name" htmlFor="sg-name" hint="Shown to your team." required>
              <Input
                id="sg-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ada Lovelace"
              />
            </Field>
            <Field label="Search" htmlFor="sg-search">
              <InputWithIcon id="sg-search" icon={<Search />} placeholder="Search purchase orders" />
            </Field>
            <Field label="Role" htmlFor="sg-role">
              <Select id="sg-role" defaultValue="engineer">
                <option value="admin">Administrator</option>
                <option value="engineer">Project engineer</option>
                <option value="finance">Finance</option>
              </Select>
            </Field>
            <Field label="Invalid state" htmlFor="sg-invalid" error="This field is required.">
              <Input id="sg-invalid" aria-invalid defaultValue="" placeholder="Required" />
            </Field>
            <Field label="Notes" htmlFor="sg-notes" className="sm:col-span-2">
              <Textarea
                id="sg-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add context for reviewers"
              />
            </Field>
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch checked={toggle} onCheckedChange={setToggle} aria-label="Demo toggle" />
              <span className="text-xs text-muted-foreground">
                Notifications {toggle ? 'enabled' : 'disabled'}
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Progress & avatars
        </h2>
        <Card>
          <CardContent className="grid gap-5 pt-5 sm:grid-cols-2">
            <div className="space-y-3">
              <Progress value={72} />
              <Progress value={38} tone="warning" />
              <Progress value={92} tone="success" />
              <Progress value={18} tone="danger" size="sm" />
            </div>
            <div className="space-y-3">
              <ProgressRow label="Foundation works" value={88} />
              <ProgressRow label="Structure works" value={54} hint="54%" />
              <ProgressRow label="MEP rough-in" value={23} tone="warning" />
            </div>
          </CardContent>
          <CardContent className="flex items-center gap-3">
            <Avatar name="Ada Lovelace" size="lg" status="online" />
            <Avatar name="Grace Hopper" />
            <Avatar name="Katherine Johnson" size="sm" />
            <Avatar name="Alan Turing" size="xs" />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Tabs, segmented, dropdown, tooltip
        </h2>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Controls</CardTitle>
              <CardDescription>Interactive primitives with keyboard support.</CardDescription>
            </div>
            <Dropdown
              trigger={
                <Button variant="outline" size="icon" aria-label="Row actions">
                  <MoreHorizontal />
                </Button>
              }
              items={[
                { id: 'export', label: 'Export CSV', icon: <Download />, onSelect: () => toast.info('Export queued') },
                { id: 'settings', label: 'Settings', icon: <Settings2 />, onSelect: () => setModalOpen(true) },
                {
                  id: 'delete',
                  label: 'Delete',
                  icon: <Trash2 />,
                  destructive: true,
                  separatorBefore: true,
                  onSelect: () => setConfirmOpen(true),
                },
              ]}
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs
              items={[
                { id: 'overview', label: 'Overview' },
                { id: 'activity', label: 'Activity', badge: 4 },
                { id: 'settings', label: 'Settings' },
              ]}
              value={tab}
              onValueChange={setTab}
            />
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                options={[
                  { value: '7d', label: '7 days' },
                  { value: '30d', label: '30 days' },
                  { value: '90d', label: '90 days' },
                ]}
                value={range}
                onValueChange={(value) => setRange(value as typeof range)}
              />
              <Tooltip content="Tooltips appear on hover and focus.">
                <Badge tone="outline">Hover me</Badge>
              </Tooltip>
              <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
                Open modal
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
                Open confirm
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Active tab: <span className="font-mono text-foreground">{tab}</span> · Range:{' '}
              <span className="font-mono text-foreground">{range}</span>
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">Data table</h2>
        <DataTable
          data={ROWS}
          columns={COLUMNS}
          getRowId={(row) => row.id}
          pageSize={5}
          onRowClick={(row) => toast.info(`Selected ${row.reference}`)}
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <InputWithIcon icon={<Search />} placeholder="Filter rows" className="w-56" />
              <Button size="sm" variant="outline">
                <Download />
                Export
              </Button>
            </div>
          }
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <EmptyState
          icon={Boxes}
          title="No purchase orders"
          description="Once Odoo syncs, purchase orders and anomalies will appear here."
          action={<Button size="sm">Sync now</Button>}
        />
        <div className="space-y-3">
          <SkeletonCard />
          <Skeleton className="h-6 w-40" />
        </div>
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create purchase order"
        description="Dialog with focus trap, Escape handling and scroll lock."
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setModalOpen(false)
                toast.success('Purchase order created')
              }}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Supplier" htmlFor="sg-supplier">
            <Input id="sg-supplier" placeholder="Nordic Steel" />
          </Field>
          <Field label="Amount" htmlFor="sg-amount">
            <Input id="sg-amount" type="number" placeholder="128400" />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false)
          toast.error('Purchase order deleted', 'Demo mode — nothing was persisted.')
        }}
        title="Delete purchase order?"
        description="This action cannot be undone. The record and its audit trail link will be removed."
        confirmLabel="Delete"
        destructive
      />
    </div>
  )
}
