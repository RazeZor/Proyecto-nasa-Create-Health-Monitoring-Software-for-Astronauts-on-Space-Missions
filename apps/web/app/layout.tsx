import type { Metadata, Viewport } from 'next'
import { AppProvider } from '@/components/app-context'
import { AppShell } from '@/components/shell/app-shell'
import './globals.css'

export const metadata: Metadata = {
  title: 'VIGÍA · Monitor de autosalud de la tripulación',
  description:
    'Prototipo de apoyo a la decisión para que los astronautas monitoricen su salud en misiones largas con retardo de comunicación.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: '#11161f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  )
}
