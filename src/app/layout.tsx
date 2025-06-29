import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AutoForwardX - Message Forwarding Dashboard',
  description: 'Manage your Telegram and Discord message forwarding with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-dark-bg text-dark-text min-h-screen`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}