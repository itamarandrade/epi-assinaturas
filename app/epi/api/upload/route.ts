import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // chave de serviço para backend
)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'buffer' })
  const sheet = workbook.Sheets['organizar'] || workbook.Sheets['ORGANIZAR']

  if (!sheet) return NextResponse.json({ error: 'Aba "organizar" não encontrada' }, { status: 400 })

  const json = XLSX.utils.sheet_to_json(sheet) as any[]

  const registros = json.map(row => ({
    nome: row['nome']?.trim() || '',
    status: row['status']?.trim() || '',
    loja: row['lojas']?.trim() || '',
    consultor: row['consultor']?.trim() || ''
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