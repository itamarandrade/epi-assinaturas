// 'use client';

// import { useState } from 'react';
// import * as XLSX from 'xlsx';
// import { supabaseAdmin } from '@/lib/supabase'; // <-- client (anon key)

// type PreviewRow = {
//   row: number;
//   status: 'ok' | 'error';
//   msg?: string;
//   colaborador?: string;
//   loja?: string;
//   consultor?: string;
//   epi?: string;
//   statusEpi?: string;
//   statusGeral?: string;
// };
// const GREY = '#E5E7EB';

// const PAGE = 1000; // paginação para carregar TODAS as linhas das tabelas


// const norm = (s: string) =>
//   (s || '')
//     .normalize('NFD')
//     .replace(/[\u0300-\u036f]/g, '')
//     .trim()
//     .toUpperCase()
//     .replace(/\s+/g, '_');

// function clean(v?: string | null) {
//   const s = (v ?? '').toString().trim();
//   return s.length ? s : null;
// }

// function toISODate(v: any): string | null {
//   if (!v) return null;
//   if (v instanceof Date && !isNaN(v as any)) return v.toISOString().slice(0, 10);
//   const s = String(v).trim();
//   const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
//   if (m) {
//     const d = +m[1],
//       mo = +m[2] - 1,
//       y = m[3].length === 2 ? +('20' + m[3]) : +m[3];
//     const dt = new Date(Date.UTC(y, mo, d));
//     return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
//   }
//   if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
//   return null;
// }
// function firstDayFromMonthText(v: any): string | null {
//   if (!v) return null;
//   const s = String(v).trim();
//   if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
//   const m1 = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
//   if (m1) return `${m1[2]}-${String(m1[1]).padStart(2, '0')}-01`;
//   const map: Record<string, string> = {
//     jan: '01',
//     fev: '02',
//     mar: '03',
//     abr: '04',
//     mai: '05',
//     jun: '06',
//     jul: '07',
//     ago: '08',
//     set: '09',
//     out: '10',
//     nov: '11',
//     dez: '12',
//   };
//   const m2 = s.toLowerCase().match(/^([a-zç]{3})[\/\s\-](\d{4})$/);
//   if (m2 && map[m2[1]]) return `${m2[2]}-${map[m2[1]]}-01`;
//   return null;
// }

// /** SELECT helper: sempre retorna array (nunca null) e propaga erro legível */
// async function runArr<T>(
//   p: PromiseLike<{ data: T[] | null; error: any }> | Promise<{ data: T[] | null; error: any }>,
//   label: string
// ): Promise<T[]> {
//   const { data, error } = (await p) as any;
//   if (error) throw new Error(`${label}: ${error.message || error}`);
//   return data ?? [];
// }
// /** UPSERT/UPDATE/INSERT helper: só valida erro (sem precisar do retorno) */
// async function runExec(
//   p: PromiseLike<{ data: any; error: any }> | Promise<{ data: any; error: any }>,
//   label: string
// ): Promise<void> {
//   const { error } = (await p) as any;
//   if (error) throw new Error(`${label}: ${error.message || error}`);
// }

// export default function EpiUploadPage() {
//   const [file, setFile] = useState<File | null>(null);
//   const [parsingPct, setParsingPct] = useState(0);
//   const [writingPct, setWritingPct] = useState(0);
//   const [running, setRunning] = useState(false);
//   const [rowsLog, setRowsLog] = useState<PreviewRow[]>([]);
//   const [summary, setSummary] = useState<{ ok: number; errors: number; total: number } | null>(null);

//   async function handleImport(e: React.FormEvent) {
//     e.preventDefault();
//     if (!file) return;

//     try {
//       setRunning(true);
//       setParsingPct(0);
//       setWritingPct(0);
//       setRowsLog([]);
//       setSummary(null);

//       // 1) Ler planilha
//       const buf = await file.arrayBuffer();
//       const wb = XLSX.read(buf, { cellDates: true });
//       const ws = wb.Sheets[wb.SheetNames[0]];
//       const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
//       const TOTAL = rows.length;

//       // 2) Pré-carregar catálogos (listas)
//       const [gKinds, eKinds, epiCat, colabs] = await Promise.all([
//         runArr<{ id: number; name: string }>(supabaseAdmin.from('status_geral_kind').select('id,name'), 'select status_geral_kind'),
//         runArr<{ id: number; name: string }>(supabaseAdmin.from('status_epi_kind').select('id,name'), 'select status_epi_kind'),
//         runArr<{ id: number; nome: string }>(supabaseAdmin.from('epi_item').select('id,nome'), 'select epi_item'),
//         runArr<{ id: number; nome: string; loja: string | null; consultor: string | null }>(
//           supabaseAdmin.from('colaborador').select('id,nome,loja,consultor'),
//           'select colaborador'
//         ),
//       ]);

