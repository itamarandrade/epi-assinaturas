'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [msg, setMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<Record<string, string | number>[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsLoading(true)
    setMsg('')
    setProgress(0)
    setPreview([])

    // Leitura local para exibir prévia
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const sheet = workbook.Sheets['organizar'] || workbook.Sheets['ORGANIZAR']
    const json = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet)
    setPreview(json)

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload', true)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100)
        setProgress(percent)
      }
    }

    xhr.onload = () => {
      const response = JSON.parse(xhr.responseText)
      setMsg(response.message || response.error)
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
          <h2 className="text-lg font-semibold mb-2">Prévia dos dados ({preview.length} registros)</h2>
          <div className="overflow-auto max-h-96 border rounded">
            <table className="min-w-full text-sm">
              <thead>
                <tr>
                  {Object.keys(preview[0]).map(key => (
                    <th key={key} className="border px-2 py-1 bg-gray-100 text-left">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((cell, j) => (
                      <td key={j} className="border px-2 py-1">{String(cell)}</td>
                    ))}
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