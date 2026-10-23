import { cn, initials } from '@/lib/utils'

type AvatarProps = {
  name?: string | null
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  status?: 'online' | 'offline' | 'busy'
}

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
}

const GRADIENTS = [
  'from-indigo-500 to-violet-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-sky-500 to-cyan-500',
  'from-rose-500 to-pink-500',
  'from-fuchsia-500 to-purple-500',
]

function gradientFor(name: string) {
  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return GRADIENTS[hash % GRADIENTS.length]
}

const statusColor = {
  online: 'bg-success',
  offline: 'bg-muted-foreground',
  busy: 'bg-destructive',
}

export function Avatar({ name, src, size = 'md', className, status }: AvatarProps) {
  const label = name?.trim() || 'Unknown user'

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className={cn('rounded-full object-cover ring-1 ring-border', sizes[size])}
        />
      ) : (
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-1 ring-inset ring-white/15',
            gradientFor(label),
            sizes[size],
          )}
          aria-hidden="true"
          title={label}
        >
          {initials(label)}
        </span>
      )}
      {status ? (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background',
            statusColor[status],
          )}
          aria-hidden="true"
        />
      ) : null}
    </span>
  )
}