//       const mapG = new Map<string, number>(gKinds.map((r) => [r.name.toUpperCase(), r.id]));
//       const mapE = new Map<string, number>(eKinds.map((r) => [r.name.toUpperCase(), r.id]));
//       const mapItem = new Map<string, number>(epiCat.map((r) => [r.nome.toUpperCase(), r.id]));
//       const mapCol = new Map<string, number>(colabs.map((r) => [`${r.nome}||${r.loja || ''}||${r.consultor || ''}`, r.id]));

//       // 3) Coletores
//       const novosStatusG = new Map<string, { name: string; severity: number; color_hex: string; is_apt: boolean }>();
//       const novosStatusE = new Map<string, { name: string; severity: number; color_hex: string }>();
//       const novosEpis = new Set<string>();
//       const novosColabs: Array<{ nome: string; loja: string | null; consultor: string | null }> = [];
//       const parsed: Array<{
//         nome: string;
//         loja: string | null;
//         consultor: string | null;
//         epiUpper: string;
//         statusEpiName: string;
//         proximo: string | null;
//         statusGeralName: string | null; // <-- NOVO

//       }> = [];
//       const logs: PreviewRow[] = [];

//       // forward-fill
//       let carryNome = '',
//         carryLoja = '',
//         carryConsultor = '',
//         carryStatusGeral = '';
//       const newColabKeys = new Set<string>();

//       // 4) Parse
//       for (let i = 0; i < TOTAL; i++) {
//         const r = rows[i];

//         const nomeFF = r['Colaborador'] || carryNome;
//         const lojaFF = r['Sigla'] || carryLoja;
//         const consultorFF = r['Consultor de Operações'] || carryConsultor;
//         const statusGeralRawFF = r['Status Geral'] || carryStatusGeral;

//         if (r['Colaborador']) carryNome = r['Colaborador'];
//         if (r['Sigla']) carryLoja = r['Sigla'];
//         if (r['Consultor de Operações']) carryConsultor = r['Consultor de Operações'];
//         if (r['Status Geral']) carryStatusGeral = r['Status Geral'];

//         const epiNome = String(r['EPI'] || '');
//         const statusEpiName = String(r['Status EPI'] || '');
//         const d1 = toISODate(r['Próximo Fornecimento']);
//         const d2 = firstDayFromMonthText(r['Mês Próximo Fornecimento']);
//         const proximo = d1 || d2;

//         const nome = clean(nomeFF);
//         const loja = clean(lojaFF);
//         const consultor = clean(consultorFF);

//         if (!nome || !epiNome || !statusEpiName) {
//           logs.push({
//             row: i + 1,
//             status: 'error',
//             msg: 'Faltando Colaborador/EPI/Status EPI',
//             colaborador: nome || '',
//             loja: loja || '',
//             consultor: consultor || '',
//             epi: epiNome,
//             statusEpi: statusEpiName,
//             statusGeral: statusGeralRawFF || '',
//           });
//         } else {
//           // status geral (catálogo se não existir)
//           if (statusGeralRawFF) {
//             const key = statusGeralRawFF.toUpperCase();
//             if (!mapG.has(key) && !novosStatusG.has(key)) {
//               const sev = key.includes('VENCID') ? 10 : key.includes('PENDEN') ? 50 : 100;
//               const col = key.includes('VENCID') ? '#ef4444' : key.includes('PENDEN') ? '#facc15' : '#22c55e';
//               const apt = !(key.includes('VENCID') || key.includes('PENDEN'));
//               novosStatusG.set(key, { name: statusGeralRawFF, severity: sev, color_hex: col, is_apt: apt });
//             }
//           }

//           // status EPI catálogo
//           const keyE = statusEpiName.toUpperCase();
//           if (!mapE.has(keyE) && !novosStatusE.has(keyE)) {
//             const sev = keyE.includes('VENCID') ? 10 : keyE.includes('PENDEN') ? 50 : keyE.includes('FUTUR') ? 60 : 100;
//             const col = keyE.includes('VENCID') ? '#ef4444' : keyE.includes('PENDEN') ? '#facc15' : keyE.includes('FUTUR') ? '#60a5fa' : '#22c55e';
//             novosStatusE.set(keyE, { name: statusEpiName, severity: sev, color_hex: col });
//           }

//           // EPI catálogo
//           const epiUpper = epiNome.toUpperCase();
//           if (!mapItem.has(epiUpper)) novosEpis.add(epiUpper);

//           // colaborador (dedupe no parse)
//           const k = `${nome}||${loja || ''}||${consultor || ''}`;
//           if (!mapCol.has(k) && !newColabKeys.has(k)) {
//             novosColabs.push({ nome, loja, consultor });
//             newColabKeys.add(k);
//           }

