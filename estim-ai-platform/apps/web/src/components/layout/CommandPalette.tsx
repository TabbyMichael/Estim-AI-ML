'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  CornerDownLeft,
  LogOut,
  Moon,
  Search,
  Sun,
  UserCircle,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { filterNavigation, NAV_SECTIONS, type NavSection } from '@/config/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme } from '@/lib/theme-provider'
import { cn } from '@/lib/utils'

type PaletteEntry = {
  id: string
  label: string
  description?: string
  group: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  action?: () => void
  keywords?: string
}

/** Cheap subsequence-aware fuzzy score. 0 means "no match". */
function fuzzyScore(text: string, query: string): number {
  const haystack = text.toLowerCase()
  const needle = query.toLowerCase().trim()
  if (!needle) return 1
  if (haystack === needle) return 100
  if (haystack.startsWith(needle)) return 80
  if (haystack.includes(needle)) return 60

  let cursor = 0
  let hits = 0
  for (const char of needle) {
    const found = haystack.indexOf(char, cursor)
    if (found === -1) break
    hits += 1
    cursor = found + 1
  }
  return hits === needle.length ? 30 : 0
}

function buildNavigationEntries(sections: NavSection[]): PaletteEntry[] {
  return sections.flatMap((section) =>
    section.items.map((item) => ({
      id: `nav:${item.href}`,
      label: item.label,
      description: item.description,
      group: section.label,
      icon: item.icon,
      href: item.href,
      keywords: `${section.label} ${item.label} ${item.href}`,
    })),
  )
}

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [query, setQuery] = React.useState('')
  const [activeIndex, setActiveIndex] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange])

  const actions: PaletteEntry[] = React.useMemo(
    () => [
      {
        id: 'action:theme',
        label: resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        description: 'Toggle the colour theme',
        group: 'Actions',
        icon: resolvedTheme === 'dark' ? Sun : Moon,
        action: toggleTheme,
        keywords: 'theme dark light appearance',
      },
      {
        id: 'action:profile',
        label: 'Open profile',
        description: 'Account, preferences and security',
        group: 'Actions',
        icon: UserCircle,
        href: '/profile',
        keywords: 'account settings security password',
      },
      {
        id: 'action:signout',
        label: 'Sign out',
        description: 'End the current session',
        group: 'Actions',
        icon: LogOut,
        action: () => {
          logout()
          router.replace('/login')
        },
        keywords: 'logout exit session',
      },
    ],
    [resolvedTheme, toggleTheme, logout, router],
  )

  const entries = React.useMemo(() => {
    const allowedSections = filterNavigation(NAV_SECTIONS, user?.roles)
    const candidates = buildNavigationEntries(allowedSections).concat(actions)
    const trimmed = query.trim()
    if (!trimmed) return candidates
    return candidates
      .map((entry) => ({
        entry,
        score: Math.max(
          fuzzyScore(entry.label, trimmed),
          fuzzyScore(entry.group, trimmed) * 0.5,
          fuzzyScore(entry.keywords ?? '', trimmed) * 0.4,
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ entry }) => entry)
  }, [actions, query, user?.roles])

  React.useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
  }, [open])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [query])

  React.useEffect(() => {
    const container = listRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    active?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const run = React.useCallback(
    (entry: PaletteEntry | undefined) => {
      if (!entry) return
      close()
      if (entry.href) {
        router.push(entry.href)
        return
      }
      entry.action?.()
    },
    [close, router],
  )

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (entries.length === 0 ? 0 : (index + 1) % entries.length))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) =>
        entries.length === 0 ? 0 : (index - 1 + entries.length) % entries.length,
      )
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
      return
    }
    if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(Math.max(0, entries.length - 1))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      run(entries[activeIndex])
    }
  }

  let lastGroup: string | null = null
  const activeId = entries.length > 0 ? `palette-item-${activeIndex}` : undefined

  return (
    <Modal open={open} onClose={close} size="md" className="sm:my-0 sm:mt-[12vh]">
      <div className="-mx-5 -my-4">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages and actions…"
            aria-label="Search pages and actions"
            role="combobox"
            aria-expanded
            aria-controls="command-palette-list"
            aria-activedescendant={activeId}
            autoComplete="off"
            className="h-12 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 rounded border border-border bg-surface px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          aria-label="Results"
          className="max-h-[min(54vh,400px)] overflow-y-auto scrollbar-thin p-1.5"
        >
          {entries.length === 0 ? (
            <div className="px-3 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No matches</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try “procurement”, “reports” or “theme”.
              </p>
            </div>
          ) : (
            entries.map((entry, index) => {
              const Icon = entry.icon
              const showGroup = entry.group !== lastGroup
              lastGroup = entry.group
              const active = index === activeIndex
              return (
                <React.Fragment key={entry.id}>
                  {showGroup ? (
                    <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                      {entry.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    id={`palette-item-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => run(entry)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                      active ? 'bg-accent text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    <Icon
                      className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {entry.label}
                      </span>
                      {entry.description ? (
                        <span className="block truncate text-2xs text-muted-foreground">
                          {entry.description}
                        </span>
                      ) : null}
                    </span>
                    <ArrowRight
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-opacity',
                        active ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden="true"
                    />
                  </button>
                </React.Fragment>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-sans">↑</kbd>
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-sans">↓</kbd>
            to navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" /> to open
          </span>
          <span className="ml-auto uppercase tracking-wide">
            {entries.length} result{entries.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </Modal>
  )
}
