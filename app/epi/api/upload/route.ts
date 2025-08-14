import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/supabase';
import { ensureStatusKind } from '@/services/statusService';
import { ensureEpi } from '@/services/epiCatalogService';
import { upsertColaborador, findColaboradorId } from '@/services/colaboradorService';
import { upsertColaboradorEpi } from '@/services/colaboradorEpiService';

<<<<<<< HEAD
function parseDate(v: string | number | Date | null | undefined): string | null {
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
=======
type Row = Record<string, any>;

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
>>>>>>> e5a8b5a (epis ajustado e pagina de ocorrencias v1)
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

<<<<<<< HEAD
export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  // 1️⃣ obter o arquivo
  const form = await req.formData()
  const file = form.get('file') as File
  if (!file) {
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
=======
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
>>>>>>> e5a8b5a (epis ajustado e pagina de ocorrencias v1)
  }
  // abreviações PT-BR (jan, fev, mar, abr, mai, jun, jul, ago, set, out, nov, dez)
  const map: Record<string,string> = {jan:'01',fev:'02',mar:'03',abr:'04',mai:'05',jun:'06',jul:'07',ago:'08',set:'09',out:'10',nov:'11',dez:'12'};
  const m2 = s.toLowerCase().match(/^([a-zç]{3})[\/\s\-](\d{4})$/);
  if (m2 && map[m2[1]]) return `${m2[2]}-${map[m2[1]]}-01`;
  return null;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado (file)' }, { status: 400 });

    // cria job
    const jobIns = await supabaseAdmin.from('import_job')
      .insert({ filename: file.name, status: 'running' })
      .select('id')
      .single();
    if (jobIns.error) throw jobIns.error;
    const jobId = jobIns.data.id as number;

    // lê workbook
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: '' });

    // salva total
    await supabaseAdmin.from('import_job').update({ total_rows: rows.length }).eq('id', jobId);

    let ok = 0, err = 0, processed = 0;

    

// valores carregados do último não-vazio (forward-fill)
let carryNome = '';
let carryStatusGeral = '';
let carryConsultor = '';
let carryLoja = '';
let carryCargo = '';

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  processed++;

  // pega valores da linha
  let nome    = pick(r, HEADERS.nome);
  let loja    = pick(r, HEADERS.loja);
  let consultor = pick(r, HEADERS.consultor);
  let cargo   = pick(r, HEADERS.cargo);
  let statusGeralRaw = pick(r, HEADERS.status_geral);

  const epiNome = pick(r, HEADERS.epi_nome);
  const epiStatusRaw = pick(r, HEADERS.epi_status);
  const proxStr = pick(r, HEADERS.proximo_fornecimento);
  const mesStr  = pick(r, HEADERS.mes_proximo);

  // FORWARD-FILL: se veio vazio, usa o último
  if (!nome)        nome = carryNome;
  else              carryNome = nome;

  if (!statusGeralRaw) statusGeralRaw = carryStatusGeral;
  else                 carryStatusGeral = statusGeralRaw;

  if (!consultor)   consultor = carryConsultor;
  else              carryConsultor = consultor;

  if (!loja)        loja = carryLoja;
  else              carryLoja = loja;

  if (!cargo)       cargo = carryCargo;
  else              carryCargo = cargo;

  // datas
  let proximo = toISODate(proxStr);
  if (!proximo) {
    const firstDay = firstDayFromMonthText(mesStr);
    if (firstDay) proximo = firstDay;
  }

  // valida mínimo (nome pode estar vindo só por carry)
  if (!nome || !epiNome || !epiStatusRaw) {
    err++;
    await supabaseAdmin.from('import_item').insert({
      job_id: jobId, row_number: i+1, status: 'error',
      message: 'Campos obrigatórios ausentes (Colaborador, EPI, Status EPI)',
      colaborador: nome || '', loja, consultor,
      epi_nome: epiNome || '', epi_status_raw: epiStatusRaw || '',
      status_geral_raw: statusGeralRaw || ''
    });
    await supabaseAdmin.from('import_job').update({ processed, ok_count: ok, error_count: err }).eq('id', jobId);
    continue;
  }

  try {
    const statusGeralId = statusGeralRaw ? await ensureStatusKind('geral', statusGeralRaw) : null;
    const statusEpiId   = await ensureStatusKind('epi', epiStatusRaw);

    // tenta achar colaborador; se não existir, cria
    let colabId = await findColaboradorId(nome, loja || null, consultor || null);
    if (!colabId) {
      colabId = await upsertColaborador({
        nome, loja, consultor,
        status_geral_id: statusGeralId,
        data_status: proximo ? proximo : null, // se quiser outra coluna de data status, troque aqui
        data_admissao: null
      });
    } else if (statusGeralId) {
      await supabaseAdmin.from('colaborador')
        .update({ status_geral_id: statusGeralId })
        .eq('id', colabId);
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
      colaborador: nome, loja, consultor,
      epi_nome: epiNome, epi_status_raw: epiStatusRaw, status_geral_raw: statusGeralRaw
    });
  } catch (e: any) {
    err++;
    await supabaseAdmin.from('import_item').insert({
      job_id: jobId, row_number: i+1, status: 'error',
      message: e?.message || 'Erro ao importar linha',
      colaborador: nome, loja, consultor,
      epi_nome: epiNome, epi_status_raw: epiStatusRaw, status_geral_raw: statusGeralRaw
    });
  }

  await supabaseAdmin.from('import_job').update({
    processed, ok_count: ok, error_count: err
  }).eq('id', jobId);
}


    await supabaseAdmin.from('import_job').update({
      status: 'done', finished_at: new Date().toISOString()
    }).eq('id', jobId);

    return NextResponse.json({ jobId });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Erro no import' }, { status: 500 });
  }
}