//           parsed.push({ 
//             nome, 
//             loja, 
//             consultor, 
//             epiUpper, 
//             statusEpiName, 
//             proximo: proximo || null,
//             statusGeralName: statusGeralRawFF ? String(statusGeralRawFF) : null, // <-- NOVO
//           });

//           logs.push({
//             row: i + 1,
//             status: 'ok',
//             colaborador: nome,
//             loja: loja || '',
//             consultor: consultor || '',
//             epi: epiNome,
//             statusEpi: statusEpiName,
//             statusGeral: statusGeralRawFF || '',
//           });
//         }

//         if ((i + 1) % 200 === 0 || i + 1 === TOTAL) setParsingPct(Math.round(((i + 1) / TOTAL) * 100));
//       }

//       // 5) Escritas em lote

//       // 5.1 status (upsert por NAME)
//       if (novosStatusG.size) {
//         await runExec(
//           supabaseAdmin
//             .from('status_geral_kind')
//             .upsert(
//               Array.from(novosStatusG.values()).map((v) => ({
//                 name: v.name,
//                 severity: v.severity,
//                 color_hex: v.color_hex,
//                 is_apt: v.is_apt,
//               })),
//               { onConflict: 'name' }
//             ),
//           'upsert status_geral_kind'
//         );
//         const data = await runArr<{ id: number; name: string }>(
//           supabaseAdmin.from('status_geral_kind').select('id,name'),
//           'reload status_geral_kind'
//         );
//         data.forEach((r) => mapG.set(r.name.toUpperCase(), r.id));
//       }
//       setWritingPct(20);

//       if (novosStatusE.size) {
//         await runExec(
//           supabaseAdmin
//             .from('status_epi_kind')
//             .upsert(
//               Array.from(novosStatusE.values()).map((v) => ({
//                 name: v.name,
//                 severity: v.severity,
//                 color_hex: v.color_hex,
//               })),
//               { onConflict: 'name' }
//             ),
//           'upsert status_epi_kind'
//         );
//         const data = await runArr<{ id: number; name: string }>(
//           supabaseAdmin.from('status_epi_kind').select('id,name'),
//           'reload status_epi_kind'
//         );
//         data.forEach((r) => mapE.set(r.name.toUpperCase(), r.id));
//       }
//       setWritingPct(40);

//       // 5.2 EPIs
//       if (novosEpis.size) {
//         await runExec(
//           supabaseAdmin
//             .from('epi_item')
//             .upsert(Array.from(novosEpis.values()).map((n) => ({ nome: n })), { onConflict: 'nome' }),
//           'upsert epi_item'
//         );
//         const data = await runArr<{ id: number; nome: string }>(
//           supabaseAdmin.from('epi_item').select('id,nome'),
//           'reload epi_item'
//         );
//         data.forEach((r) => mapItem.set(r.nome.toUpperCase(), r.id));
//       }
//       setWritingPct(60);

//       // 5.3 Colaboradores (dedupe de segurança + ignoreDuplicates)
//       if (novosColabs.length) {
//         const uniqueColabsMap = new Map<string, { nome: string; loja: string | null; consultor: string | null }>();
//         for (const c of novosColabs) {
//           const k = `${c.nome}||${c.loja || ''}||${c.consultor || ''}`;
//           if (!uniqueColabsMap.has(k)) uniqueColabsMap.set(k, c);
//         }
//         const uniqueColabs = Array.from(uniqueColabsMap.values());
//         await runExec(
//           supabaseAdmin.from('colaborador').upsert(uniqueColabs, { onConflict: 'nome,loja,consultor', ignoreDuplicates: true }),
//           'upsert colaborador'
//         );
//         const data = await runArr<{ id: number; nome: string; loja: string | null; consultor: string | null }>(
//           supabaseAdmin.from('colaborador').select('id,nome,loja,consultor'),
//           'reload colaborador'
//         );
//         data.forEach((r) => mapCol.set(`${r.nome}||${r.loja || ''}||${r.consultor || ''}`, r.id));
//       }
//       // colabId -> statusId (dedupe por colaborador)
//       const desired = new Map<number, number>();
//       for (const p of parsed) {
//         if (!p.statusGeralName) continue;
//         const key = `${p.nome}||${p.loja || ''}||${p.consultor || ''}`;
//         const colabId = mapCol.get(key);
//         const statusId = mapG.get(p.statusGeralName.toUpperCase());
//         if (colabId && statusId) desired.set(colabId, statusId); // última ocorrência vence
//       }
//       // atualiza em lotes (updates individuais para não dar conflito de upsert)
//       const updates = Array.from(desired.entries()).map(([id, statusId]) => ({ id, statusId }));
//       const BATCH_UPD = 300;
//       for (let i = 0; i < updates.length; i += BATCH_UPD) {
//         const slice = updates.slice(i, i + BATCH_UPD);
//         await Promise.all(
//           slice.map((u) =>
//             runExec(
//               supabaseAdmin.from('colaborador').update({ status_geral_id: u.statusId }).eq('id', u.id),
//               `update colaborador status_geral_id (id=${u.id})`
//             )
//           )
//         );
//       }
//       setWritingPct(80);

