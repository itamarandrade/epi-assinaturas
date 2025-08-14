'use client'

import React, { useState } from 'react'

type ImportResult = {
  sheet: string
  total_rows: number
  inserted_or_updated: number
  failed: number
  mapped: Record<string, string | null>
}

export default function ImportOcorrenciasPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<ImportResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true); setErr(null); setRes(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/ocorrencias/api/import', { method: 'POST', body: fd })
      const json = await r.json()
      if (!r.ok) throw new Error(json?.error || 'Falha ao importar')
      setRes(json)
    } catch (e: any) {
      setErr(e?.message || 'Erro ao importar')
    } finally {
      setLoading(false)
    }
  }

  const mappedList = res ? Object.entries(res.mapped) : []

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Importar Ocorrências</h1>

      <form onSubmit={onSubmit} className="bg-white p-4 rounded-xl shadow space-y-3">
        <div>
          <label className="block text-sm mb-1">Arquivo (.xlsx/.xls)</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="block"
          />
        </div>
        <button
          type="submit"
          disabled={!file || loading}
          className="px-4 py-2 rounded bg-gray-900 text-white disabled:opacity-50"
        >
          {loading ? 'Importando...' : 'Enviar e Importar'}
        </button>
      </form>

      {err && (
        <div className="text-sm text-red-600">{err}</div>
      )}

      {res && (
        <div className="bg-white p-4 rounded-xl shadow space-y-3 text-sm">
          <div><b>Aba lida:</b> {res.sheet}</div>
          <div className="flex gap-6">
            <div><b>Linhas lidas:</b> {res.total_rows}</div>
            <div><b>Inseridas/Atualizadas:</b> {res.inserted_or_updated}</div>
            <div><b>Falhas:</b> {res.failed}</div>
          </div>

          <div className="mt-2">
            <b>Mapeamento detectado</b>
            <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
              {mappedList.map(([k, v]) => (
                <div key={k} className="flex justify-between border rounded p-2">
                  <span className="text-gray-600">{k}</span>
                  <span className="font-mono">{v ?? '—'}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Dica: se algum campo veio “—”, verifique o cabeçalho na planilha. O import aceita sinônimos (ex.: “Estacao/Maquina”).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
