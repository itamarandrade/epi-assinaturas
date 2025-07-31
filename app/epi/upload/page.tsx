'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

interface EpiEntry {
  nome_epi: string
  status_epi: string
  status: string
  proximo_fornecimento: string | null
  mes_fornecimento: string
}

interface ColaboradorRecord {
  nome: string
  cargo: string
  loja: string
  consultor: string
  epis: EpiEntry[]
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<ColaboradorRecord[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsLoading(true)
    setMsg('')
    setProgress(0)
    setPreview([])

    // Leitura local e agrupamento para preview
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheet = workbook.Sheets['organizar'] || workbook.Sheets['ORGANIZAR']
    if (!sheet) {
      setIsLoading(false)
      setMsg('A aba "organizar" não foi encontrada na planilha.')
      return
    }
    const rows: any[] = XLSX.utils.sheet_to_json(sheet)
    const map = new Map<string, ColaboradorRecord>()
    rows.forEach(r => {
      const nome = (r['Colaborador'] || '').toString().trim()
      const loja = (r['Sigla'] || '').toString().trim()
      const consultor = (r['Consultor de Operações'] || '').toString().trim()
      const cargo = (r['Cargo'] || '').toString().trim()
      const key = `${nome}|${loja}|${consultor}`
      if (!map.has(key)) {
        map.set(key, { nome, cargo, loja, consultor, epis: [] })
      }
      const entry = map.get(key)!
      entry.epis.push({
        nome_epi: (r['EPI'] || '').toString().trim(),
        status_epi: (r['Status EPI'] || '').toString().trim(),
        status: (r['Status Geral'] || '').toString().trim(),
        proximo_fornecimento: r['Próximo Fornecimento'] ? new Date(r['Próximo Fornecimento']).toLocaleDateString() : null,
        mes_fornecimento: (r['Mês'] || '').toString().trim(),
      })
    })
    const grouped = Array.from(map.values())
    setPreview(grouped)

    // Envia para servidor
    const formData = new FormData()
    formData.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/epi/api/upload', true)
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100))
      }
    }
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText)
        setMsg(res.message || res.error)
      } catch {
        setMsg('Erro inesperado no servidor. Verifique os logs.')
        console.error('Resposta inválida:', xhr.responseText)
      }
      setIsLoading(false)
    }
    xhr.onerror = () => {
      setMsg('Erro ao enviar o arquivo')
      setIsLoading(false)
    }
    xhr.send(formData)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Importar Planilha de Assinaturas</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          accept=".xlsx"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="block w-full"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      {isLoading && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-1">Importando... {progress}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {msg && <p className="mt-4 text-sm text-gray-700">{msg}</p>}

      {preview.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">
            Prévia dos colaboradores ({preview.length} registros)
          </h2>
          <div className="overflow-auto max-h-96 border rounded text-sm">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Nome</th>
                  <th className="border px-2 py-1">Loja</th>
                  <th className="border px-2 py-1">Consultor</th>
                  <th className="border px-2 py-1">Cargo</th>
                  <th className="border px-2 py-1">#EPIs</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((colab, i) => (
                  <tr key={i} className="hover:bg-gray-100">
                    <td className="border px-2 py-1">{colab.nome}</td>
                    <td className="border px-2 py-1">{colab.loja}</td>
                    <td className="border px-2 py-1">{colab.consultor}</td>
                    <td className="border px-2 py-1">{colab.cargo}</td>
                    <td className="border px-2 py-1 text-center">{colab.epis.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
