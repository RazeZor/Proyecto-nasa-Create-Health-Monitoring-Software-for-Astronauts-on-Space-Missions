import type { Metadata, Viewport } from 'next'
import { AppProvider } from '@/components/app-context'
import { AppShell } from '@/components/shell/app-shell'
import { SwRegister } from '@/components/shell/sw-register'
import '@fontsource-variable/space-grotesk'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'VIGÍA · Crew self-health monitor / Monitor de autosalud de la tripulación',
  description:
    'Decision-support prototype for astronauts to monitor their own health on long missions with communication delay. ' +
    'Prototipo de apoyo a la decisión para que los astronautas monitoricen su salud en misiones largas con retardo de comunicación.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/icono-app-180.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: '#F2F5FA',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <SwRegister />
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  )
}
