// app/layout.tsx
import '@/app/globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import Sidebar from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sistema de Segurança',
  description: 'Dashboard de controle dos módulos internos',
}

export default function RootLayout({ children }: { children: ReactNode }) {

  // Highlight active link
  return (
    <html lang="pt-BR">
      <head />
      <body className={`bg-gray-100 ${inter.className}`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
