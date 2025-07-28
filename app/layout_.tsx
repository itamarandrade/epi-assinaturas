// app/layout.tsx
import '@/styles/globals.css'
import Link from 'next/link'
import { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import Head from 'next/head'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sistema de Segurança',
  description: 'Dashboard de controle dos módulos internos',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head />
      <body className={`bg-gray-100 ${inter.className}`}>
        <div className="flex min-h-screen">
          <aside className="w-64 bg-gray-900 text-white p-6 space-y-4 flex-shrink-0">
            <h1 className="text-xl font-bold mb-6">Painel Administrativo</h1>
            <nav className="space-y-2">
              <Link href="/" className="block hover:text-yellow-400">📊 Início</Link>
              <Link href="/epi" className="block hover:text-yellow-400">🦺 EPIs</Link>
              <Link href="/ocorrencias" className="block hover:text-yellow-400">🚨 Ocorrências</Link>
              <Link href="/funcionarios" className="block hover:text-yellow-400">👥 Funcionários</Link>
              <Link href="/documentos" className="block hover:text-yellow-400">📁 Documentos</Link>
            </nav>
          </aside>
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}