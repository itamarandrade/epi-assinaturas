import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import path from 'path'
import { writeFile } from 'fs/promises'

interface RawRow {
  [key: string]: string | undefined
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // chave de serviço para backend
)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

   const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // 🟡 Salvar arquivo fisicamente no servidor
  const uploadPath = path.join(process.cwd(), 'public', 'uploads', `${Date.now()}_${file.name}`)
  await writeFile(uploadPath, buffer)

  // 🟢 Ler o conteúdo do Excel
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets['organizar'] || workbook.Sheets['ORGANIZAR']
  if (!sheet) return NextResponse.json({ error: 'Aba "organizar" não encontrada' }, { status: 400 })

  const json = XLSX.utils.sheet_to_json<RawRow>(sheet)
function parseData(value?: string | number): string | null {
  if (!value) return null
  const date = new Date(value as string)
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0]
}
    // 🟢 Mapear os dados com os novos campos
 const registros = json.map(row => ({
  nome: (row['Colaborador'] || '').toString().trim(),
  nome_epi: (row['EPI'] || '').toString().trim(),
  status_geral: (row['Status Geral'] || '').toString().trim(),
  status_epi: (row['Status EPI'] || '').toString().trim(),
  proximo_fornecimento: parseData(row['Próximo Fornecimento']),
  cargo: (row['Cargo'] || '').toString().trim(),
  mes_proximo_fornecimento: (row['Mês'] || '').toString().trim(),
  loja: (row['Sigla'] || '').toString().trim(),
  consultor: (row['Consultor de Operações'] || '').toString().trim(),
}))

  // evitar duplicações: remover anteriores com mesmo nome + loja + consultor
  const nomes = registros.map(r => r.nome)
  const lojas = registros.map(r => r.loja)
  const consultores = registros.map(r => r.consultor)

  await supabase
    .from('assinaturas_epi')
    .delete()
    .in('nome', nomes)
    .in('loja', lojas)
    .in('consultor', consultores)

  const { error } = await supabase.from('assinaturas_epi').insert(registros)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: 'Importado com sucesso!', total: registros.length })
}