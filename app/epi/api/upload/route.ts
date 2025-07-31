import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { SSF } from 'xlsx'
import path from 'path'
import { mkdir, writeFile, access, readFile } from 'fs/promises'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function parseDate(v: any): string | null {
  if (!v) return null
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? null : v.toISOString().split('T')[0]
  }
  // agora: usa o parser interno do xlsx para número serial
  if (typeof v === 'number') {
    const o = SSF.parse_date_code(v)
    if (o && o.y) {
      const d = new Date(o.y, o.m - 1, o.d)
      return d.toISOString().split('T')[0]
    }
    return null
  }
  if (typeof v === 'string') {
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
  }
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
}

function sanitizeFilename(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
}

export async function POST(req: NextRequest) {
  // 1️⃣ obter o arquivo
  const form = await req.formData()
  const file = form.get('file') as File
  if (!file) {
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
  }

  // 2️⃣ preparar pasta e nome seguro
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })
  const safeName = sanitizeFilename(file.name)
  const filename = `${Date.now()}_${safeName}`
  const uploadPath = path.join(uploadDir, filename)

  // 3️⃣ salvar o buffer em disco
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(uploadPath, buffer)

  // 4️⃣ verificar se o arquivo foi salvo
  try {
    await access(uploadPath)
    console.log('✅ Arquivo salvo em disco:', uploadPath)
  } catch (err) {
    console.error('❌ Não foi possível acessar o arquivo salvo:', uploadPath, err)
    return NextResponse.json({ error: 'Falha ao acessar o arquivo em disco' }, { status: 500 })
  }

  // 5️⃣ ler o arquivo do disco como buffer
  const fileBuffer = await readFile(uploadPath)

  // 6️⃣ parse do Excel
  const wb = XLSX.read(fileBuffer, {
    type: 'buffer',
    cellDates: true,
    dateNF: 'yyyy-mm-dd'
  })
  const sheetName = wb.SheetNames.find(n => ['organizar','ORGANIZAR'].includes(n)) 
                     || wb.SheetNames[0]
  const sheet = wb.Sheets[sheetName]
  if (!sheet) {
    return NextResponse.json({ error: `Aba "${sheetName}" não encontrada` }, { status: 400 })
  }

  // 7️⃣ “Desmesclar” e propagar valores de merges
  const merges = sheet['!merges'] || []
  merges.forEach(merge => {
    const startAddr = XLSX.utils.encode_cell(merge.s)
    const value = sheet[startAddr]?.v
    for (let R = merge.s.r; R <= merge.e.r; ++R) {
      for (let C = merge.s.c; C <= merge.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        if (!sheet[addr]) {
          sheet[addr] = { t: 's', v: value }
        }
      }
    }
  })
  // opcional: evita que o sheet_to_json gere erros com merges
  delete sheet['!merges']

  // 8️⃣ converter em JSON já com defval null
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    raw: true,
    defval: null,
    
  })
  if (!rows.length) {
    return NextResponse.json({ error: 'Planilha sem dados' }, { status: 400 })
  }

  // 9️⃣ “Fill down” em campos mesclados restantes
  let lastNome = '', lastLoja = '', lastConsultor = '', lastCargo = '', lastMes = ''
  rows.forEach(r => {
    if (r['Colaborador'])            lastNome = r['Colaborador']
    else                              r['Colaborador'] = lastNome

    if (r['Sigla'])                  lastLoja = r['Sigla']
    else                              r['Sigla'] = lastLoja

    if (r['Consultor de Operações']) lastConsultor = r['Consultor de Operações']
    else                              r['Consultor de Operações'] = lastConsultor

    if (r['Cargo'])                  lastCargo = r['Cargo']
    else                              r['Cargo'] = lastCargo

    if (r['Mês'])                    lastMes = r['Mês']
    else                              r['Mês'] = lastMes
  })

  // 10️⃣ valida campos obrigatórios
  const faltam = rows.some(r =>
    !r['Colaborador'] || !r['Sigla'] || !r['EPI']
  )
  if (faltam) {
    return NextResponse.json({
      error: 'Existem linhas sem Colaborador, Sigla ou EPI.'
    }, { status: 400 })
  }

  // 11️⃣ agrupa EPIs por colaborador
  type Epi = {
    nome_epi: string
    status_epi: string
    status: string
    proximo_fornecimento: string | null
    mes_fornecimento: string
  }
  type ColabRaw = {
    nome: string
    cargo: string
    loja: string
    consultor: string
    epis: Epi[]
  }
  const mapa = new Map<string, ColabRaw>()
  rows.forEach(r => {
    const nome      = String(r['Colaborador']).trim()
    const loja      = String(r['Sigla']).trim()
    const consultor = String(r['Consultor de Operações'] || '').trim()
    const cargo     = String(r['Cargo'] || '').trim()
    const key       = `${nome}|${loja}|${consultor}`

    if (!mapa.has(key)) {
      mapa.set(key, { nome, cargo, loja, consultor, epis: [] })
    }

    mapa.get(key)!.epis.push({
      nome_epi: String(r['EPI'] || '').trim(),
      status_epi: String(r['Status EPI'] || '').trim(),
      status: String(r['Status Geral'] || r['Status'] || '').trim() || 'EM DIA',
      proximo_fornecimento: parseDate(r['Próximo Fornecimento']),
      mes_fornecimento: String(r['Mês']).trim(),
    })
  })

  // 12️⃣ adiciona status agregado
  const colaboradores = Array.from(mapa.values()).map(col => {
    const s = col.epis.map(e => e.status.toUpperCase())
    const status = s.includes('VENCIDO')
      ? 'VENCIDO'
      : s.includes('PENDENTE')
        ? 'PENDENTE'
        : 'EM DIA'
    return { ...col, status }
  })

  // 13️⃣ upsert no Supabase
  const { error } = await supabase
    .from('assinaturas_epi')
    .upsert(colaboradores, { onConflict: 'nome,loja,consultor' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Importação concluída',
    file: filename,
    total: colaboradores.length
  })
}
