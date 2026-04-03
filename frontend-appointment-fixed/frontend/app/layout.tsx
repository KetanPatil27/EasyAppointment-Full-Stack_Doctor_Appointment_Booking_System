import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/lib/app-context'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EasyAppointment - Find & Book Doctors Online',
  description: 'Book appointments with top doctors online. Easy, fast, and reliable.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} overflow-x-hidden`}>
        <AppProvider>
          {children}
          <Toaster richColors position="top-right" closeButton duration={5000} />
        </AppProvider>
      </body>
    </html>
  )
}