//       // 5.4 Vínculos (dedupe (colab, epi) para evitar double-update no mesmo upsert)
//       const linkMap = new Map<
//         string,
//         { colaborador_id: number; epi_id: number; status_epi_id: number; proximo_fornecimento: string | null; ativo: boolean }
//       >();
//       for (const p of parsed) {
//         const key = `${p.nome}||${p.loja || ''}||${p.consultor || ''}`;
//         const colabId = mapCol.get(key);
//         const epiId = mapItem.get(p.epiUpper);
//         const statusId = mapE.get(p.statusEpiName.toUpperCase());
//         if (!colabId || !epiId || !statusId) continue;

//         const pairKey = `${colabId}|${epiId}`;
//         const current = linkMap.get(pairKey);
//         if (!current) {
//           linkMap.set(pairKey, {
//             colaborador_id: colabId,
//             epi_id: epiId,
//             status_epi_id: statusId,
//             proximo_fornecimento: p.proximo,
//             ativo: true,
//           });
//         } else {
//           // regra simples: mantém o proximo_fornecimento mais “novo” se existir
//           const a = current.proximo_fornecimento;
//           const b = p.proximo;
//           const newer =
//             a && b ? (a > b ? a : b) : a || b || null; // comparação de strings YYYY-MM-DD funciona
//           linkMap.set(pairKey, {
//             colaborador_id: colabId,
//             epi_id: epiId,
//             status_epi_id: statusId, // último status vence
//             proximo_fornecimento: newer,
//             ativo: true,
//           });
//         }
//       }
//       const vincRows = Array.from(linkMap.values());

//       const BATCH = 1000;
//       for (let i = 0; i < vincRows.length; i += BATCH) {
//         await runExec(
//           supabaseAdmin.from('colaborador_epi').upsert(vincRows.slice(i, i + BATCH), {
//             onConflict: 'colaborador_id,epi_id',
//           }),
//           `upsert colaborador_epi (${i}/${vincRows.length})`
//         );
//       }
//       setWritingPct(100);

//       // 6) Final
//       const ok = logs.filter((l) => l.status === 'ok').length;
//       const errors = logs.length - ok;
//       setSummary({ ok, errors, total: logs.length });
//       setRowsLog(logs);
//       setRunning(false);
//     } catch (err: any) {
//       setRunning(false);
//       alert(err.message || 'Erro no import');
//       console.error(err);
//     }
//   }

//   return (
//     <div className="p-6 max-w-6xl mx-auto space-y-6">
//       <h1 className="text-2xl font-bold">Importar EPIs (sem log em banco)</h1>

//       <form onSubmit={handleImport} className="bg-white rounded shadow p-4 flex flex-wrap gap-4 items-end">
//         <div className="flex flex-col">
//           <label className="text-sm font-medium">Arquivo (.xlsx)</label>
//         <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="border px-3 py-2 rounded" />
//         </div>
//         <button disabled={!file || running} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
//           {running ? 'Processando...' : 'Importar'}
//         </button>
//       </form>

//       {/* Progresso */}
//       {running && (
//         <div className="bg-white rounded shadow p-4 space-y-3">
//           <div>
//             <div className="text-sm text-gray-600 mb-1">Leitura da planilha</div>
//             <div className="w-full bg-gray-200 h-2 rounded">
//               <div className="h-2 bg-indigo-600 rounded" style={{ width: `${parsingPct}%` }} />
//             </div>
//             <div className="text-right text-xs mt-1">{parsingPct}%</div>
//           </div>
//           <div>
//             <div className="text-sm text-gray-600 mb-1">Gravação no banco</div>
//             <div className="w-full bg-gray-200 h-2 rounded">
//               <div className="h-2 bg-green-600 rounded" style={{ width: `${writingPct}%` }} />
//             </div>
//             <div className="text-right text-xs mt-1">{writingPct}%</div>
//           </div>
//         </div>
//       )}

//       {/* Resumo */}
//       {summary && (
//         <div className="bg-white rounded shadow p-4">
//           <div className="text-sm">
//             Total: <strong>{summary.total}</strong> • OK:{' '}
//             <strong className="text-green-600">{summary.ok}</strong> • Erros:{' '}
//             <strong className="text-red-600">{summary.errors}</strong>
//           </div>
//         </div>
//       )}

