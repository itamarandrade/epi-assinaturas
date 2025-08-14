// Garante Node.js runtime (xlsx precisa de APIs de Node)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// (Opcional Vercel) export const maxDuration = 60

import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import crypto from 'crypto'
import { supabaseAdmin as supabase } from '@/lib/supabase'

function stripAccents(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
function normText(s?: any) {
  if (s === undefined || s === null) return ''
  return stripAccents(String(s)).replace(/\s+/g, ' ').trim()
}
function normHeader(s?: any) {
  return normText(s).toLowerCase().replace(/[^\w/]+/g, '_') // mantém "/"
}
function toIntOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = parseInt(String(v).replace(/\D+/g, ''), 10)
  return Number.isFinite(n) ? n : null
}
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n))

/**
 * Converte serial do Excel (base 1899-12-30) para {dateISO, timeISO}
 * - aceita number inteiro (só data), fracionário (só hora) ou ambos (data+hora)
 */
function fromExcelSerial(n: number): { dateISO: string | null; timeISO: string | null } {
  if (!Number.isFinite(n)) return { dateISO: null, timeISO: null }
  const days = Math.floor(n)
  const frac = n - days
  const base = Date.UTC(1899, 11, 30) // 1899-12-30
  const ms = base + days * 86400_000
  const d = new Date(ms)
  const dateISO = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`

  let timeISO: string | null = null
  if (frac > 0) {
    // arredonda para o segundo mais próximo
    let totalSec = Math.round(frac * 86400)
    if (totalSec >= 86400) totalSec = 86399
    const hh = Math.floor(totalSec / 3600)
    const mm = Math.floor((totalSec % 3600) / 60)
    const ss = totalSec % 60
    timeISO = `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`
  }
  return { dateISO, timeISO }
}

/** Aceita string/number => 'YYYY-MM-DD' (trata serial do Excel) */
function parseDateToISODate(input: any): string | null {
  if (input === undefined || input === null || input === '') return null
  if (typeof input === 'number') {
    // se vier com fração (ex.: 45785.5), pega só a data
    return fromExcelSerial(input).dateISO
  }
  const s = String(input).trim()
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/) // DD/MM/YYYY
  if (m1) {
    const dd = +m1[1], mm = +m1[2], yyyy = +(m1[3].length === 2 ? '20' + m1[3] : m1[3])
    return `${yyyy}-${pad2(mm)}-${pad2(dd)}`
  }
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+\d{2}:\d{2}(?::\d{2})?)?$/)
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  }
  // se vier string com número puro, tenta como serial do Excel
  const num = Number(s)
  if (Number.isFinite(num)) return fromExcelSerial(num).dateISO
  return null
}

/** Aceita string/number => 'HH:mm:ss' (trata fração de dia do Excel) */
function parseTimeToISOTime(input: any): string | null {
  if (input === undefined || input === null || input === '') return null
  if (typeof input === 'number') {
    // número Excel: 0..1 => fração do dia; >1 => usa apenas a parte fracionária
    const frac = input % 1
    if (frac <= 0) return '00:00:00'
    const totalSec = Math.round(frac * 86400)
    const hh = Math.floor(totalSec / 3600) % 24
    const mm = Math.floor((totalSec % 3600) / 60)
    const ss = totalSec % 60
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`
  }
  const s = String(input).trim()
  const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (m) {
    const hh = pad2(Math.min(23, +m[1]))
    const mm = pad2(Math.min(59, +m[2]))
    const ss = pad2(Math.min(59, +(m[3] || 0)))
    return `${hh}:${mm}:${ss}`
  }
  // string numérica => tenta como serial
  const num = Number(s)
  if (Number.isFinite(num)) return parseTimeToISOTime(num)
  return null
}

