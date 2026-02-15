import type { Metadata } from 'next'
import { Inter, Playfair_Display, Space_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-playfair',
  display: 'swap'
})

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'SOMNI AI - Sleep Health Intelligence System',
  description: 'Transform wearable sleep data into actionable health insights through multi-agent clinical evidence synthesis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${spaceMono.variable} font-sans`}>{children}</body>
    </html>
  )
}