//       {/* Lista (somente em memória) */}
//       {rowsLog.length > 0 && (
//         <div className="bg-white rounded shadow p-4">
//           <h3 className="font-semibold mb-3">Resultado (não persiste no banco)</h3>
//           <div className="overflow-auto max-h-[48rem]">
//             <table className="min-w-full text-sm border">
//               <thead className="bg-gray-100">
//                 <tr>
//                   <th className="px-2 py-1 border text-right">#</th>
//                   <th className="px-2 py-1 border">Status</th>
//                   <th className="px-2 py-1 border">Mensagem</th>
//                   <th className="px-2 py-1 border">Colaborador</th>
//                   <th className="px-2 py-1 border">Loja</th>
//                   <th className="px-2 py-1 border">Consultor</th>
//                   <th className="px-2 py-1 border">EPI</th>
//                   <th className="px-2 py-1 border">Status EPI</th>
//                   <th className="px-2 py-1 border">Status Geral</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {rowsLog.map((l, i) => (
//                   <tr key={i} className="hover:bg-gray-50">
//                     <td className="px-2 py-1 border text-right">{l.row}</td>
//                     <td className="px-2 py-1 border">
//                       {l.status === 'ok' ? (
//                         <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
//                       ) : (
//                         <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Erro</span>
//                       )}
//                     </td>
//                     <td className="px-2 py-1 border">{l.msg || ''}</td>
//                     <td className="px-2 py-1 border">{l.colaborador || ''}</td>
//                     <td className="px-2 py-1 border">{l.loja || ''}</td>
//                     <td className="px-2 py-1 border">{l.consultor || ''}</td>
//                     <td className="px-2 py-1 border">{l.epi || ''}</td>
//                     <td className="px-2 py-1 border">{l.statusEpi || ''}</td>
//                     <td className="px-2 py-1 border">{l.statusGeral || ''}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/lib/supabase'; // client (anon)

type PreviewRow = {
  row: number;
  status: 'ok' | 'error';
  msg?: string;
  colaborador?: string;
  loja?: string;
  consultor?: string;
  epi?: string;
  statusEpi?: string;
  statusGeral?: string;
};

const GREY = '#E5E7EB';

const PAGE = 1000; // paginação para carregar TODAS as linhas das tabelas

// ---------------------- helpers ----------------------
function clean(v?: string | null) {
  const s = (v ?? '').toString().trim();
  return s.length ? s : null;
}

function toISODate(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v as any)) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const d = +m[1], mo = +m[2] - 1, y = m[3].length === 2 ? +('20' + m[3]) : +m[3];
    const dt = new Date(Date.UTC(y, mo, d));
    return isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
function firstDayFromMonthText(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (m1) return `${m1[2]}-${String(m1[1]).padStart(2, '0')}-01`;
  const map: Record<string, string> = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
  const m2 = s.toLowerCase().match(/^([a-zç]{3})[\/\s\-](\d{4})$/);
  if (m2 && map[m2[1]]) return `${m2[2]}-${map[m2[1]]}-01`;
  return null;
}

