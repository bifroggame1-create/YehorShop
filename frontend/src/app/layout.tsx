import type { Metadata } from 'next'
import '@/styles/globals.css'
import AuthProvider from '@/components/AuthProvider'
import Toast from '@/components/Toast'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'Digital Shop',
  description: 'Магазин цифровых товаров в Telegram',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru" className="dark">
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
        <AuthProvider>
          {children}
          <Toast />
        </AuthProvider>
      </body>
    </html>
  )
}
