import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/supabase';
import { ensureStatusKind } from '@/services/statusService';
import { ensureEpi } from '@/services/epiCatalogService';
import { upsertColaborador, findColaboradorId } from '@/services/colaboradorService';
import { upsertColaboradorEpi } from '@/services/colaboradorEpiService';

// cabeçalhos flexíveis (alias -> campo interno)
const HEADERS = {
  nome: ['Colaborador'],                   // nome do funcionário (mesclado)
  epi_nome: ['EPI'],                       // nome do equipamento
  status_geral: ['Status Geral'],          // status do colaborador
  proximo_fornecimento: ['Próximo Fornecimento'],
  mes_proximo: ['Mês Próximo Fornecimento'],
  epi_status: ['Status EPI'],              // status do EPI
  consultor: ['Consultor de Operações'],   // consultor
  loja: ['Sigla'],                         // loja
  cargo: ['Cargo'],                        // cargo (opcional)
};

function pick(row: Record<string, any>, keys: string[]) {
  for (const k of keys) if (row[k] != null && row[k] !== '') return String(row[k]);
  return '';
}

function toISODate(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v as any)) {
    return v.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return null;
  // tenta dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const d = Number(m[1]), mo = Number(m[2]) - 1, y = Number(m[3].length === 2 ? '20'+m[3] : m[3]);
    const dt = new Date(Date.UTC(y, mo, d));
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0,10);
  }
  // tenta yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function firstDayFromMonthText(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // aceita 'YYYY-MM', 'MM/YYYY', 'MMM/YYYY'
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (m1) {
    const mo = ('0' + m1[1]).slice(0,2);
    return `${m1[2]}-${mo.padStart(2,'0')}-01`;
  }
  // abreviações PT-BR (jan, fev, mar, abr, mai, jun, jul, ago, set, out, nov, dez)
  const map: Record<string,string> = {jan:'01',fev:'02',mar:'03',abr:'04',mai:'05',jun:'06',jul:'07',ago:'08',set:'09',out:'10',nov:'11',dez:'12'};
  const m2 = s.toLowerCase().match(/^([a-zç]{3})[\/\s\-](\d{4})$/);
  if (m2 && map[m2[1]]) return `${m2[2]}-${map[m2[1]]}-01`;
  return null;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const jobId = Number(url.searchParams.get('jobId'));
    if (!jobId) return NextResponse.json({ error: 'jobId ausente' }, { status: 400 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });

    // marca início / zera contadores
    await supabaseAdmin.from('import_job')
      .update({ filename: file.name, processed: 0, ok_count: 0, error_count: 0, status: 'running' })
      .eq('id', jobId);

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

    await supabaseAdmin.from('import_job').update({ total_rows: rows.length }).eq('id', jobId);

    let ok = 0, err = 0, processed = 0;

    // forward-fill
    let carryNome = '', carryStatusGeral = '', carryConsultor = '', carryLoja = '', carryCargo = '';

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      processed++;

      let nome      = pick(r, ['Colaborador']) || carryNome;
      let loja      = pick(r, ['Sigla']) || carryLoja;
      let consultor = pick(r, ['Consultor de Operações']) || carryConsultor;
      let cargo     = pick(r, ['Cargo']) || carryCargo;
      let statusGeralRaw = pick(r, ['Status Geral']) || carryStatusGeral;

      if (pick(r, ['Colaborador'])) carryNome = nome;
      if (pick(r, ['Sigla'])) carryLoja = loja;
      if (pick(r, ['Consultor de Operações'])) carryConsultor = consultor;
      if (pick(r, ['Cargo'])) carryCargo = cargo;
      if (pick(r, ['Status Geral'])) carryStatusGeral = statusGeralRaw;

      const epiNome = pick(r, ['EPI']);
      const epiStatusRaw = pick(r, ['Status EPI']);
      const proxStr = pick(r, ['Próximo Fornecimento']);
      const mesStr  = pick(r, ['Mês Próximo Fornecimento']);

      let proximo = toISODate(proxStr);
      if (!proximo) {
        const m = firstDayFromMonthText(mesStr);
        if (m) proximo = m;
      }

      if (!nome || !epiNome || !epiStatusRaw) {
        err++;
        await supabaseAdmin.from('import_item').insert({
          job_id: jobId, row_number: i+1, status: 'error',
          message: 'Campos obrigatórios ausentes (Colaborador, EPI, Status EPI)',
          colaborador: nome || '', loja, consultor,
          epi_nome: epiNome || '', epi_status_raw: epiStatusRaw || '', status_geral_raw: statusGeralRaw || ''
        });
        await supabaseAdmin.from('import_job').update({ processed, ok_count: ok, error_count: err }).eq('id', jobId);
        continue;
      }

      try {
        const statusGeralId = statusGeralRaw ? await ensureStatusKind('geral', statusGeralRaw) : null;
        const statusEpiId   = await ensureStatusKind('epi', epiStatusRaw);

        let colabId = await findColaboradorId(nome, loja || null, consultor || null);
        if (!colabId) {
          colabId = await upsertColaborador({
            nome, loja, consultor, status_geral_id: statusGeralId, data_status: null, data_admissao: null
          });
        } else if (statusGeralId) {
          await supabaseAdmin.from('colaborador').update({ status_geral_id: statusGeralId }).eq('id', colabId);
        }

        const epiId = await ensureEpi(epiNome);

        await upsertColaboradorEpi({
          colaborador_id: colabId!,
          epi_id: epiId,
          status_epi_id: statusEpiId,
          proximo_fornecimento: proximo
        });

        ok++;
        await supabaseAdmin.from('import_item').insert({
          job_id: jobId, row_number: i+1, status: 'ok',
          colaborador: nome, loja, consultor, epi_nome: epiNome, epi_status_raw: epiStatusRaw, status_geral_raw: statusGeralRaw
        });
      } catch (e: any) {
        err++;
        await supabaseAdmin.from('import_item').insert({
          job_id: jobId, row_number: i+1, status: 'error',
          message: e?.message || 'Erro ao importar linha',
          colaborador: nome, loja, consultor, epi_nome: epiNome, epi_status_raw: epiStatusRaw, status_geral_raw: statusGeralRaw
        });
      }

      await supabaseAdmin.from('import_job').update({
        processed, ok_count: ok, error_count: err
      }).eq('id', jobId);
    }

    await supabaseAdmin.from('import_job')
      .update({ status: 'done', finished_at: new Date().toISOString() })
      .eq('id', jobId);

    return NextResponse.json({ ok, err, processed });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Erro no import' }, { status: 500 });
  }
}
