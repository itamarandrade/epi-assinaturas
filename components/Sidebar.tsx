'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [epiOpen, setEpiOpen] = useState(false)
  const [ocorrenciasOpen, setOcorrenciasOpen] = useState(false)

  // Abre o submenu se estiver navegando em /epi/*
  useEffect(() => {
    if (pathname.startsWith('/epi')) setEpiOpen(true)
    if (pathname.startsWith('/ocorrencias')) setOcorrenciasOpen(true)
  }, [pathname])


  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-64 bg-gray-900 text-white p-6 space-y-4 flex-shrink-0">
      <h1 className="text-xl font-bold mb-6">Painel Administrativo</h1>
      <nav className="space-y-2">
        <Link
          href="/"
          className={`block hover:text-yellow-400 ${isActive('/') ? 'text-yellow-400 font-semibold' : ''}`}
        >
          📊 Início
        </Link>

        {/* Grupo EPIs com submenu */}
        <div>
          <button
            type="button"
            aria-expanded={epiOpen}
            aria-controls="submenu-epi"
            onClick={() => setEpiOpen(v => !v)}
            className="w-full flex items-center justify-between hover:text-yellow-400"
          >
            <span>🦺 EPIs</span>
            <span className={`transition-transform ${epiOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>

          <ul
            id="submenu-epi"
            className={`mt-2 pl-4 overflow-hidden grid transition-[grid-template-rows] duration-200 ease-out ${
              epiOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden space-y-1">
              <Link
                href="/epi"
                className={`block hover:text-yellow-400 ${isActive('/epi') ? 'text-yellow-400 font-semibold' : ''}`}
              >
                Colaboradores
              </Link>
              <Link
                href="/epi/epis"
                className={`block hover:text-yellow-400 ${isActive('/epi/epis') ? 'text-yellow-400 font-semibold' : ''}`}
              >
                EPIs
              </Link>
              <Link
                href="/epi/upload"
                className={`block hover:text-yellow-400 ${isActive('/epi/epis') ? 'text-yellow-400 font-semibold' : ''}`}
              >
                Importar
              </Link>
            </div>
          </ul>
        </div>
        <div>
          <button
            type="button"
            aria-expanded={ocorrenciasOpen}
            aria-controls="submenu-ocorrencias"
            onClick={() => setOcorrenciasOpen(v => !v)}
            className="w-full flex items-center justify-between hover:text-yellow-400"
          >
            <span>🚨 Ocorrências</span>
            <span className={`transition-transform ${ocorrenciasOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>

          <ul
            id="submenu-ocorrencias"
            className={`mt-2 pl-4 overflow-hidden grid transition-[grid-template-rows] duration-200 ease-out ${
              ocorrenciasOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden space-y-1">
              <Link
                href="/ocorrencias"
                className={`block hover:text-yellow-400 ${isActive('/ocorrencias') ? 'text-yellow-400 font-semibold' : ''}`}
              >
                Dashboard
              </Link>
              <Link
                href="/ocorrencias/import"
                className={`block hover:text-yellow-400 ${isActive('/ocorrencias/import') ? 'text-yellow-400 font-semibold' : ''}`}
              >
                Importar
              </Link>
            </div>
          </ul>
        </div>
        
        <Link
          href="/funcionarios"
          className={`block hover:text-yellow-400 ${isActive('/funcionarios') ? 'text-yellow-400 font-semibold' : ''}`}
        >
          👥 Funcionários
        </Link>
        <Link
          href="/documentos"
          className={`block hover:text-yellow-400 ${isActive('/documentos') ? 'text-yellow-400 font-semibold' : ''}`}
        >
          📁 Documentos
        </Link>
      </nav>
    </aside>
  )
}
