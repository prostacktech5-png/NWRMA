import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AppQueryProvider } from '@/components/app-query-provider'
import { AppBrandingProvider } from '@/components/app-branding-provider'
import { DemoSessionProvider } from '@/components/demo-session-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'NWRMA - National Water Resources Management Authority',
  description: 'Government ERP system for Sierra Leone National Water Resources Management Authority - Managing water resources for sustainable development',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0072C6' },
    { media: '(prefers-color-scheme: dark)', color: '#1a2744' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="bg-background">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AppBrandingProvider>
            <DemoSessionProvider>
              <AppQueryProvider>
                {children}
                <Toaster richColors position="top-right" />
              </AppQueryProvider>
            </DemoSessionProvider>
          </AppBrandingProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
