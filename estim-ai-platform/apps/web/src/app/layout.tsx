import type { Metadata, Viewport } from 'next'
import { Providers } from '@/app/providers'
import './globals.css'

const themeBootScript = `(function(){try{var stored=localStorage.getItem('theme');var theme=(stored==='light'||stored==='dark'||stored==='system')?stored:'dark';var isDark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var root=document.documentElement;root.classList.toggle('dark',isDark);root.style.colorScheme=isDark?'dark':'light';root.dataset.theme=isDark?'dark':'light';var density=localStorage.getItem('estim_density');root.dataset.density=density==='compact'?'compact':'comfortable';}catch(e){}})();`

export const metadata: Metadata = {
  title: {
    default: 'Estim AI — Construction Intelligence',
    template: '%s · Estim AI',
  },
  description:
    'AI-powered construction intelligence: procurement anomaly detection, cost forecasting, inventory, predictive maintenance, project risk and document automation.',
  applicationName: 'Estim AI',
  authors: [{ name: 'Estim AI' }],
  keywords: [
    'construction intelligence',
    'cost forecasting',
    'procurement analytics',
    'predictive maintenance',
    'project risk',
  ],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#090a10' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* App Router owns the document head; next/font is not used so the app
            can build offline from the installed dependency tree. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
