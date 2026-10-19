import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import ThemeToggle from '@/components/ThemeToggle'
import { Providers } from '@/app/providers'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export const metadata: Metadata = {
  title: 'Estim AI Platform — Construction Intelligence',
  description: 'AI-powered construction intelligence platform for procurement, cost forecasting, inventory, maintenance, and more.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <ProtectedRoute>
            <div className="app-shell">
              <Sidebar />
              <ThemeToggle />
              <main className="main-content">
                {children}
              </main>
            </div>
          </ProtectedRoute>
        </Providers>
      </body>
    </html>
  )
}