// SELECT paginado: carrega todos os registros em chunks de 1000
async function selectAll<T>(table: string, columns: string, orderBy: string = 'id'): Promise<T[]> {
  let from = 0;
  let out: T[] = [];
  while (true) {
    const { data, error } = await supabaseAdmin
      .from(table as any)
      .select(columns as any)
      .order(orderBy, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`selectAll ${table}: ${error.message}`);
    const chunk = (data || []) as T[];
    out = out.concat(chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

// Exec helpers (erros visíveis)
async function runExec(p: PromiseLike<{ data: any; error: any }> | Promise<{ data: any; error: any }>, label: string) {
  const { error } = (await p) as any;
  if (error) throw new Error(`${label}: ${error.message || error}`);
}

// ---------------------- página ----------------------
export default function EpiUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsingPct, setParsingPct] = useState(0);
  const [writingPct, setWritingPct] = useState(0);
  const [running, setRunning] = useState(false);
  const [rowsLog, setRowsLog] = useState<PreviewRow[]>([]);
  const [summary, setSummary] = useState<{ ok: number; errors: number; total: number } | null>(null);

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    try {
      setRunning(true);
      setParsingPct(0);
      setWritingPct(0);
      setRowsLog([]);
      setSummary(null);

      // 1) Ler planilha (primeira aba)
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
      const TOTAL = rows.length;

      // 2) Pré-carregar catálogos e colaboradores (TODOS, paginado)
      const [kindsG, kindsE, epiCat, colabs] = await Promise.all([
        selectAll<{ id: number; name: string }>('status_geral_kind', 'id,name'),
        selectAll<{ id: number; name: string }>('status_epi_kind', 'id,name'),
        selectAll<{ id: number; nome: string }>('epi_item', 'id,nome'),
        selectAll<{ id: number; nome: string; loja: string | null; consultor: string | null }>('colaborador', 'id,nome,loja,consultor'),
      ]);

      const mapG = new Map<string, number>(kindsG.map(k => [k.name.toUpperCase(), k.id]));
      const mapE = new Map<string, number>(kindsE.map(k => [k.name.toUpperCase(), k.id]));
      const mapItem = new Map<string, number>(epiCat.map(i => [i.nome.toUpperCase(), i.id]));
      const mapCol = new Map<string, number>(colabs.map(c => [`${c.nome}||${c.loja || ''}||${c.consultor || ''}`, c.id]));

      // 3) Coletores
      const novosStatusG = new Map<string, { name: string; severity: number; color_hex: string; is_apt: boolean }>();
      const novosStatusE = new Map<string, { name: string; severity: number; color_hex: string }>();
      const novosEpis = new Set<string>();
      const novosColabs: Array<{ nome: string; loja: string | null; consultor: string | null }> = [];

      const parsed: Array<{
        nome: string;
        loja: string | null;
        consultor: string | null;
        epiUpper: string;
        statusEpiName: string;
        proximo: string | null;
        statusGeralName: string | null;
      }> = [];

      const logs: PreviewRow[] = [];

      // forward-fill por conta de células mescladas
      let carryNome = '', carryLoja = '', carryConsultor = '', carryStatusGeral = '';

      // dedupe de colaboradores a inserir
      const newColabKeys = new Set<string>();

      // 4) Parse linha a linha
      for (let i = 0; i < TOTAL; i++) {
        const r = rows[i];

        const nomeFF = r['Colaborador'] || carryNome;
        const lojaFF = r['Sigla'] || carryLoja;
        const consultorFF = r['Consultor de Operações'] || r['Consultor de Operacoes'] || carryConsultor;
        const statusGeralRawFF = r['Status Geral'] || carryStatusGeral;

        if (r['Colaborador']) carryNome = r['Colaborador'];
        if (r['Sigla']) carryLoja = r['Sigla'];
        if (r['Consultor de Operações'] || r['Consultor de Operacoes']) carryConsultor = r['Consultor de Operações'] || r['Consultor de Operacoes'];
        if (r['Status Geral']) carryStatusGeral = r['Status Geral'];

        const epiNome = String(r['EPI'] || '');
        const statusEpiName = String(r['Status EPI'] || '');
        const d1 = toISODate(r['Próximo Fornecimento'] || r['Proximo Fornecimento']);
        const d2 = firstDayFromMonthText(r['Mês Próximo Fornecimento'] || r['Mes Próximo Fornecimento'] || r['Mês Proximo Fornecimento']);
        const proximo = d1 || d2;

        const nome = clean(nomeFF);
        const loja = clean(lojaFF);
        const consultor = clean(consultorFF);

        if (!nome || !epiNome || !statusEpiName) {
          logs.push({
            row: i + 1,
            status: 'error',
            msg: 'Faltando Colaborador/EPI/Status EPI',
            colaborador: nome || '',
            loja: loja || '',
            consultor: consultor || '',
            epi: epiNome,
            statusEpi: statusEpiName,
            statusGeral: statusGeralRawFF || '',
          });
        } else {
          // status geral (catálogo se faltar)
          if (statusGeralRawFF) {
            const key = statusGeralRawFF.toUpperCase();
            if (!mapG.has(key) && !novosStatusG.has(key)) {
              const sev = key.includes('VENCID') ? 10 : key.includes('PENDEN') ? 50 : 100;
              const col = key.includes('VENCID') ? '#ef4444' : key.includes('PENDEN') ? '#facc15' : '#22c55e';
              const apt = !(key.includes('VENCID') || key.includes('PENDEN'));
              novosStatusG.set(key, { name: statusGeralRawFF, severity: sev, color_hex: col, is_apt: apt });
            }
          }

          // status EPI (catálogo se faltar)
          const keyE = statusEpiName.toUpperCase();
          if (!mapE.has(keyE) && !novosStatusE.has(keyE)) {
            const sev = keyE.includes('VENCID') ? 10 : keyE.includes('PENDEN') ? 50 : keyE.includes('FUTUR') ? 60 : 100;
            const col = keyE.includes('VENCID') ? '#ef4444' : keyE.includes('PENDEN') ? '#facc15' : keyE.includes('FUTUR') ? '#60a5fa' : '#22c55e';
            novosStatusE.set(keyE, { name: statusEpiName, severity: sev, color_hex: col });
          }

          // EPI catálogo
          const epiUpper = epiNome.toUpperCase();
          if (!mapItem.has(epiUpper)) novosEpis.add(epiUpper);

          // colaborador catálogo
          const k = `${nome}||${loja || ''}||${consultor || ''}`;
          if (!mapCol.has(k) && !newColabKeys.has(k)) {
            novosColabs.push({ nome, loja, consultor });
            newColabKeys.add(k);
          }

          // guarda para vínculos e update de status geral
          parsed.push({
            nome, loja, consultor, epiUpper, statusEpiName,
            proximo: proximo || null,
            statusGeralName: statusGeralRawFF ? String(statusGeralRawFF) : null
          });

          logs.push({
            row: i + 1,
            status: 'ok',
            colaborador: nome,
            loja: loja || '',
            consultor: consultor || '',
            epi: epiNome,
            statusEpi: statusEpiName,
            statusGeral: statusGeralRawFF || '',
          });
        }

        if ((i + 1) % 200 === 0 || i + 1 === TOTAL) {
          setParsingPct(Math.round(((i + 1) / TOTAL) * 100));
        }
      }

      // 5) Escritas em lote com recarregamento TOTAL (paginação) para preencher mapas 100%
      let step = 0;
      const bump = (n = 1) => setWritingPct(Math.min(100, Math.round(((step += n) / 6) * 100)));

      // 5.1 status (geral + epi)
      if (novosStatusG.size) {
        await runExec(
          supabaseAdmin.from('status_geral_kind').upsert(
            Array.from(novosStatusG.values()).map(v => ({ name: v.name, severity: v.severity, color_hex: v.color_hex, is_apt: v.is_apt })),
            { onConflict: 'name' }
          ),
          'upsert status_geral_kind'
        );
      }
      if (novosStatusE.size) {
        await runExec(
          supabaseAdmin.from('status_epi_kind').upsert(
            Array.from(novosStatusE.values()).map(v => ({ name: v.name, severity: v.severity, color_hex: v.color_hex })),
            { onConflict: 'name' }
          ),
          'upsert status_epi_kind'
        );
      }
      // reload completo dos catálogos de status (sem limite 1000)
      {
        const [gAll, eAll] = await Promise.all([
          selectAll<{ id: number; name: string }>('status_geral_kind', 'id,name'),
          selectAll<{ id: number; name: string }>('status_epi_kind', 'id,name'),
        ]);
        mapG.clear(); gAll.forEach(r => mapG.set(r.name.toUpperCase(), r.id));
        mapE.clear(); eAll.forEach(r => mapE.set(r.name.toUpperCase(), r.id));
      }
      bump();

      // 5.2 EPIs catálogo
      if (novosEpis.size) {
        await runExec(
          supabaseAdmin.from('epi_item').upsert(
            Array.from(novosEpis.values()).map(n => ({ nome: n })),
            { onConflict: 'nome' }
          ),
          'upsert epi_item'
        );
      }
      // reload completo de EPIs
      {
        const itAll = await selectAll<{ id: number; nome: string }>('epi_item', 'id,nome');
        mapItem.clear(); itAll.forEach(r => mapItem.set(r.nome.toUpperCase(), r.id));
      }
      bump();

      // 5.3 Colaboradores (dedupe + ignoreDuplicates)
      if (novosColabs.length) {
        const uniqueColabsMap = new Map<string, { nome: string; loja: string | null; consultor: string | null }>();
        for (const c of novosColabs) {
          const k = `${c.nome}||${c.loja || ''}||${c.consultor || ''}`;
          if (!uniqueColabsMap.has(k)) uniqueColabsMap.set(k, c);
        }
        const uniqueColabs = Array.from(uniqueColabsMap.values());
        await runExec(
          supabaseAdmin.from('colaborador').upsert(uniqueColabs, { onConflict: 'nome,loja,consultor', ignoreDuplicates: true }),
          'upsert colaborador'
        );
      }
      // reload completo de colaboradores
      {
        const cAll = await selectAll<{ id: number; nome: string; loja: string | null; consultor: string | null }>(
          'colaborador',
          'id,nome,loja,consultor'
        );
        mapCol.clear(); cAll.forEach(r => mapCol.set(`${r.nome}||${r.loja || ''}||${r.consultor || ''}`, r.id));
      }
      bump();

      // 5.3.1 Atualiza status_geral_id (agora com mapas completos)
      {
        const desired = new Map<number, number>(); // colabId -> statusId
        for (const p of parsed) {
          if (!p.statusGeralName) continue;
          const key = `${p.nome}||${p.loja || ''}||${p.consultor || ''}`;
          const colabId = mapCol.get(key);
          const statusId = mapG.get(p.statusGeralName.toUpperCase());
          if (colabId && statusId) desired.set(colabId, statusId); // última ocorrência vence
        }
        const updates = Array.from(desired.entries()).map(([id, statusId]) => ({ id, statusId }));
        const BATCH_UPD = 300;
        for (let i = 0; i < updates.length; i += BATCH_UPD) {
          const slice = updates.slice(i, i + BATCH_UPD);
          await Promise.all(
            slice.map(u =>
              supabaseAdmin.from('colaborador').update({ status_geral_id: u.statusId }).eq('id', u.id)
            )
          );
        }
      }
      bump();

      // 5.4 Vínculos colaborador_epi (dedupe por par colab/epi)
      const linkMap = new Map<
        string,
        { colaborador_id: number; epi_id: number; status_epi_id: number; proximo_fornecimento: string | null; ativo: boolean }
      >();
      for (const p of parsed) {
        const key = `${p.nome}||${p.loja || ''}||${p.consultor || ''}`;
        const colabId = mapCol.get(key);
        const epiId = mapItem.get(p.epiUpper);
        const statusId = mapE.get(p.statusEpiName.toUpperCase());
        if (!colabId || !epiId || !statusId) continue;

        const pairKey = `${colabId}|${epiId}`;
        const current = linkMap.get(pairKey);
        if (!current) {
          linkMap.set(pairKey, {
            colaborador_id: colabId,
            epi_id: epiId,
            status_epi_id: statusId,
            proximo_fornecimento: p.proximo,
            ativo: true,
          });
        } else {
          // mantém data mais recente e último status
          const a = current.proximo_fornecimento;
          const b = p.proximo;
          const newer = a && b ? (a > b ? a : b) : a || b || null;
          linkMap.set(pairKey, {
            colaborador_id: colabId,
            epi_id: epiId,
            status_epi_id: statusId,
            proximo_fornecimento: newer,
            ativo: true,
          });
        }
      }
      const vincRows = Array.from(linkMap.values());
      const BATCH = 1000;
      for (let i = 0; i < vincRows.length; i += BATCH) {
        await runExec(
          supabaseAdmin.from('colaborador_epi').upsert(vincRows.slice(i, i + BATCH), { onConflict: 'colaborador_id,epi_id' }),
          `upsert colaborador_epi (${i}/${vincRows.length})`
        );
      }
      bump();

      setWritingPct(100);

      // 6) Resumo
      const ok = logs.filter(l => l.status === 'ok').length;
      const errors = logs.length - ok;
      setSummary({ ok, errors, total: logs.length });
      setRowsLog(logs);
      setRunning(false);
    } catch (err: any) {
      setRunning(false);
      alert(err.message || 'Erro no import');
      console.error(err);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Importar EPIs</h1>

      <form onSubmit={handleImport} className="bg-white rounded shadow p-4 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col">
          <label className="text-sm font-medium">Arquivo (.xlsx)</label>
          <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0] || null)} className="border px-3 py-2 rounded" />
        </div>
        <button disabled={!file || running} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {running ? 'Processando...' : 'Importar'}
        </button>
      </form>

      {/* Progresso */}
      {running && (
        <div className="bg-white rounded shadow p-4 space-y-3">
          <div>
            <div className="text-sm text-gray-600 mb-1">Leitura da planilha</div>
            <div className="w-full bg-gray-200 h-2 rounded"><div className="h-2 bg-indigo-600 rounded" style={{ width: `${parsingPct}%` }} /></div>
            <div className="text-right text-xs mt-1">{parsingPct}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Gravação no banco</div>
            <div className="w-full bg-gray-200 h-2 rounded"><div className="h-2 bg-green-600 rounded" style={{ width: `${writingPct}%` }} /></div>
            <div className="text-right text-xs mt-1">{writingPct}%</div>
          </div>
        </div>
      )}

      {/* Resumo */}
      {summary && (
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm">
            Total: <strong>{summary.total}</strong> • OK: <strong className="text-green-600">{summary.ok}</strong> • Erros:{' '}
            <strong className="text-red-600">{summary.errors}</strong>
          </div>
        </div>
      )}

      {/* Lista (apenas memória) */}
      {rowsLog.length > 0 && (
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-3">Resultado (não persiste no banco)</h3>
          <div className="overflow-auto max-h-[48rem]">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 border text-right">#</th>
                  <th className="px-2 py-1 border">Status</th>
                  <th className="px-2 py-1 border">Mensagem</th>
                  <th className="px-2 py-1 border">Colaborador</th>
                  <th className="px-2 py-1 border">Loja</th>
                  <th className="px-2 py-1 border">Consultor</th>
                  <th className="px-2 py-1 border">EPI</th>
                  <th className="px-2 py-1 border">Status EPI</th>
                  <th className="px-2 py-1 border">Status Geral</th>
                </tr>
              </thead>
              <tbody>
                {rowsLog.map((l, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-2 py-1 border text-right">{l.row}</td>
                    <td className="px-2 py-1 border">
                      {l.status === 'ok'
                        ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">OK</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Erro</span>}
                    </td>
                    <td className="px-2 py-1 border">{l.msg || ''}</td>
                    <td className="px-2 py-1 border">{l.colaborador || ''}</td>
                    <td className="px-2 py-1 border">{l.loja || ''}</td>
                    <td className="px-2 py-1 border">{l.consultor || ''}</td>
                    <td className="px-2 py-1 border">{l.epi || ''}</td>
                    <td className="px-2 py-1 border">{l.statusEpi || ''}</td>
                    <td className="px-2 py-1 border">{l.statusGeral || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
