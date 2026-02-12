import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Performance Observatory',
  description: 'Next.js App Routerの3つのレンダリング戦略を比較するデモプロジェクト',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