/** Junta data + hora com offset fixo -03:00 (America/Sao_Paulo) */
function makeTimestampTz(dateISO: string | null, timeISO: string | null): string | null {
  if (!dateISO && !timeISO) return null
  const date = dateISO ?? '1970-01-01'
  const time = timeISO ?? '00:00:00'
  return `${date}T${time}-03:00`
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Envie o arquivo no campo "file".' }, { status: 400 })

    const buf = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buf, { type: 'buffer' })

    // Aba preferida
    const wanted = wb.SheetNames.find(n => n.toLowerCase().includes('base 2025')) || wb.SheetNames[0]
    const ws = wb.Sheets[wanted]
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
    if (!rows.length) return NextResponse.json({ error: `A aba "${wanted}" não possui linhas.` }, { status: 400 })

    const headersOrig = Object.keys(rows[0])
    const headers = headersOrig.map(normHeader)

    const idx = (cands: string[]) => {
      for (const c of cands) {
        const i = headers.indexOf(c)
        if (i !== -1) return i
      }
      return -1
    }
    const pick = (row: any, i: number) => (i >= 0 ? row[headersOrig[i]] : '')

    // Mapa de colunas (sinônimos)
    const mapIdx = {
      data: idx(['data', 'data_evento', 'data_ocorrencia', 'dt']),
      horario: idx(['horario', 'hora', 'time']),
      unidade: idx(['unidade', 'loja', 'filial', 'site']),
      area: idx(['area', 'setor', 'departamento']),
      natureza_lesao: idx(['natureza_da_lesao', 'natureza_lesao', 'natureza', 'lesao']),
      ocorrencia: idx(['ocorrencia', 'tipo', 'categoria', 'evento']),
      descricao: idx(['descricao', 'observacao', 'detalhes']),
      nome: idx(['nome']),
      consultor: idx(['consultor']),
      data_admissao: idx(['data_admissao', 'data de admissao', 'admissao']),
      periodo: idx(['periodo']),
      dia_semana_txt: idx(['dia_semana', 'dia semana']),
      dias: idx(['dias', 'dias_']),
      meses: idx(['meses']),
      anos: idx(['anos']),
      // Novos campos
      operacao: idx(['operacao', 'operação']),
      estacao_maquina: idx(['estacao_maquina', 'estacao/maquina', 'estacao', 'estação', 'maquina', 'máquina', 'maquina_', 'máquina_']),
      situacao_geradora: idx(['situacao_geradora', 'situação_geradora', 'situacao geradora', 'situação geradora']),
      parte_corpo: idx(['parte_do_corpo', 'parte_corpo', 'parte do corpo', 'segmento_corporal', 'segmento corporal']),
      agente_causador: idx(['agente_causador', 'agente causador', 'agente']),
      dias_afastamento: idx(['dias_afastamento', 'dias de afastamento', 'dias afastamento']),
    }

    const batch: any[] = []
    for (const r of rows) {
      const rawData = pick(r, mapIdx.data)
      const rawHora = pick(r, mapIdx.horario)

      // trata data/hora como string ou número (Excel)
      let dataISO = parseDateToISODate(rawData)
      let horarioISO = parseTimeToISOTime(rawHora)

      // Se a data vier como serial com fração (ou horário vier vazio e a data tiver fração), tenta extrair hora da própria data
      if ((typeof rawData === 'number') && (rawData % 1 !== 0) && !horarioISO) {
        const t = fromExcelSerial(rawData).timeISO
        if (t) horarioISO = t
      }

      const ts = makeTimestampTz(dataISO, horarioISO)

      const unidade = normText(pick(r, mapIdx.unidade)) || null
      const area = normText(pick(r, mapIdx.area)) || null
      const natureza = normText(pick(r, mapIdx.natureza_lesao)) || null
      const ocorrencia = normText(pick(r, mapIdx.ocorrencia)) || null
      const descricao = String(pick(r, mapIdx.descricao) ?? '') || null
      const nome = normText(pick(r, mapIdx.nome)) || null
      const consultor = normText(pick(r, mapIdx.consultor)) || null
      const dataAdmissaoISO = parseDateToISODate(pick(r, mapIdx.data_admissao))
      const periodo = normText(pick(r, mapIdx.periodo)) || null
      const diaSemanaTxt = normText(pick(r, mapIdx.dia_semana_txt)) || null
      const dias = toIntOrNull(pick(r, mapIdx.dias))
      const meses = toIntOrNull(pick(r, mapIdx.meses))
      const anos = toIntOrNull(pick(r, mapIdx.anos))

      const operacao = normText(pick(r, mapIdx.operacao)) || null
      const estacao_maquina = normText(pick(r, mapIdx.estacao_maquina)) || null
      const situacao_geradora = normText(pick(r, mapIdx.situacao_geradora)) || null
      const parte_corpo = normText(pick(r, mapIdx.parte_corpo)) || null
      const agente_causador = normText(pick(r, mapIdx.agente_causador)) || null
      const dias_afastamento = toIntOrNull(pick(r, mapIdx.dias_afastamento))

      const key = [
        ts || '',
        unidade || '', area || '', natureza || '', ocorrencia || '', normText(descricao || ''),
        operacao || '', estacao_maquina || '', situacao_geradora || '', parte_corpo || '', agente_causador || '',
        (dias_afastamento ?? '').toString(),
      ].join('|').toUpperCase()
      const hash = crypto.createHash('sha256').update(key).digest('hex')

      batch.push({
        ocorrencia,
        data: dataISO,
        unidade,
        area,
        natureza_lesao: natureza,
        descricao,
        horario: horarioISO,
        nome,
        consultor,
        data_admissao: dataAdmissaoISO,
        periodo,
        dia_semana_txt: diaSemanaTxt,
        dias,
        meses,
        anos,
        operacao,
        estacao_maquina,
        situacao_geradora,
        parte_corpo,
        agente_causador,
        dias_afastamento,
        ts,
        hash,
      })
    }

    let ok = 0, fail = 0
    const errors: string[] = []
    const chunk = 800
    for (let i = 0; i < batch.length; i += chunk) {
      const part = batch.slice(i, i + chunk)
      const { error } = await supabase
        .from('ocorrencias')
        .upsert(part, { onConflict: 'hash', ignoreDuplicates: false })
      if (error) {
        fail += part.length
        errors.push(error.message || String(error))
      } else {
        ok += part.length
      }
    }

    const mapped: Record<string, string | null> = {}
    Object.entries(mapIdx).forEach(([k, i]) => {
      mapped[k] = i >= 0 ? headersOrig[i] : null
    })

    return NextResponse.json({
      sheet: wanted,
      total_rows: rows.length,
      inserted_or_updated: ok,
      failed: fail,
      mapped,
      sample_error: errors[0] || null,
    })
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 })
  }
}
